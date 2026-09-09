import { CircleCheckIcon, ReceiptTextIcon, UsersIcon } from 'lucide-react';

const onboardingSteps = [
  {
    icon: ReceiptTextIcon,
    title: 'Registrá cada gasto',
    description: 'Anotá lo que paga cada persona del grupo.',
  },
  {
    icon: UsersIcon,
    title: 'Dividí sin vueltas',
    description: 'Repartí la cuenta entre quienes participaron.',
  },
  {
    icon: CircleCheckIcon,
    title: 'Mirá el balance',
    description: 'Sabé qué queda por saldar en un solo lugar.',
  },
];

export function GuestOnboarding() {
  return (
    <main className="guest-onboarding" aria-labelledby="guest-onboarding-title">
      <div className="guest-onboarding-accent" aria-hidden="true" />

      <div className="guest-onboarding-shell">
        <header className="guest-onboarding-header">
          <img src="/branding/divi-lockup.png" alt="Divi" className="guest-onboarding-logo" />
          <span className="guest-onboarding-header-note">Gastos compartidos</span>
        </header>

        <section className="guest-onboarding-content">
          <p className="guest-onboarding-kicker">Todo claro entre ustedes</p>
          <h1 id="guest-onboarding-title">Dividí gastos sin perder el hilo.</h1>
          <p className="guest-onboarding-description">
            Organizá los gastos del grupo y sabé cuánto pone cada persona.
          </p>

          <ul className="guest-onboarding-steps" aria-label="Cómo funciona Divi">
            {onboardingSteps.map(({ icon: Icon, title, description }) => (
              <li key={title} className="guest-onboarding-step">
                <span className="guest-onboarding-step-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="guest-onboarding-actions">
            <a href="/signup" className="guest-onboarding-primary">
              Crear cuenta
            </a>
            <a href="/login" className="guest-onboarding-secondary">
              Iniciar sesión
            </a>
          </div>

          <p className="guest-onboarding-footnote">Solo necesitás tu email y una contraseña.</p>
        </section>
      </div>
    </main>
  );
}
