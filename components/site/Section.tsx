import type { ReactNode } from "react";

type SectionProps = {
  children?: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
};

export function Section({ children, className = "", eyebrow, title, intro }: SectionProps) {
  return (
    <section className={`site-section ${className}`.trim()}>
      <div className="site-container">
        {(eyebrow || title || intro) && (
          <div className="section-heading">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {intro && <p className="section-intro">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
