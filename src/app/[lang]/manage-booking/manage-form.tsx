"use client";

import { startTransition, useActionState } from "react";
import { StatusBadge } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Dictionaries } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { addDays, formatDate, usd } from "@/lib/pricing";
import { lookupAction, type ManageState } from "./actions";
import Link from "next/link";

type Props = {
  lang: Locale;
  dict: Dictionaries["manage"];
  statusLabels: Record<"pending" | "confirmed" | "cancelled", string>;
};

export function ManageForm({ lang, dict, statusLabels }: Props) {
  const [state, formAction, pending] = useActionState<ManageState, FormData>(lookupAction, { status: "idle" });

  if (state.status === "found") {
    const v = state.view;
    const r = dict.result;
    const end = addDays(v.startDate, v.durationDays - 1);
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold">{r.title}</h2>
        <p className="mt-3 rounded-lg bg-accent/10 py-3 text-center font-mono text-xl font-bold tracking-wider text-accent">{v.reference}</p>
        <dl className="mt-6 space-y-2 text-sm">
          <Item label={r.status} value={<StatusBadge status={v.status} label={statusLabels[v.status]} />} />
          <Item label={r.trip} value={localize(v.tripTitle, lang)} />
          <Item label={r.dates} value={`${formatDate(v.startDate, lang)} – ${formatDate(end, lang)}`} />
          <Item label={r.travelers} value={v.travelerNames.join(", ")} />
          <Item label={r.yurt} value={v.yurtArrangement === "private" ? r.yurtPrivate : r.yurtShared} />
          <Item label={r.estimatedTotal} value={usd(v.totalPriceUsd)} />
          <Item
            label={r.pickup}
            value={
              v.pickup.needed
                ? `${interpolate(r.pickupNeeded, { airport: dict.airports[v.pickup.airport] })}${v.pickup.flight ? ` · ${interpolate(r.flight, { flight: v.pickup.flight })}` : ""}`
                : r.pickupNotNeeded
            }
          />
        </dl>
        <p className="mt-4 text-sm text-muted">{r.contactNote}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {v.status !== "cancelled" && (
            // A plain link: the .ics is a file download served by a route handler, not a page.
            <a href={`/${lang}/bookings/${v.reference}/calendar.ics`} className="btn">
              {dict.calendar}
            </a>
          )}
          <Link href={`/${lang}/trips/${v.tripSlug}`} className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent">
            {r.viewTrip}
          </Link>
        </div>
      </div>
    );
  }

  const error = state.status === "error" ? dict.errors[state.code] : null;
  return (
    <form
      method="post"
      // A transition (not `action=`) stops React 19 clearing the fields after the action finishes.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="card space-y-4 p-6"
      aria-busy={pending}
    >
      <input type="hidden" name="lang" value={lang} />
      <div>
        <label htmlFor="m-reference" className="label">{dict.form.reference}</label>
        <input id="m-reference" name="reference" required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="NT-" className="field font-mono" />
        <p className="mt-1 text-xs text-muted">{dict.form.referenceHint}</p>
      </div>
      <div>
        <label htmlFor="m-email" className="label">{dict.form.email}</label>
        <input id="m-email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? dict.form.sending : dict.form.submit}
      </button>
    </form>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
