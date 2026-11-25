import type { Metadata } from "next";
import Link from "next/link";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { CardGrid, PageHeader, Section } from "@/components/content-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const { yurtLife: c } = await getDictionary("content");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/yurt-life", locales) },
  };
}

export default async function YurtLifePage() {
  const [{ yurtLife: y }, lang] = await Promise.all([getDictionary("content"), getLang()]);
  return (
    <>
      <PageHeader title={y.title} intro={y.intro} />
      <Section title={y.nightTitle}>
        <CardGrid items={Object.values(y.night)} />
      </Section>
      <Section title={y.etiquetteTitle}>
        <CardGrid items={Object.values(y.etiquette)} />
      </Section>
      <Section title={y.packTitle}>
        <ul className="card list-disc space-y-2 py-5 pl-9 pr-5 text-sm">
          {Object.values(y.pack).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      <Link href={`/${lang}#trips`} className="font-semibold text-accent hover:underline">
        {y.cta} →
      </Link>
    </>
  );
}
