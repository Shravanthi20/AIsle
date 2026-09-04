import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`surface ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }>) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function MetricCard({ label, value, detail, accent = 'mint' }: { label: string; value: ReactNode; detail?: string; accent?: 'mint' | 'saffron' | 'blue' }) {
  return <Card className={`metric-card metric-${accent}`}><p className="eyebrow">{label}</p><p className="metric-value">{value}</p>{detail ? <p className="metric-detail">{detail}</p> : null}</Card>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2></div>{children}</div>;
}

export function LoadingState({ label = 'Loading live data...' }: { label?: string }) {
  return <div className="state-box"><span className="spinner" aria-hidden="true" /> <span>{label}</span></div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="state-box empty-state"><span className="empty-mark" aria-hidden="true">+</span><strong>{title}</strong><span>{message}</span>{action}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-box error-state"><strong>Something needs attention</strong><span>{message}</span>{onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = /PAID|CONFIRMED|COMPLETED|ACTIVE|APPROVED/.test(normalized) ? 'success' : /FAILED|CANCELLED|REJECTED|INACTIVE/.test(normalized) ? 'danger' : /PENDING|REQUIRES/.test(normalized) ? 'warning' : 'neutral';
  return <Badge tone={tone}>{status.replace(/_/g, ' ')}</Badge>;
}