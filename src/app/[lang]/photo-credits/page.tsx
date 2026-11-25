import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/content-blocks";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { images } from "@/lib/images";

export async function generateMetadata(): Promise<Metadata> {
  const { credits: c } = await getDictionary("included");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/photo-credits", locales) },
  };
}

export default async function PhotoCreditsPage() {
  const [{ credits: c }, lang] = await Promise.all([getDictionary("included"), getLang()]);
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <ul className="grid gap-4 sm:grid-cols-2">
        {Object.entries(images).map(([key, img]) => (
          <li key={key} className="card flex gap-4 p-3">
            <Image
              src={img.src}
              width={img.width}
              height={img.height}
              alt={localize(img.alt, lang)}
              sizes="120px"
              className="aspect-square w-24 shrink-0 rounded-lg object-cover sm:w-28"
            />
            <dl className="min-w-0 text-sm">
              <dt className="sr-only">{c.author}</dt>
              <dd className="font-medium">{img.author}</dd>
              <dt className="sr-only">{c.license}</dt>
              <dd className="text-muted">
                {img.licenseUrl ? (
                  <a href={img.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    {img.license}
                  </a>
                ) : (
                  c.publicDomain
                )}
              </dd>
              <dd className="mt-1">
                <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  {c.source}
                </a>
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
