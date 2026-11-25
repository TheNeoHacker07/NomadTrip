"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

type Props = { lang: Locale; labels: Record<Locale, string>; ariaLabel: string };

/**
 * Button that opens a list of languages; each option links to the same page in that locale
 * and remembers the choice in the NEXT_LOCALE cookie. Disclosure pattern: closes on outside
 * click, Escape (focus returns to the button) and selection.
 */
export function LanguageSwitcher({ lang, labels, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // `/ru/trips/x` -> `/trips/x`; the locale is always the first segment.
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (l: Locale) => `/${l}${rest ? `/${rest}` : ""}${search ? `?${search}` : ""}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      // Close when keyboard focus leaves the switcher (Tab past the last option).
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${ariaLabel}: ${labels[lang]}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
        </svg>
        <span className="hidden sm:inline">{labels[lang]}</span>
        <span className="font-semibold uppercase sm:hidden">{lang}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>

      <ul
        id={listId}
        hidden={!open}
        aria-label={ariaLabel}
        className="absolute right-0 z-20 mt-2 min-w-40 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
      >
        {locales.map((l) => (
          <li key={l}>
            <Link
              href={hrefFor(l)}
              hrefLang={l}
              lang={l}
              aria-current={l === lang ? "true" : undefined}
              className={`flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none ${
                l === lang ? "font-semibold text-accent" : ""
              }`}
              onClick={() => {
                document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
                setOpen(false);
              }}
            >
              <span>{labels[l]}</span>
              <span className="text-xs uppercase text-muted">{l === lang ? "✓" : l}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
