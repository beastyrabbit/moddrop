import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section
      data-label={eyebrow}
      className="signal-frame signal-surface rounded-2xl px-6 py-7 sm:px-8"
    >
      <p className="signal-label">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-none text-white sm:text-5xl [font-family:var(--font-display)] uppercase">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 sm:text-base">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className="mt-5 flex flex-wrap gap-3">{children}</div>
      ) : null}
    </section>
  );
}
