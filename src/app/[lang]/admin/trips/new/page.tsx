import { headers } from "next/headers";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { tripRegions } from "@/db/schema";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { formMessages, tripFormLabels } from "../form-props";
import { TripForm } from "../../trip-form";

export async function generateMetadata() {
  const { trips } = await getDictionary("admin");
  return { title: trips.newMetaTitle, robots: { index: false } };
}

export default async function NewTripPage() {
  const a = await getDictionary("admin");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{a.form.newTitle}</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <NewTripForm />
      </Suspense>
    </>
  );
}

async function NewTripForm() {
  const [lang, common, a] = await Promise.all([getLang(), getDictionary("common"), getDictionary("admin")]);
  if (!isAdminAuthorization((await headers()).get("authorization"))) return <p className="text-muted">{a.unauthorized}</p>;
  const empty = { en: "", ru: "", ky: "" };
  return (
    <TripForm
      lang={lang}
      initial={{
        slug: "", pricePerPersonUsd: "", difficulty: "easy", region: "chui",
        title: empty, summary: empty, description: empty, highlights: empty,
        itinerary: [0, 1].map(() => ({ title: { ...empty }, description: { ...empty }, overnight: { ...empty } })),
      }}
      labels={tripFormLabels(a, common, a.form.create)}
      messages={formMessages(a)}
      regions={tripRegions}
      difficulties={["easy", "moderate", "challenging"]}
    />
  );
}
