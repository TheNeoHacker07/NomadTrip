"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionaries } from "@/i18n/dictionaries";
import { MESSAGE_MAX } from "@/lib/inquiry";
import { submitInquiryAction, type InquiryFormState } from "./actions";

type Props = {
  lang: Locale;
  dict: Dictionaries["inquiry"];
  messengers: Record<string, string>;
  trips: { id: number; title: string }[];
  initialTripId: number | null;
};

export function InquiryForm({ lang, dict, messengers, trips, initialTripId }: Props) {
  const [state, formAction, pending] = useActionState<InquiryFormState, FormData>(submitInquiryAction, { status: "idle" });
  const f = dict.fields;
  const errors = state.errors ?? {};
  const text = (code?: string) => (code ? (dict.errors[code as keyof typeof dict.errors] ?? dict.errors.invalid) : undefined);

  if (state.status === "sent") {
    return (
      <div className="card p-8 text-center" role="status">
        <h2 className="text-2xl font-bold">{dict.success.title}</h2>
        <p className="mt-2 text-muted">{dict.success.text}</p>
        <Link href={`/${lang}`} className="btn mt-6">
          {dict.success.back}
        </Link>
      </div>
    );
  }

  const err = (name: string) =>
    errors[name] ? (
      <p id={`err-${name}`} className="mt-1 text-xs text-red-600 dark:text-red-400">
        {text(errors[name])}
      </p>
    ) : null;
  const a11y = (name: string) => ({ "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `err-${name}` : undefined });

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="card space-y-4 p-6"
      aria-busy={pending}
      noValidate
    >
      <input type="hidden" name="lang" value={lang} />
      {/* Honeypot: invisible to people and assistive tech; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="i-name" className="label">{f.name}</label>
          <input id="i-name" name="name" required autoComplete="name" className="field" {...a11y("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="i-email" className="label">{f.email}</label>
          <input id="i-email" name="email" type="email" required autoComplete="email" className="field" {...a11y("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="i-phone" className="label">{f.phone}</label>
          <input id="i-phone" name="phone" type="tel" autoComplete="tel" placeholder={f.phonePlaceholder} className="field" {...a11y("phone")} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="i-messenger" className="label">{f.messenger}</label>
          <select id="i-messenger" name="messenger" className="field" defaultValue="whatsapp" {...a11y("messenger")}>
            {Object.entries(messengers).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {err("messenger")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="i-trip" className="label">{f.trip}</label>
          <select id="i-trip" name="tripId" className="field" defaultValue={initialTripId ?? ""} {...a11y("tripId")}>
            <option value="">{f.anyTrip}</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {err("tripId")}
        </div>
        <div>
          <label htmlFor="i-start" className="label">{f.preferredStart}</label>
          <input id="i-start" name="preferredStart" type="date" className="field" {...a11y("preferredStart")} />
          {err("preferredStart")}
        </div>
        <div>
          <label htmlFor="i-days" className="label">{f.durationDays}</label>
          <input id="i-days" name="durationDays" type="number" min={2} max={30} inputMode="numeric" className="field" {...a11y("durationDays")} />
          {err("durationDays")}
        </div>
        <div>
          <label htmlFor="i-group" className="label">{f.groupSize}</label>
          <input id="i-group" name="groupSize" type="number" min={1} max={30} defaultValue={2} inputMode="numeric" required className="field" {...a11y("groupSize")} />
          {err("groupSize")}
        </div>
      </div>

      <div>
        <label htmlFor="i-message" className="label">{f.message}</label>
        <textarea id="i-message" name="message" rows={5} required maxLength={MESSAGE_MAX + 500} placeholder={f.messagePlaceholder} className="field" {...a11y("message")} />
        {err("message")}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 accent-accent" {...a11y("consent")} />
          <span>{f.consent}</span>
        </label>
        {err("consent")}
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {text(state.message)}
        </p>
      )}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? dict.sending : dict.submit}
      </button>
    </form>
  );
}
