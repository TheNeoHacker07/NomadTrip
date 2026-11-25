import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { PageHeader } from "@/components/content-blocks";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import type { ImageKey } from "@/lib/images";

export async function generateMetadata(): Promise<Metadata> {
  const { whatsIncluded: c } = await getDictionary("included");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/whats-included", locales) },
  };
}

const sectionPhotos = {
  accommodation: "yurt-interior",
  meals: "food",
  transport: "alay-valley",
  guides: "yurt-exterior",
  activities: "horse-riding",
  safety: "trekking",
} as const satisfies Record<string, ImageKey>;

export default async function WhatsIncludedPage() {
  const [{ whatsIncluded: c }, lang] = await Promise.all([getDictionary("included"), getLang()]);
  const sections = Object.entries(c.sections) as [keyof typeof sectionPhotos, (typeof c.sections)[keyof typeof c.sections]][];
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <Photo name="yurt-camp" sizes="(min-width: 1024px) 1024px, 100vw" frame="aspect-[16/9] sm:aspect-[21/9]" priority className="mb-12" />
      <div className="space-y-14">
        {sections.map(([key, s], i) => (
          <section key={key} className="grid items-start gap-6 md:grid-cols-2 md:gap-10">
            <Photo name={sectionPhotos[key]} sizes="(min-width: 768px) 480px, 100vw" className={i % 2 === 1 ? "md:order-2" : ""} />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-2 text-muted">{s.body}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {Object.values(s.points).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
      <section className="card mt-14 max-w-3xl p-6">
        <h2 className="text-2xl font-semibold tracking-tight">{c.notIncludedTitle}</h2>
        <p className="mt-2 text-muted">{c.notIncludedIntro}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          {Object.values(c.notIncluded).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <Link href={`/${lang}#trips`} className="mt-10 inline-block font-semibold text-accent hover:underline">
        {c.cta} →
      </Link>
    </>
  );
}
