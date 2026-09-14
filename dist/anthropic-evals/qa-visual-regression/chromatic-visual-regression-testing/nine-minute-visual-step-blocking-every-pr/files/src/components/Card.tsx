import type { ReactNode } from 'react';
import './Card.css';

export function Card({ title, body, elevation = 0 }: { title: string; body: ReactNode; elevation?: number }) {
  return (
    <section className="hl-card" data-elevation={elevation}>
      <h3 className="hl-card__title">{title}</h3>
      <div className="hl-card__body">{body}</div>
    </section>
  );
}
