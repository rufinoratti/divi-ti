'use client';

import { useState, type FormEvent } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from 'lucide-react';
import {
  AuthFeedback,
  AuthField,
  AuthPageFrame,
  AuthSubmitButton,
} from '@/components/features/AuthPageFrame';
import {
  CONNECTION_ERROR_MESSAGE,
  FORM_VALIDATION_MESSAGE,
  readAuthApiError,
  readAuthValidationErrors,
  type AuthApiPayload,
} from '@/lib/auth/client';
import { signupSchema } from '@/lib/auth/schemas';
import { type AuthSessionPayload } from '@/lib/auth/types';

interface SignupFormProps {
  onSignup: (session: AuthSessionPayload) => Promise<void> | void;
  error?: string;
}

export function SignupForm({ onSignup, error }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(error ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setFieldErrors({});

    const validation = signupSchema.safeParse({ name, email, password });
    if (!validation.success) {
      setFormError(FORM_VALIDATION_MESSAGE);
      setFieldErrors(readAuthValidationErrors(validation.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await res.json() as AuthApiPayload & {
        session?: AuthSessionPayload | null;
      };

      if (!res.ok) {
        const apiError = readAuthApiError(data, 'No pudimos crear la cuenta.');
        setFormError(apiError.message);
        setFieldErrors(apiError.fields);
        return;
      }

      if (!data.session) {
        setFormError(data.message ?? 'La cuenta se creó, pero no pudimos iniciar tu sesión automáticamente.');
        return;
      }

      await onSignup(data.session);
    } catch {
      setFormError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageFrame
      title="Creá tu cuenta"
      description="Empezá a dividir gastos con tu grupo."
      note="Tus movimientos quedan vinculados a esta cuenta para que puedas retomarlos después."
      footer={<>¿Ya tenés cuenta? <a href="/login">Iniciá sesión</a></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthField id="name" label="Nombre" icon={UserIcon} error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => { setName(event.target.value); clearFieldError('name'); setFormError(''); }}
            placeholder="Tu nombre"
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          />
        </AuthField>
        <AuthField id="email" label="Email" icon={MailIcon} error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); clearFieldError('email'); setFormError(''); }}
            placeholder="tu@email.com"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
        </AuthField>
        <AuthField id="password" label="Contraseña" icon={LockIcon} error={fieldErrors.password}>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); setFormError(''); }}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          />
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          </button>
        </AuthField>
        <AuthFeedback message={formError} variant="error" />
        <AuthSubmitButton label="Crear cuenta" loadingLabel="Creando cuenta..." isSubmitting={isSubmitting} />
      </form>
    </AuthPageFrame>
  );
}
