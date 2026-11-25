import type { Metadata } from "next";
import { locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { getLang } from "@/i18n/dictionaries";
import { ManageForm } from "./manage-form";

export async function generateMetadata(): Promise<Metadata> {
  const { metaTitle } = await getDictionary("manage");
  return { title: metaTitle, robots: { index: false }, alternates: { languages: languageAlternates("/manage-booking", locales) } };
}

export default async function ManageBookingPage() {
  const [lang, common, dict] = await Promise.all([getLang(), getDictionary("common"), getDictionary("manage")]);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
      <p className="mt-2 mb-6 text-muted">{dict.intro}</p>
      <ManageForm lang={lang} dict={dict} statusLabels={common.status} />
    </div>
  );
}
