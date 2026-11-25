import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { inquiryStatuses } from "@/db/schema";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { inquiryStatusCounts, listInquiries, parseInquiryStatus } from "@/lib/inquiry";
import { formatDate } from "@/lib/pricing";
import { markInquiryHandledAction } from "../actions";

export async function generateMetadata() {
  const { inquiries } = await getDictionary("admin");
  return { title: inquiries.metaTitle, robots: { index: false } };
}

export default async function InquiriesPage({ searchParams }: PageProps<"/[lang]/admin/inquiries">) {
  const { inquiries } = await getDictionary("admin");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{inquiries.title}</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <InquiryList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InquiryList({ searchParams }: { searchParams: PageProps<"/[lang]/admin/inquiries">["searchParams"] }) {
  const [lang, a, booking] = await Promise.all([getLang(), getDictionary("admin"), getDictionary("booking")]);
  // The proxy challenges for credentials, but pages re-check on their own.
  if (!isAdminAuthorization((await headers()).get("authorization"))) return <p className="text-muted">{a.unauthorized}</p>;
  await connection();
  const i = a.inquiries;
  const raw = (await searchParams).status;
  const status = parseInquiryStatus(Array.isArray(raw) ? raw[0] : raw);
  const rows = listInquiries(db, status);
  const counts = inquiryStatusCounts(db);
  const tab = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-border hover:border-accent"}`;
  const label = { new: i.new, handled: i.handled } as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={i.statusFilter}>
        <Link href={`/${lang}/admin/inquiries`} className={tab(!status)}>
          {i.all} ({counts.new + counts.handled})
        </Link>
        {inquiryStatuses.map((s) => (
          <Link key={s} href={`/${lang}/admin/inquiries?status=${s}`} className={tab(status === s)}>
            {label[s]} ({counts[s]})
          </Link>
        ))}
      </div>

      {rows.length === 0 && <p className="text-muted">{status ? i.noMatches : i.empty}</p>}
      {rows.map(({ inquiry: q, tripTitle, tripSlug }) => (
        <article key={q.id} className="card p-5" aria-label={q.name}>
          <header className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold">{q.name}</span>
            <StatusBadge status={q.status === "new" ? "pending" : "confirmed"} label={label[q.status]} />
            <span className="text-sm text-muted">
              {interpolate(a.received, { date: `${formatDate(q.createdAt.slice(0, 10), lang)} ${q.createdAt.slice(11, 16)}` })}
            </span>
          </header>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Row k={booking.fields.email} v={q.email} />
            <Row k={i.phone} v={q.phone ?? "—"} />
            <Row k={i.messenger} v={booking.options.messenger[q.messenger]} />
            <Row k={i.language} v={q.lang.toUpperCase()} />
            <Row k={i.trip} v={tripTitle ? `${localize(tripTitle, lang)} (${tripSlug})` : i.anyTrip} />
            <Row k={i.preferredStart} v={q.preferredStart ? formatDate(q.preferredStart, lang) : "—"} />
            <Row k={i.duration} v={q.durationDays ? String(q.durationDays) : "—"} />
            <Row k={i.group} v={String(q.groupSize)} />
          </dl>
          <p className="mt-3 text-sm font-semibold">{i.message}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{q.message}</p>
          {q.status === "new" && (
            <form action={markInquiryHandledAction} className="mt-4">
              <input type="hidden" name="inquiryId" value={q.id} />
              <button className="btn px-3 py-1.5">{i.markHandled}</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="inline font-semibold">{k}: </dt>
      <dd className="inline">{v}</dd>
    </div>
  );
}
