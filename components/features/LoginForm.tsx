'use client';

import { useState, type FormEvent } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from 'lucide-react';
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
import { loginSchema } from '@/lib/auth/schemas';
import { type AuthSessionPayload } from '@/lib/auth/types';

interface LoginFormProps {
  onLogin: (session: AuthSessionPayload) => Promise<void> | void;
  error?: string;
}

export function LoginForm({ onLogin, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const callbackError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error') ?? ''
    : '';
  const [formError, setFormError] = useState(error ?? callbackError);
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

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setFormError(FORM_VALIDATION_MESSAGE);
      setFieldErrors(readAuthValidationErrors(validation.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await res.json() as AuthApiPayload & { session?: AuthSessionPayload };

      if (!res.ok || !data.session) {
        const apiError = readAuthApiError(data, 'No pudimos iniciar sesión.');
        setFormError(apiError.message);
        setFieldErrors(apiError.fields);
        return;
      }

      await onLogin(data.session);
    } catch {
      setFormError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageFrame
      title="Bienvenido a Divi"
      description="Iniciá sesión para volver a tus grupos y movimientos."
      note="Tu cuenta reúne los gastos que compartís con tu grupo."
      footer={(
        <>
          <p>¿No tenés cuenta? <a href="/signup">Creá una</a></p>
        </>
      )}
    >
      <form onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); setFormError(''); }}
            placeholder="Tu contraseña"
            required
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
        <div className="auth-form-utility">
          <a href="/forgot-password">¿Te olvidaste la contraseña?</a>
        </div>
        <AuthFeedback message={formError} variant="error" />
        <AuthSubmitButton label="Iniciar sesión" loadingLabel="Iniciando sesión..." isSubmitting={isSubmitting} />
      </form>
    </AuthPageFrame>
  );
}
