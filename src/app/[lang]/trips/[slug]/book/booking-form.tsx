"use client";

import { useActionState, useEffect, useRef, useState, startTransition, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionaries } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { ageOn } from "@/lib/age";
import {
  MAX_TRAVELERS,
  experienceStepSchema,
  formDataToBookingInput,
  toFieldErrors,
  whoStepSchema,
  type FieldErrors,
} from "@/lib/booking-input";
import { quote, usd } from "@/lib/pricing";
import { submitBooking, type BookingFormState } from "./actions";

type Dict = Pick<Dictionaries["booking"], "sections" | "fields" | "summary" | "options" | "errors" | "messages" | "wizard">;
type Props = {
  lang: Locale;
  dict: Dict;
  departureId: number;
  departureDate: string;
  maxTravelers: number;
  pricePerPersonUsd: number;
  durationDays: number;
};
type Step = 1 | 2 | 3;
type Review = {
  contactName?: string;
  email?: string;
  phone?: string;
  messenger?: string;
  country?: string;
  travelers?: Record<string, string>[];
  yurtArrangement?: string;
  fitnessLevel?: string;
  interests?: string[];
  medicalNotes?: string;
  occasion?: string;
};

const initialState: BookingFormState = { errors: {} };
const stepSchemas = { 1: whoStepSchema, 2: experienceStepSchema } as const;
const whoFields = new Set(["contactName", "email", "phone", "messenger", "country", "travelers"]);
const experienceFields = new Set(["yurtArrangement", "fitnessLevel", "interests", "medicalNotes", "occasion"]);

/** Which wizard step owns a field path (`travelers.0.diet`, `email`, …). */
function stepOfField(path: string): Step {
  const m = /^travelers\.\d+\.(\w+)$/.exec(path);
  if (m) return m[1] === "fullName" || m[1] === "dateOfBirth" ? 1 : 2;
  if (whoFields.has(path)) return 1;
  if (experienceFields.has(path)) return 2;
  return 3;
}

export function BookingForm({ lang, dict, departureId, departureDate, maxTravelers, pricePerPersonUsd, durationDays }: Props) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [travelerKeys, setTravelerKeys] = useState([0]);
  const [nextKey, setNextKey] = useState(1);
  // Name and date of birth are controlled so the age and the step-2 headings follow what is typed.
  const [who, setWho] = useState<Record<number, { name: string; dob: string }>>({});
  const [yurt, setYurt] = useState<"shared" | "private">("shared");
  const [review, setReview] = useState<Review | null>(null);
  const [local, setLocal] = useState<{ errors: FieldErrors; base: BookingFormState } | null>(null);
  const [seen, setSeen] = useState(state);
  const [focusReq, setFocusReq] = useState<{ kind: "heading" | "invalid" } | null>(null);

  const limit = Math.min(maxTravelers, MAX_TRAVELERS);
  const price = quote({ pricePerPersonUsd, durationDays, travelerCount: travelerKeys.length, yurtArrangement: yurt });
  // Client-side step errors win until the server answers again.
  const errors = local && local.base === state ? local.errors : state.errors;
  const { fields: f, sections, options, summary, wizard } = dict;
  const errorText = (code?: string) =>
    code ? interpolate(dict.errors[code as keyof Dict["errors"]] ?? dict.errors.invalid, { max: MAX_TRAVELERS }) : undefined;
  const message = (() => {
    const m = state.message;
    if (!m) return undefined;
    return m.code === "not_enough_seats" ? plural(dict.messages.not_enough_seats, m.seatsLeft, lang) : dict.messages[m.code];
  })();

  // A new server answer: jump to the earliest step with a problem (render-time state adjustment, no effect needed).
  if (state !== seen) {
    setSeen(state);
    const steps = Object.keys(state.errors).map(stepOfField);
    const target = steps.length ? (Math.min(...steps) as Step) : state.message?.code === "not_enough_seats" ? 1 : null;
    if (target) {
      setStep(target);
      setFocusReq({ kind: steps.length ? "invalid" : "heading" });
    }
  }

  // Move focus after the step/errors have rendered: heading on step change, first invalid field after errors.
  useEffect(() => {
    if (!focusReq) return;
    const visible = formRef.current?.querySelector<HTMLElement>("section:not([hidden])");
    const target =
      (focusReq.kind === "invalid" ? visible?.querySelector<HTMLElement>('[aria-invalid="true"]') : null) ??
      visible?.querySelector<HTMLElement>("h2");
    target?.focus();
  }, [focusReq]);

  function readReview(): Review {
    return formDataToBookingInput(new FormData(formRef.current!)) as Review;
  }

  function goTo(next: Step) {
    if (next === 3) setReview(readReview());
    setStep(next);
    setFocusReq({ kind: "heading" });
  }

  function goNext() {
    if (step === 3) return;
    const parsed = stepSchemas[step].safeParse(formDataToBookingInput(new FormData(formRef.current!)));
    if (parsed.success) {
      setLocal({ errors: {}, base: state });
      goTo((step + 1) as Step);
    } else {
      setLocal({ errors: toFieldErrors(parsed.error), base: state });
      setFocusReq({ kind: "invalid" });
    }
  }

  function setCount(n: number) {
    if (n > travelerKeys.length) {
      const added = Array.from({ length: n - travelerKeys.length }, (_, k) => nextKey + k);
      setTravelerKeys((ks) => [...ks, ...added]);
      setNextKey(nextKey + added.length);
    } else {
      // Only trailing rows go, so the remaining rows keep what was typed.
      setTravelerKeys((ks) => ks.slice(0, n));
    }
  }

  const stepLabels = [wizard.steps.who, wizard.steps.experience, wizard.steps.confirm];
  const hiddenIf = (n: Step) => step !== n;
  const opt = (group: keyof Dict["options"], v?: string) => (v ? (options[group] as Record<string, string>)[v] ?? v : wizard.notProvided);
  const ageText = (dob?: string) => {
    const age = dob ? ageOn(dob, departureDate) : null;
    return age === null ? null : plural(f.ageAtDeparture, age, lang);
  };

  return (
    <form
      ref={formRef}
      noValidate
      className="mt-8 space-y-8"
      // Submitting via a transition (instead of `action=`) keeps the inputs filled when the server returns errors.
      onSubmit={(e) => {
        e.preventDefault();
        // Enter inside an early step moves forward instead of submitting a half-filled booking.
        if (step !== 3) return goNext();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="departureId" value={departureId} />
      <input type="hidden" name="lang" value={lang} />

      <nav aria-label={wizard.progress}>
        <ol className="flex gap-2">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            return (
              <li
                key={label}
                aria-current={n === step ? "step" : undefined}
                className={`flex flex-1 items-center gap-2 border-t-4 pt-2 text-sm ${
                  n <= step ? "border-accent font-semibold" : "border-border text-muted"
                }`}
              >
                <span aria-hidden="true">{n}</span>
                <span>{label}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-muted">{interpolate(wizard.stepOf, { n: step, total: 3 })}</p>
      </nav>

      {/* All steps stay mounted (just hidden) so the final FormData carries every field. */}
      <section hidden={hiddenIf(1)} aria-labelledby="step-1-title" className="space-y-8">
        <StepHeading id="step-1-title" title={sections.who.title} hint={sections.who.hint} />
        <div>
          <h3 className="mb-3 text-base font-semibold">{sections.contact.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="contactName" label={f.contactName} errors={errors} t={errorText} autoComplete="name" />
            <Field name="phone" label={f.phone} type="tel" errors={errors} t={errorText} autoComplete="tel" placeholder={f.phonePlaceholder} />
            <Field name="email" label={f.email} type="email" errors={errors} t={errorText} autoComplete="email" />
            <Select name="messenger" label={f.messenger} choices={options.messenger} errors={errors} t={errorText} />
            <Field name="country" label={f.country} errors={errors} t={errorText} autoComplete="country-name" />
          </div>
        </div>
        <div>
          <h3 className="mb-1 text-base font-semibold">{sections.travelers.title}</h3>
          <p className="mb-4 text-sm text-muted">{sections.travelers.hint}</p>
          <div className="space-y-4">
            <Select
              name="travelerCount"
              label={f.travelerCount}
              choices={Object.fromEntries(Array.from({ length: limit }, (_, k) => [String(k + 1), String(k + 1)]))}
              errors={errors}
              t={errorText}
              value={String(travelerKeys.length)}
              onChange={(v) => setCount(Number(v))}
              hint={limit < MAX_TRAVELERS ? plural(f.maxTravelers, limit, lang) : undefined}
            />
            <ErrorText errors={errors} t={errorText} name="travelers" />
            {travelerKeys.map((key, i) => {
              const age = ageText(who[key]?.dob);
              return (
                <fieldset key={key} className="rounded-xl border border-border p-4">
                  <legend className="px-1 text-sm font-semibold">{interpolate(f.travelerNumber, { n: i + 1 })}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name={`travelers.${i}.fullName`}
                      label={f.travelerFullName}
                      errors={errors}
                      t={errorText}
                      value={who[key]?.name ?? ""}
                      onChange={(v) => setWho((w) => ({ ...w, [key]: { name: v, dob: w[key]?.dob ?? "" } }))}
                    />
                    <div>
                      <Field
                        name={`travelers.${i}.dateOfBirth`}
                        label={f.dateOfBirth}
                        type="date"
                        errors={errors}
                        t={errorText}
                        value={who[key]?.dob ?? ""}
                        onChange={(v) => setWho((w) => ({ ...w, [key]: { name: w[key]?.name ?? "", dob: v } }))}
                      />
                      <p aria-live="polite" className="mt-1 min-h-4 text-xs text-muted">
                        {age}
                      </p>
                    </div>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </div>
      </section>

      <section hidden={hiddenIf(2)} aria-labelledby="step-2-title" className="space-y-8">
        <StepHeading id="step-2-title" title={sections.experience.title} hint={sections.experience.hint} />
        <div className="space-y-4">
          {travelerKeys.map((key, i) => (
            <fieldset key={key} className="rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold">
                {interpolate(f.travelerNumber, { n: i + 1 })}
                {who[key]?.name.trim() ? ` · ${who[key].name.trim()}` : ""}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name={`travelers.${i}.nationality`} label={f.nationality} errors={errors} t={errorText} />
                <Select name={`travelers.${i}.diet`} label={f.diet} choices={options.diet} errors={errors} t={errorText} />
                <Select name={`travelers.${i}.ridingExperience`} label={f.ridingExperience} choices={options.ridingExperience} errors={errors} t={errorText} />
                <Field name={`travelers.${i}.allergies`} label={f.allergies} errors={errors} t={errorText} required={false} />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="space-y-5">
          <Radios
            name="yurtArrangement"
            label={f.yurtArrangement}
            choices={options.yurtArrangement}
            value={yurt}
            onChange={(v) => setYurt(v as "shared" | "private")}
            errors={errors}
            t={errorText}
          />
          <Radios name="fitnessLevel" label={f.fitnessLevel} choices={options.fitnessLevel} errors={errors} t={errorText} />
          <fieldset>
            <legend className="label">{f.interests}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(options.interests).map(([value, text]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="interests" value={value} className="accent-accent" />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea name="medicalNotes" label={f.medicalNotes} errors={errors} t={errorText} />
          <Field name="occasion" label={f.occasion} errors={errors} t={errorText} required={false} placeholder={f.occasionPlaceholder} />
        </div>
      </section>

      <section hidden={hiddenIf(3)} aria-labelledby="step-3-title" className="space-y-8">
        <StepHeading id="step-3-title" title={sections.confirm.title} hint={sections.confirm.hint} />
        <div>
          <h3 className="mb-3 text-base font-semibold">{sections.arrival.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select name="arrivalAirport" label={f.arrivalAirport} choices={options.arrivalAirport} errors={errors} t={errorText} />
            <Field name="arrivalFlight" label={f.arrivalFlight} errors={errors} t={errorText} required={false} placeholder={f.flightPlaceholder} />
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="needsAirportPickup"
                  className="accent-accent"
                  aria-invalid={!!errors.needsAirportPickup}
                  aria-describedby={errors.needsAirportPickup ? "err-needsAirportPickup" : undefined}
                />{" "}
                {f.needsAirportPickup}
              </label>
              <ErrorText errors={errors} t={errorText} name="needsAirportPickup" />
            </div>
            <Field name="emergencyName" label={f.emergencyName} errors={errors} t={errorText} />
            <Field name="emergencyPhone" label={f.emergencyPhone} type="tel" errors={errors} t={errorText} />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-base font-semibold">{sections.other.title}</h3>
          <TextArea name="specialRequests" label={f.specialRequests} errors={errors} t={errorText} />
          <Field name="referralSource" label={f.referralSource} errors={errors} t={errorText} required={false} />
        </div>

        {review && (
          <div className="card space-y-4 p-5">
            <div>
              <h3 className="text-base font-semibold">{wizard.reviewTitle}</h3>
              <p className="text-sm text-muted">{wizard.reviewHint}</p>
            </div>
            <ReviewBlock title={sections.contact.title} editLabel={wizard.edit} onEdit={() => goTo(1)}>
              <p>{review.contactName}</p>
              <p>{review.phone} · {review.email}</p>
              <p>{opt("messenger", review.messenger)} · {review.country}</p>
            </ReviewBlock>
            <ReviewBlock title={`${sections.travelers.title} (${review.travelers?.length ?? 0})`} editLabel={wizard.edit} onEdit={() => goTo(1)}>
              <ul className="space-y-1">
                {review.travelers?.map((t, i) => (
                  <li key={i}>
                    {t.fullName}
                    {ageText(t.dateOfBirth) ? ` — ${ageText(t.dateOfBirth)}` : ""}
                    <span className="block text-muted">
                      {t.nationality || wizard.notProvided} · {opt("diet", t.diet)} · {opt("ridingExperience", t.ridingExperience)}
                      {t.allergies ? ` · ${t.allergies}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </ReviewBlock>
            <ReviewBlock title={sections.experience.title} editLabel={wizard.edit} onEdit={() => goTo(2)}>
              <p>{opt("yurtArrangement", review.yurtArrangement)}</p>
              <p>{opt("fitnessLevel", review.fitnessLevel)}</p>
              <p>{review.interests?.length ? review.interests.map((v) => opt("interests", v)).join(", ") : wizard.notProvided}</p>
              {review.medicalNotes && <p>{review.medicalNotes}</p>}
              {review.occasion && <p>{review.occasion}</p>}
            </ReviewBlock>
          </div>
        )}

        <div className="card space-y-4 p-5">
          <div className="space-y-1 text-sm">
            <Row label={interpolate(summary.line, { count: travelerKeys.length, price: usd(pricePerPersonUsd) })} value={usd(price.base)} />
            {price.yurtSupplement > 0 && (
              <Row
                label={interpolate(summary.privateYurt, { yurts: price.yurts, nights: plural(summary.nights, price.nights, lang) })}
                value={usd(price.yurtSupplement)}
              />
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>{summary.total}</span>
              <span>{usd(price.total)}</span>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="consent"
              className="mt-0.5 accent-accent"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "err-consent" : undefined}
            />
            <span>{summary.consent}</span>
          </label>
          <ErrorText errors={errors} t={errorText} name="consent" />
        </div>
      </section>

      {message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {step > 1 ? (
          <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent" onClick={() => goTo((step - 1) as Step)}>
            ← {wizard.back}
          </button>
        ) : (
          <span />
        )}
        {/* Distinct keys: without them React reuses one DOM button and flips it to type="submit"
            during the Next click, so the browser submits the form on step 2. */}
        {step < 3 ? (
          <button key="next" type="button" className="btn" onClick={goNext}>
            {wizard.next} →
          </button>
        ) : (
          <button key="submit" type="submit" className="btn" disabled={pending}>
            {pending ? summary.sending : summary.submit}
          </button>
        )}
      </div>
    </form>
  );
}

function StepHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div>
      <h2 id={id} tabIndex={-1} className="text-xl font-semibold outline-none focus-visible:underline">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function ReviewBlock({ title, editLabel, onEdit, children }: { title: string; editLabel: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <button type="button" className="text-accent underline" onClick={onEdit}>
          {editLabel}
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

type ErrorFn = (code?: string) => string | undefined;

/** Error ids are `err-<field name>` (names are unique in the form), referenced by `aria-describedby`. */
function ErrorText({ errors, t, name }: { errors: FieldErrors; t: ErrorFn; name: string }) {
  return errors[name] ? (
    <p id={`err-${name}`} className="mt-1 text-xs text-red-600 dark:text-red-400">
      {t(errors[name])}
    </p>
  ) : null;
}

const a11y = (errors: FieldErrors, name: string) => ({
  "aria-invalid": !!errors[name],
  "aria-describedby": errors[name] ? `err-${name}` : undefined,
});

type FieldProps = {
  name: string;
  label: string;
  errors: FieldErrors;
  t: ErrorFn;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
};

function Field({ name, label, errors, t, type = "text", required = true, placeholder, autoComplete, value, onChange }: FieldProps) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="field"
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
        {...a11y(errors, name)}
      />
      <ErrorText errors={errors} t={t} name={name} />
    </div>
  );
}

function TextArea({ name, label, errors, t }: { name: string; label: string; errors: FieldErrors; t: ErrorFn }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} rows={3} className="field" {...a11y(errors, name)} />
      <ErrorText errors={errors} t={t} name={name} />
    </div>
  );
}

function Select(props: {
  name: string;
  label: string;
  choices: Record<string, string>;
  errors: FieldErrors;
  t: ErrorFn;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
}) {
  const { name, label, choices, errors, t, value, onChange, hint } = props;
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        className="field"
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
        {...a11y(errors, name)}
      >
        {Object.entries(choices).map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <ErrorText errors={errors} t={t} name={name} />
    </div>
  );
}

function Radios(props: {
  name: string;
  label: string;
  choices: Record<string, string>;
  errors: FieldErrors;
  t: ErrorFn;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const { name, label, choices, errors, t, value, onChange } = props;
  const first = Object.keys(choices)[0];
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(choices).map(([v, text]) => (
          <label key={v} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm has-checked:border-accent">
            <input
              type="radio"
              name={name}
              value={v}
              className="mt-0.5 accent-accent"
              {...(v === first ? a11y(errors, name) : {})}
              {...(onChange ? { checked: value === v, onChange: () => onChange(v) } : { defaultChecked: v === first })}
            />
            {text}
          </label>
        ))}
      </div>
      <ErrorText errors={errors} t={t} name={name} />
    </fieldset>
  );
}
