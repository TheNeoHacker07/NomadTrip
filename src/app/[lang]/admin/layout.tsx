import Link from "next/link";
import { getDictionary, getLang } from "@/i18n/dictionaries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [lang, a] = await Promise.all([getLang(), getDictionary("admin")]);
  return (
    <>
      <nav aria-label={a.navLabel} className="mb-6 flex gap-4 border-b border-border pb-3 text-sm font-medium">
        <Link href={`/${lang}/admin`} className="hover:text-accent">{a.nav.bookings}</Link>
        <Link href={`/${lang}/admin/trips`} className="hover:text-accent">{a.nav.trips}</Link>
      </nav>
      {children}
    </>
  );
}
