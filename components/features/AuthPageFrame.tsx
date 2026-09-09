import type { ReactNode } from 'react';
import { CircleAlertIcon, CircleCheckIcon, type LucideIcon } from 'lucide-react';

interface AuthPageFrameProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  note?: string;
}

export function AuthPageFrame({ title, description, children, footer, note }: AuthPageFrameProps) {
  return (
    <main className="auth-page min-h-[100dvh] text-[#1f1f1f]">
      <div className="auth-layout mx-auto min-h-[100dvh] max-w-[1120px] px-5 py-5 sm:px-8 sm:py-8">
        <header className="auth-topbar">
          <a href="/" className="auth-brand" aria-label="Divi, ir al inicio">
            <img src="/branding/divi-lockup.png" alt="Divi" className="auth-brand-image" />
          </a>
        </header>

        <div className="auth-main-grid">
          <aside className="auth-context" aria-label="Acerca de Divi">
            <div className="auth-context-copy">
              <h2>Gastos compartidos, sin perder el hilo.</h2>
              <p>Registrá lo que paga cada persona y dejá claro cuánto corresponde saldar.</p>
            </div>
            <div className="auth-flow" aria-label="Cómo funciona Divi">
              <div className="auth-flow-item">
                <span className="auth-flow-mark" aria-hidden="true" />
                <div><strong>Registrar</strong><span>anotá cada gasto del grupo</span></div>
              </div>
              <div className="auth-flow-item">
                <span className="auth-flow-mark" aria-hidden="true" />
                <div><strong>Dividir</strong><span>repartí el total entre las personas</span></div>
              </div>
              <div className="auth-flow-item">
                <span className="auth-flow-mark" aria-hidden="true" />
                <div><strong>Saldar</strong><span>consultá quién debe y quién recibe</span></div>
              </div>
            </div>
          </aside>

          <section className="auth-screen" aria-labelledby="auth-title">
            <div className="auth-header">
              <h1 id="auth-title">{title}</h1>
              <p>{description}</p>
            </div>
            <div className="auth-content">
              {children}
              {note && <p className="auth-note">{note}</p>}
            </div>
            <div className="auth-footer">{footer}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  children: ReactNode;
}

export function AuthField({ id, label, icon: Icon, error, children }: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field-group">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className={`auth-field ${error ? 'auth-field-error' : ''}`}>
        <Icon aria-hidden="true" className="auth-field-icon" />
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

  const FeedbackIcon = variant === 'error' ? CircleAlertIcon : CircleCheckIcon;

  return (
    <div
      className={`auth-toast auth-toast-${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <FeedbackIcon aria-hidden="true" className="auth-toast-mark" />
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
      <span className="auth-button-label">{isSubmitting ? loadingLabel : label}</span>
      {isSubmitting && <span className="auth-button-progress" aria-hidden="true"><span /></span>}
    </button>
  );
}
