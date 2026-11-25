import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HornDivider } from "@/components/ornament";
import { SiteHeader } from "@/components/site-header";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isLocale, localeLabels, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
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
  const infoLinks = [
    { href: `/${lang}/whats-included`, label: common.nav.whatsIncluded },
    { href: `/${lang}/experiences`, label: common.nav.experiences },
    { href: `/${lang}/about`, label: common.nav.about },
    { href: `/${lang}/yurt-life`, label: common.nav.yurtLife },
    { href: `/${lang}/faq`, label: common.nav.faq },
    { href: `/${lang}/photo-credits`, label: common.nav.photoCredits },
  ];
  const tripLinks = [
    { href: `/${lang}#trips`, label: common.nav.allTrips },
    { href: `/${lang}/departures`, label: common.nav.departures },
    { href: `/${lang}/manage-booking`, label: common.nav.manageBooking },
  ];
  const linkCls = "hover:text-accent hover:underline underline-offset-4";

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
        <footer className="mt-16 border-t border-border bg-sky/60">
          <HornDivider className="pt-8" />
          <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-6 text-sm sm:grid-cols-3">
            <div>
              <p className="font-display text-xl font-bold">
                Nomad<span className="text-accent">Trip</span>
              </p>
              <p className="mt-2 max-w-xs text-muted">{common.footer.tagline}</p>
            </div>
            <nav aria-label={common.footer.tripsTitle}>
              <p className="mb-3 font-semibold">{common.footer.tripsTitle}</p>
              <ul className="space-y-2 text-muted">
                {tripLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={linkCls}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={common.footer.infoTitle}>
              <p className="mb-3 font-semibold">{common.footer.infoTitle}</p>
              <ul className="space-y-2 text-muted">
                {infoLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={linkCls}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
