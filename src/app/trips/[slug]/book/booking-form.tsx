"use client";

import { useActionState, useId, useState, startTransition, type ReactNode } from "react";
import { MAX_TRAVELERS, options, type FieldErrors } from "@/lib/booking-input";
import { quote, usd } from "@/lib/pricing";
import { submitBooking, type BookingFormState } from "./actions";

type Props = { departureId: number; maxTravelers: number; pricePerPersonUsd: number; durationDays: number };

const initialState: BookingFormState = { errors: {} };

export function BookingForm({ departureId, maxTravelers, pricePerPersonUsd, durationDays }: Props) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const [travelerKeys, setTravelerKeys] = useState([0]);
  const [nextKey, setNextKey] = useState(1);
  const [yurt, setYurt] = useState<"shared" | "private">("shared");
  const limit = Math.min(maxTravelers, MAX_TRAVELERS);
  const price = quote({ pricePerPersonUsd, durationDays, travelerCount: travelerKeys.length, yurtArrangement: yurt });
  const errors = state.errors;

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

      <Section title="Lead contact" hint="Who we talk to about this booking.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="contactName" label="Full name" errors={errors} autoComplete="name" />
          <Field name="email" label="Email" type="email" errors={errors} autoComplete="email" />
          <Field name="phone" label="Phone (with country code)" type="tel" errors={errors} autoComplete="tel" placeholder="+996 555 123 456" />
          <Select name="messenger" label="Preferred messenger" choices={options.messenger} errors={errors} />
          <Field name="country" label="Country of residence" errors={errors} autoComplete="country-name" />
        </div>
      </Section>

      <Section title="Travelers" hint="Everyone joining, including you. We use ages, diets and riding level to plan horses, menus and pace.">
        <div className="space-y-4">
          {travelerKeys.map((key, i) => (
            <fieldset key={key} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <legend className="text-sm font-semibold">Traveler {i + 1}</legend>
                {travelerKeys.length > 1 && (
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-accent"
                    onClick={() => setTravelerKeys((ks) => ks.filter((k) => k !== key))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name={`travelers.${i}.fullName`} label="Full name (as in passport)" errors={errors} />
                <Field name={`travelers.${i}.dateOfBirth`} label="Date of birth" type="date" errors={errors} />
                <Field name={`travelers.${i}.nationality`} label="Nationality" errors={errors} />
                <Select name={`travelers.${i}.diet`} label="Diet" choices={options.diet} errors={errors} />
                <Select name={`travelers.${i}.ridingExperience`} label="Horse riding experience" choices={options.ridingExperience} errors={errors} />
                <Field name={`travelers.${i}.allergies`} label="Allergies (optional)" errors={errors} required={false} />
              </div>
            </fieldset>
          ))}
          <ErrorText errors={errors} name="travelers" />
          {travelerKeys.length < limit ? (
            <button
              type="button"
              className="rounded-lg border border-dashed border-border px-4 py-2 text-sm hover:border-accent"
              onClick={() => {
                setTravelerKeys((ks) => [...ks, nextKey]);
                setNextKey((k) => k + 1);
              }}
            >
              + Add traveler
            </button>
          ) : (
            <p className="text-sm text-muted">Maximum of {limit} travelers for this departure.</p>
          )}
        </div>
      </Section>

      <Section title="Your experience" hint="Helps us tailor the yurt camp, activities and daily rhythm.">
        <div className="space-y-5">
          <Radios
            name="yurtArrangement"
            label="Yurt arrangement"
            choices={options.yurtArrangement}
            value={yurt}
            onChange={(v) => setYurt(v as "shared" | "private")}
            errors={errors}
          />
          <Radios name="fitnessLevel" label="Group fitness level" choices={options.fitnessLevel} errors={errors} />
          <fieldset>
            <legend className="label">What would you love to do? (optional)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(options.interests).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="interests" value={value} className="accent-accent" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <TextArea name="medicalNotes" label="Health or mobility notes we should know (optional)" errors={errors} />
          <Field name="occasion" label="Celebrating something? (optional)" errors={errors} required={false} placeholder="Honeymoon, birthday…" />
        </div>
      </Section>

      <Section title="Arrival & safety">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="arrivalAirport" label="Arriving at" choices={options.arrivalAirport} errors={errors} />
          <Field name="arrivalFlight" label="Flight number (optional)" errors={errors} required={false} placeholder="TK 345" />
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="needsAirportPickup" className="accent-accent" /> We need an airport pickup (free)
            </label>
            <ErrorText errors={errors} name="needsAirportPickup" />
          </div>
          <Field name="emergencyName" label="Emergency contact name" errors={errors} />
          <Field name="emergencyPhone" label="Emergency contact phone" type="tel" errors={errors} />
        </div>
      </Section>

      <Section title="Anything else?">
        <div className="space-y-4">
          <TextArea name="specialRequests" label="Special requests (optional)" errors={errors} />
          <Field name="referralSource" label="How did you hear about us? (optional)" errors={errors} required={false} />
        </div>
      </Section>

      <div className="card space-y-4 p-5">
        <div className="space-y-1 text-sm">
          <Row label={`${travelerKeys.length} × ${usd(pricePerPersonUsd)}`} value={usd(price.base)} />
          {price.yurtSupplement > 0 && (
            <Row label={`Private yurt: ${price.yurts} × ${price.nights} nights`} value={usd(price.yurtSupplement)} />
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Estimated total</span>
            <span>{usd(price.total)}</span>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 accent-accent" aria-invalid={!!errors.consent} />
          <span>I agree that NomadTrip stores these details to organise our trip and shares them only with our guides and hosts.</span>
        </label>
        <ErrorText errors={errors} name="consent" />
        {state.message && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn w-full" disabled={pending}>
          {pending ? "Sending…" : "Request booking"}
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

function ErrorText({ errors, name, id }: { errors: FieldErrors; name: string; id?: string }) {
  return errors[name] ? (
    <p id={id} className="mt-1 text-xs text-red-600 dark:text-red-400">
      {errors[name]}
    </p>
  ) : null;
}

type FieldProps = {
  name: string;
  label: string;
  errors: FieldErrors;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
};

function Field({ name, label, errors, type = "text", required = true, placeholder, autoComplete }: FieldProps) {
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
      <ErrorText errors={errors} name={name} id={`${id}-err`} />
    </div>
  );
}

function TextArea({ name, label, errors }: { name: string; label: string; errors: FieldErrors }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} name={name} rows={3} className="field" aria-invalid={!!errors[name]} />
      <ErrorText errors={errors} name={name} />
    </div>
  );
}

function Select({ name, label, choices, errors }: { name: string; label: string; choices: Record<string, string>; errors: FieldErrors }) {
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
      <ErrorText errors={errors} name={name} />
    </div>
  );
}

function Radios(props: {
  name: string;
  label: string;
  choices: Record<string, string>;
  errors: FieldErrors;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const { name, label, choices, errors, value, onChange } = props;
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
      <ErrorText errors={errors} name={name} />
    </fieldset>
  );
}
