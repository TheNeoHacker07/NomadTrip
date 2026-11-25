import type { ReactNode } from "react";
import { HornDivider } from "@/components/ornament";
import { Photo } from "@/components/photo";
import type { ImageKey } from "@/lib/images";

/** Page title block shared by the static content pages. */
export function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-10 max-w-2xl">
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{intro}</p>
    </header>
  );
}

/** Photo banner + title for the main content pages. The credit caption sits under the photo. */
export function PageBanner({ title, intro, photo, priority = true }: { title: string; intro: string; photo: ImageKey; priority?: boolean }) {
  return (
    <header className="mb-12 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{intro}</p>
        <HornDivider className="mt-8 justify-start" />
      </div>
      <Photo name={photo} sizes="(min-width: 1024px) 560px, 100vw" frame="aspect-[16/10]" priority={priority} className="[&>div]:shadow-lg" />
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12 max-w-3xl">
      <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Grid of cards, each with a heading and body text. */
export function CardGrid({ items, numbered = false }: { items: { title: string; body: string }[]; numbered?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item, i) => (
        <li key={item.title} className="card border-t-4 border-t-primary p-5">
          <h3 className="flex items-start gap-3 font-semibold">
            {numbered && (
              <span aria-hidden="true" className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-gold-fg">
                {i + 1}
              </span>
            )}
            <span>{item.title}</span>
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
