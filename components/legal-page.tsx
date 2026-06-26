import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

/**
 * Shared shell for legal/policy pages with readable long-form typography.
 * Note: this content is a starting template, not legal advice — have it
 * reviewed by counsel before launch (see open-questions.md).
 */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="section py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Legal</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </div>
    </main>
  );
}
