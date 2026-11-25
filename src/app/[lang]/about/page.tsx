import type { Metadata } from "next";
import Link from "next/link";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { CardGrid, PageBanner, Section } from "@/components/content-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const { about: c } = await getDictionary("content");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/about", locales) },
  };
}

export default async function AboutPage() {
  const [{ about }, lang] = await Promise.all([getDictionary("content"), getLang()]);
  return (
    <>
      <PageBanner title={about.title} intro={about.intro} photo="yurt-camp" />
      <Section title={about.whoTitle}>
        <div className="space-y-4 leading-relaxed">
          {Object.values(about.who).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>
      <Section title={about.howTitle}>
        <CardGrid items={Object.values(about.how)} />
      </Section>
      <Section title={about.bookingTitle}>
        <CardGrid items={Object.values(about.steps)} numbered />
        <p className="mt-4 text-sm text-muted">{about.bookingNote}</p>
      </Section>
      <Link href={`/${lang}#trips`} className="font-semibold text-accent hover:underline">
        {about.cta} →
      </Link>
    </>
  );
}
