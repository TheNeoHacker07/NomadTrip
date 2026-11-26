import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isLocale, localeLabels, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { siteUrl } from "@/lib/site";
import "../globals.css";

// Both families ship cyrillic AND cyrillic-ext (Kyrgyz ө ү ң live in the extended block).
const body = Inter({ variable: "--font-body", subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], display: "swap" });
const heading = Lora({ variable: "--font-heading", subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"], display: "swap" });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { meta } = await getDictionary("common", lang);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: meta.title, template: meta.titleTemplate },
    description: meta.description,
    alternates: { languages: languageAlternates("/", locales) },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const common = await getDictionary("common", lang);
  const links = [
    { href: `/${lang}#trips`, label: common.nav.allTrips },
    { href: `/${lang}/departures`, label: common.nav.departures },
    { href: `/${lang}/experiences`, label: common.nav.experiences },
    { href: `/${lang}/whats-included`, label: common.nav.whatsIncluded },
    { href: `/${lang}/manage-booking`, label: common.nav.manageBooking },
    { href: `/${lang}/about`, label: common.nav.about },
  ];
  const tripLinks = [
    { href: `/${lang}#trips`, label: common.nav.allTrips },
    { href: `/${lang}/departures`, label: common.nav.departures },
    { href: `/${lang}/manage-booking`, label: common.nav.manageBooking },
  ];
  const guideLinks = [
    { href: `/${lang}/whats-included`, label: common.nav.whatsIncluded },
    { href: `/${lang}/experiences`, label: common.nav.experiences },
    { href: `/${lang}/yurt-life`, label: common.nav.yurtLife },
    { href: `/${lang}/faq`, label: common.nav.faq },
  ];
  const companyLinks = [
    { href: `/${lang}/about`, label: common.nav.about },
    { href: `/${lang}/photo-credits`, label: common.nav.photoCredits },
  ];
  const footerColumns = [
    { title: common.footer.tripsTitle, links: tripLinks },
    { title: common.footer.infoTitle, links: guideLinks },
    { title: common.footer.companyTitle, links: companyLinks },
  ];
  const linkCls = "text-white/75 transition hover:text-[#f6c978]";

  return (
    <html lang={lang} className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip font-sans">
        <SiteHeader
          homeHref={`/${lang}`}
          links={links}
          menuLabel={common.nav.menu}
          closeLabel={common.nav.closeMenu}
          languageSlot={
            <Suspense fallback={null}>
              <LanguageSwitcher lang={lang} labels={localeLabels} ariaLabel={common.nav.language} />
            </Suspense>
          }
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        {/* Always dark (both colour schemes), matching the home hero's night-lake tone. */}
        <footer className="mt-16 bg-[#06161b] text-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 pb-10 pt-14 text-sm md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div className="col-span-2 md:col-span-1">
              <Link href={`/${lang}`} className="font-display text-2xl font-bold">
                Nomad<span className="text-[#f6c978]">Trip</span>
              </Link>
              <p className="mt-3 max-w-xs leading-relaxed text-white/75">{common.footer.tagline}</p>
              <Link href={`/${lang}/inquiry`} className="btn mt-6">
                {common.footer.customTrip} <span aria-hidden="true">→</span>
              </Link>
            </div>
            {footerColumns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#f6c978]">{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={linkCls}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/60">
              <p>© NomadTrip</p>
              <p>{common.footer.season}</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
