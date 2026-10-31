'use client';

import type { ReactNode } from 'react';
import { CheckCircle, Receipt, Users, WarningCircle } from '@phosphor-icons/react';

import { Icon, LoadingIcon, type PhosphorIcon } from '@/components/ui/icon';

const accessSteps = [
  { icon: Receipt, title: 'Registrar', detail: 'Anotá cada gasto del grupo.' },
  { icon: Users, title: 'Dividir', detail: 'Repartí el total entre las personas.' },
  { icon: CheckCircle, title: 'Saldar', detail: 'Mirá quién debe y quién recibe.' },
];

export function AccessWave({ className = 'access-wave' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 390 48" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 18 C 65 48, 130 0, 195 22 C 260 44, 325 8, 390 28 L 390 48 L 0 48 Z" fill="currentColor" />
    </svg>
  );
}

export function AccessBrand({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <a href="/" className={`access-brand access-brand-${tone}`} aria-label="Divi, ir al inicio">
      <img src="/branding/divi-lockup.png" alt="Divi" />
    </a>
  );
}

interface AuthPageFrameProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  note?: string;
}

export function AuthPageFrame({ title, description, children, footer, note }: AuthPageFrameProps) {
  return (
    <main className="access-page">
      <div className="access-shell">
        <aside className="access-hero" aria-label="Acerca de Divi">
          <div className="access-hero-inner">
            <AccessBrand tone="light" />
            <div className="access-hero-copy access-hero-desktop">
              <h2>Gastos compartidos, sin perder el hilo.</h2>
              <p>Registrá lo que paga cada persona y dejá claro cuánto corresponde saldar.</p>
            </div>
            <ol className="access-steps access-hero-desktop">
              {accessSteps.map((step) => (
                <li key={step.title}>
                  <span className="access-step-icon" aria-hidden="true">
                    <Icon icon={step.icon} size="sm" />
                  </span>
                  <span>
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <header className="access-hero-mobile">
              <h1 id="auth-title">{title}</h1>
              <p>{description}</p>
            </header>
          </div>
          <AccessWave className="access-wave access-wave-bottom" />
        </aside>

        <section className="access-sheet" aria-labelledby="auth-title">
          <header className="access-sheet-header" aria-hidden="true">
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          <div className="access-sheet-body">
            {children}
            {note && <p className="auth-note">{note}</p>}
          </div>
          <footer className="auth-footer">{footer}</footer>
        </section>
      </div>
    </main>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  icon: PhosphorIcon;
  error?: string;
  children: ReactNode;
}

export function AuthField({ id, label, icon: FieldIcon, error, children }: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field-group">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className={`auth-field ${error ? 'auth-field-error' : ''}`}>
        <Icon icon={FieldIcon} aria-hidden="true" className="auth-field-icon" />
        {children}
      </div>
      {error && <p id={errorId} role="alert" className="auth-field-message">{error}</p>}
    </div>
  );
}

interface AuthFeedbackProps {
  message?: string;
  variant: 'error' | 'success';
}

export function AuthFeedback({ message, variant }: AuthFeedbackProps) {
  if (!message) return null;

  return (
    <div
      className={`auth-toast auth-toast-${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon icon={variant === 'error' ? WarningCircle : CheckCircle} aria-hidden="true" className="auth-toast-mark" />
      <p>{message}</p>
    </div>
  );
}

export function AuthSubmitButton({ label, loadingLabel, isSubmitting }: {
  label: string;
  loadingLabel: string;
  isSubmitting: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="auth-button"
      data-loading={isSubmitting || undefined}
      aria-busy={isSubmitting}
    >
      {isSubmitting && <LoadingIcon size="sm" className="text-white" />}
      <span className="auth-button-label">{isSubmitting ? loadingLabel : label}</span>
    </button>
  );
}
