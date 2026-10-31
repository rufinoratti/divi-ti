'use client';

import { CheckCircle, Receipt, Users } from '@phosphor-icons/react';

import { AccessBrand, AccessWave } from '@/components/features/AuthPageFrame';
import { Icon, type PhosphorIcon } from '@/components/ui/icon';

const onboardingSteps: Array<{ icon: PhosphorIcon; title: string; description: string }> = [
  {
    icon: Receipt,
    title: 'Registrá cada gasto',
    description: 'Anotá lo que paga cada persona del grupo.',
  },
  {
    icon: Users,
    title: 'Dividí sin vueltas',
    description: 'Repartí la cuenta entre quienes participaron.',
  },
  {
    icon: CheckCircle,
    title: 'Mirá el balance',
    description: 'Sabé qué queda por saldar en un solo lugar.',
  },
];

export function GuestOnboarding() {
  return (
    <main className="access-page access-page-guest" aria-labelledby="guest-onboarding-title">
      <div className="access-shell access-shell-guest">
        <section className="access-hero access-hero-guest">
          <div className="access-hero-inner">
            <AccessBrand tone="light" />
            <h1 id="guest-onboarding-title">Dividí gastos sin perder el hilo.</h1>
            <p>Organizá los gastos del grupo y sabé cuánto pone cada persona.</p>
            <ul className="access-steps access-steps-on-brand" aria-label="Cómo funciona Divi">
              {onboardingSteps.map(({ icon: StepIcon, title, description }) => (
                <li key={title}>
                  <span className="access-step-icon" aria-hidden="true">
                    <Icon icon={StepIcon} size="sm" />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <AccessWave className="access-wave access-wave-bottom" />
        </section>

        <section className="access-sheet access-sheet-actions" aria-label="Entrar a Divi">
          <div className="access-actions">
            <a href="/signup" className="access-primary access-primary-on-sheet">Crear cuenta</a>
            <a href="/login" className="access-secondary">Iniciar sesión</a>
          </div>
          <p className="auth-note">Solo necesitás tu email y una contraseña.</p>
        </section>
      </div>
    </main>
  );
}
