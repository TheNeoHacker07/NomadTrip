import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isLocale, localeLabels, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
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
    title: { default: meta.title, template: meta.titleTemplate },
    description: meta.description,
    alternates: { languages: languageAlternates("/", locales) },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const common = await getDictionary("common", lang);

  return (
    <html lang={lang} className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
            <Link href={`/${lang}`} className="text-lg font-bold tracking-tight">
              Nomad<span className="text-accent">Trip</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href={`/${lang}#trips`} className="text-sm text-muted hover:text-foreground">
                {common.nav.allTrips}
              </Link>
              <Suspense fallback={null}>
                <LanguageSwitcher lang={lang} labels={localeLabels} ariaLabel={common.nav.language} />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">{common.footer.tagline}</footer>
      </body>
    </html>
  );
}
