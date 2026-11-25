import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isLocale, localeLabels, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { siteUrl } from "@/lib/site";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });

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
    { href: `/${lang}/whats-included`, label: common.nav.whatsIncluded },
    { href: `/${lang}/experiences`, label: common.nav.experiences },
    { href: `/${lang}/about`, label: common.nav.about },
    { href: `/${lang}/yurt-life`, label: common.nav.yurtLife },
    { href: `/${lang}/faq`, label: common.nav.faq },
  ];
  const footerLinks = [...links, { href: `/${lang}/photo-credits`, label: common.nav.photoCredits }];

  return (
    <html lang={lang} className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
            <Link href={`/${lang}`} className="text-lg font-bold tracking-tight">
              Nomad<span className="text-accent">Trip</span>
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={`/${lang}#trips`} className="text-sm text-muted hover:text-foreground">
                {common.nav.allTrips}
              </Link>
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-sm text-muted hover:text-foreground">
                  {l.label}
                </Link>
              ))}
              <Suspense fallback={null}>
                <LanguageSwitcher lang={lang} labels={localeLabels} ariaLabel={common.nav.language} />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {footerLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
          {common.footer.tagline}
        </footer>
      </body>
    </html>
  );
}
