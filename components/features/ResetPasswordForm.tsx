'use client';

import { useState, type FormEvent } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react';
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
import { updatePasswordSchema } from '@/lib/auth/schemas';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

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
    setError('');
    setFieldErrors({});
    setSuccessMessage('');

    const validation = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(FORM_VALIDATION_MESSAGE);
      setFieldErrors(readAuthValidationErrors(validation.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json() as AuthApiPayload;

      if (!response.ok) {
        const apiError = readAuthApiError(data, 'No pudimos actualizar la contraseña.');
        setError(apiError.message);
        setFieldErrors(apiError.fields);
        return;
      }

      setSuccessMessage(data.message ?? 'Contraseña actualizada.');
      setStatusMessage('Cambio completado.');
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageFrame
      title="Nueva contraseña"
      description="Elegí una contraseña segura para tu cuenta."
      note="Usá al menos 8 caracteres y repetila para confirmar el cambio."
      footer={<a href="/login">Volver a iniciar sesión</a>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthField id="new-password" label="Nueva contraseña" icon={LockIcon} error={fieldErrors.password}>
          <input
            id="new-password"
            name="password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); clearFieldError('password'); setError(''); }}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'new-password-error' : undefined}
          />
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setShowPasswords((visible) => !visible)}
            aria-label={showPasswords ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPasswords ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          </button>
        </AuthField>
        <AuthField id="confirm-password" label="Repetí la contraseña" icon={LockIcon} error={fieldErrors.confirmPassword}>
          <input
            id="confirm-password"
            name="confirmPassword"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => { setConfirmPassword(event.target.value); clearFieldError('confirmPassword'); setError(''); }}
            placeholder="Repetí tu contraseña"
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
          />
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setShowPasswords((visible) => !visible)}
            aria-label={showPasswords ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPasswords ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          </button>
        </AuthField>
        <AuthFeedback message={error} variant="error" />
        <AuthFeedback message={successMessage} variant="success" />
        <AuthSubmitButton label="Actualizar contraseña" loadingLabel="Actualizando contraseña..." isSubmitting={isSubmitting} />
      </form>
    </AuthPageFrame>
  );
}
