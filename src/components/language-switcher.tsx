"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

type Props = { lang: Locale; labels: Record<Locale, string>; ariaLabel: string };

/** Links to the same page in every other locale and remembers the choice in the NEXT_LOCALE cookie. */
export function LanguageSwitcher({ lang, labels, ariaLabel }: Props) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // `/ru/trips/x` -> `/trips/x`; the locale is always the first segment.
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (l: Locale) => `/${l}${rest ? `/${rest}` : ""}${search ? `?${search}` : ""}`;

  return (
    <ul className="flex items-center gap-1 text-sm" aria-label={ariaLabel}>
      {locales.map((l) => (
        <li key={l}>
          <Link
            href={hrefFor(l)}
            hrefLang={l}
            lang={l}
            aria-current={l === lang ? "true" : undefined}
            className={`rounded-md px-2 py-1 ${l === lang ? "bg-accent/10 font-semibold text-accent" : "text-muted hover:text-foreground"}`}
            onClick={() => {
              document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
          >
            {labels[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
