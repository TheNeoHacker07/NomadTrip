import type { ReactNode } from "react";

/** Page title block shared by the static content pages. */
export function PageHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="mb-10 max-w-2xl">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{intro}</p>
    </header>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12 max-w-3xl">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Grid of cards, each with a heading and body text. */
export function CardGrid({ items, numbered = false }: { items: { title: string; body: string }[]; numbered?: boolean }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item, i) => (
        <li key={item.title} className="card p-5">
          <h3 className="font-semibold">
            {numbered && <span className="mr-2 text-accent">{i + 1}.</span>}
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
