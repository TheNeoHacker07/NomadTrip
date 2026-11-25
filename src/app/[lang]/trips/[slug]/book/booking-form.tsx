"use client";

import { useActionState, useId, useState, startTransition, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionaries } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { MAX_TRAVELERS, type FieldErrors } from "@/lib/booking-input";
import { quote, usd } from "@/lib/pricing";
import { submitBooking, type BookingFormState } from "./actions";

type Dict = Pick<Dictionaries["booking"], "sections" | "fields" | "summary" | "options" | "errors" | "messages">;
type Props = { lang: Locale; dict: Dict; departureId: number; maxTravelers: number; pricePerPersonUsd: number; durationDays: number };

const initialState: BookingFormState = { errors: {} };

export function BookingForm({ lang, dict, departureId, maxTravelers, pricePerPersonUsd, durationDays }: Props) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const [travelerKeys, setTravelerKeys] = useState([0]);
  const [nextKey, setNextKey] = useState(1);
  const [yurt, setYurt] = useState<"shared" | "private">("shared");
  const limit = Math.min(maxTravelers, MAX_TRAVELERS);
  const price = quote({ pricePerPersonUsd, durationDays, travelerCount: travelerKeys.length, yurtArrangement: yurt });
  const errors = state.errors;
  const { fields: f, sections, options, summary } = dict;
  const errorText = (code?: string) =>
    code ? interpolate(dict.errors[code as keyof Dict["errors"]] ?? dict.errors.invalid, { max: MAX_TRAVELERS }) : undefined;
  const message = (() => {
    const m = state.message;
    if (!m) return undefined;
    return m.code === "not_enough_seats" ? plural(dict.messages.not_enough_seats, m.seatsLeft, lang) : dict.messages[m.code];
  })();

  return (
    <form
      noValidate
      className="mt-8 space-y-8"
      // Submitting via a transition (instead of `action=`) keeps the inputs filled when the server returns errors.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <input type="hidden" name="departureId" value={departureId} />
      <input type="hidden" name="lang" value={lang} />

      <Section title={sections.contact.title} hint={sections.contact.hint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="contactName" label={f.contactName} errors={errors} t={errorText} autoComplete="name" />
          <Field name="email" label={f.email} type="email" errors={errors} t={errorText} autoComplete="email" />
          <Field name="phone" label={f.phone} type="tel" errors={errors} t={errorText} autoComplete="tel" placeholder={f.phonePlaceholder} />
          <Select name="messenger" label={f.messenger} choices={options.messenger} errors={errors} t={errorText} />
          <Field name="country" label={f.country} errors={errors} t={errorText} autoComplete="country-name" />
        </div>
      </Section>

      <Section title={sections.travelers.title} hint={sections.travelers.hint}>
        <div className="space-y-4">
          {travelerKeys.map((key, i) => (
            <fieldset key={key} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <legend className="text-sm font-semibold">{interpolate(f.travelerNumber, { n: i + 1 })}</legend>
                {travelerKeys.length > 1 && (
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-accent"
                    onClick={() => setTravelerKeys((ks) => ks.filter((k) => k !== key))}
                  >
                    {f.remove}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name={`travelers.${i}.fullName`} label={f.travelerFullName} errors={errors} t={errorText} />
                <Field name={`travelers.${i}.dateOfBirth`} label={f.dateOfBirth} type="date" errors={errors} t={errorText} />
                <Field name={`travelers.${i}.nationality`} label={f.nationality} errors={errors} t={errorText} />
                <Select name={`travelers.${i}.diet`} label={f.diet} choices={options.diet} errors={errors} t={errorText} />
                <Select name={`travelers.${i}.ridingExperience`} label={f.ridingExperience} choices={options.ridingExperience} errors={errors} t={errorText} />
                <Field name={`travelers.${i}.allergies`} label={f.allergies} errors={errors} t={errorText} required={false} />
              </div>
            </fieldset>
          ))}
          <ErrorText errors={errors} t={errorText} name="travelers" />
          {travelerKeys.length < limit ? (
            <button
              type="button"
              className="rounded-lg border border-dashed border-border px-4 py-2 text-sm hover:border-accent"
              onClick={() => {
                setTravelerKeys((ks) => [...ks, nextKey]);
                setNextKey((k) => k + 1);
              }}
            >
              {f.addTraveler}
            </button>
          ) : (
            <p className="text-sm text-muted">{plural(f.maxTravelers, limit, lang)}</p>
          )}
        </div>
      </Section>

      <Section title={sections.experience.title} hint={sections.experience.hint}>
        <div className="space-y-5">
          <Radios
            name="yurtArrangement"
            label={f.yurtArrangement}
            choices={options.yurtArrangement}
            value={yurt}
            onChange={(v) => setYurt(v as "shared" | "private")}
            errors={errors} t={errorText}
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
      </Section>

      <Section title={sections.arrival.title}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="arrivalAirport" label={f.arrivalAirport} choices={options.arrivalAirport} errors={errors} t={errorText} />
          <Field name="arrivalFlight" label={f.arrivalFlight} errors={errors} t={errorText} required={false} placeholder={f.flightPlaceholder} />
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="needsAirportPickup" className="accent-accent" /> {f.needsAirportPickup}
            </label>
            <ErrorText errors={errors} t={errorText} name="needsAirportPickup" />
          </div>
          <Field name="emergencyName" label={f.emergencyName} errors={errors} t={errorText} />
          <Field name="emergencyPhone" label={f.emergencyPhone} type="tel" errors={errors} t={errorText} />
        </div>
      </Section>

      <Section title={sections.other.title}>
        <div className="space-y-4">
          <TextArea name="specialRequests" label={f.specialRequests} errors={errors} t={errorText} />
          <Field name="referralSource" label={f.referralSource} errors={errors} t={errorText} required={false} />
        </div>
      </Section>

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
          <input type="checkbox" name="consent" className="mt-0.5 accent-accent" aria-invalid={!!errors.consent} />
          <span>{summary.consent}</span>
        </label>
        <ErrorText errors={errors} t={errorText} name="consent" />
        {message && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {message}
          </p>
        )}
        <button type="submit" className="btn w-full" disabled={pending}>
          {pending ? summary.sending : summary.submit}
        </button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-4 text-sm text-muted">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
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

function ErrorText({ errors, t, name, id }: { errors: FieldErrors; t: ErrorFn; name: string; id?: string }) {
  return errors[name] ? (
    <p id={id} className="mt-1 text-xs text-red-600 dark:text-red-400">
      {t(errors[name])}
    </p>
  ) : null;
}

type FieldProps = {
  name: string;
  label: string;
  errors: FieldErrors;
  t: ErrorFn;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
};

function Field({ name, label, errors, t, type = "text", required = true, placeholder, autoComplete }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="field"
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${id}-err` : undefined}
      />
      <ErrorText errors={errors} t={t} name={name} id={`${id}-err`} />
    </div>
  );
}

function TextArea({ name, label, errors, t }: { name: string; label: string; errors: FieldErrors; t: ErrorFn }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} name={name} rows={3} className="field" aria-invalid={!!errors[name]} />
      <ErrorText errors={errors} t={t} name={name} />
    </div>
  );
}

function Select({ name, label, choices, errors, t }: { name: string; label: string; choices: Record<string, string>; errors: FieldErrors; t: ErrorFn }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={name} className="field" aria-invalid={!!errors[name]}>
        {Object.entries(choices).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
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
