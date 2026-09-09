'use client';

import { useState, type FormEvent } from 'react';
import { MailIcon } from 'lucide-react';
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
import { forgotPasswordSchema } from '@/lib/auth/schemas';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldError('');
    setSuccessMessage('');

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      const validationFields = readAuthValidationErrors(validation.error);
      setError(FORM_VALIDATION_MESSAGE);
      setFieldError(validationFields.email ?? '');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });
      const data = await response.json() as AuthApiPayload;

      if (!response.ok) {
        const apiError = readAuthApiError(data, 'No pudimos procesar la solicitud.');
        setError(apiError.message);
        setFieldError(apiError.fields.email ?? '');
        return;
      }

      setSuccessMessage(data.message ?? 'Revisá tu email para continuar.');
    } catch {
      setError(CONNECTION_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageFrame
      title="Recuperar contraseña"
      description="Te vamos a enviar un enlace para crear una nueva."
      note="Usá el email asociado a tu cuenta de Divi."
      footer={<a href="/login">Volver a iniciar sesión</a>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthField id="recovery-email" label="Email" icon={MailIcon} error={fieldError}>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setFieldError(''); setError(''); }}
            placeholder="tu@email.com"
            required
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'recovery-email-error' : undefined}
          />
        </AuthField>
        <AuthFeedback message={error} variant="error" />
        <AuthFeedback message={successMessage} variant="success" />
        <AuthSubmitButton label="Enviar enlace" loadingLabel="Enviando enlace..." isSubmitting={isSubmitting} />
      </form>
    </AuthPageFrame>
  );
}
