import type { Metadata } from "next";
import Link from "next/link";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { PageHeader } from "@/components/content-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const { faq: c } = await getDictionary("content");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/faq", locales) },
  };
}

export default async function FaqPage() {
  const [{ faq }, lang] = await Promise.all([getDictionary("content"), getLang()]);
  return (
    <>
      <PageHeader title={faq.title} intro={faq.intro} />
      <div className="mb-10 max-w-3xl space-y-4">
        {Object.values(faq.items).map((item) => (
          <section key={item.q} className="card p-5">
            <h2 className="font-semibold">{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
          </section>
        ))}
      </div>
      <p className="mb-4 text-muted">{faq.contactNote}</p>
      <Link href={`/${lang}#trips`} className="font-semibold text-accent hover:underline">
        {faq.cta} →
      </Link>
    </>
  );
}
