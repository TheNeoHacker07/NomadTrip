import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { inquiryStatusCounts } from "@/lib/inquiry";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [lang, a] = await Promise.all([getLang(), getDictionary("admin")]);
  return (
    <>
      <nav aria-label={a.navLabel} className="mb-6 flex gap-4 border-b border-border pb-3 text-sm font-medium">
        <Link href={`/${lang}/admin`} className="hover:text-accent">{a.nav.bookings}</Link>
        <Link href={`/${lang}/admin/trips`} className="hover:text-accent">{a.nav.trips}</Link>
        <Link href={`/${lang}/admin/inquiries`} className="hover:text-accent">
          {a.nav.inquiries}
          <Suspense>
            <NewInquiriesCount label={a.nav.newCount} />
          </Suspense>
        </Link>
      </nav>
      {children}
    </>
  );
}

async function NewInquiriesCount({ label }: { label: string }) {
  // The layout re-checks credentials before touching the database, like every admin page.
  if (!isAdminAuthorization((await headers()).get("authorization"))) return null;
  await connection();
  const n = inquiryStatusCounts(db).new;
  if (n === 0) return null;
  return (
    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-fg" aria-label={interpolate(label, { total: n })}>
      {n}
    </span>
  );
}
