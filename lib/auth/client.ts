export type AuthApiError = {
  message?: string;
  fields?: Record<string, string[]>;
};

export type AuthApiPayload = {
  error?: AuthApiError | string;
  message?: string;
};

export function readAuthApiError(
  payload: AuthApiPayload,
  fallback: string,
): { message: string; fields: Record<string, string> } {
  const error = payload.error;

  if (typeof error === 'string') {
    return { message: error, fields: {} };
  }

  return {
    message: error?.message ?? payload.message ?? fallback,
    fields: Object.fromEntries(
      Object.entries(error?.fields ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
    ),
  };
}

export function readAuthValidationErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}) {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.') || 'formulario';
    fields[field] ??= issue.message;
  }

  return fields;
}

export const CONNECTION_ERROR_MESSAGE =
  'No pudimos comunicarnos con Divi. Revisá tu conexión y volvé a intentar.';

export const FORM_VALIDATION_MESSAGE = 'Hay datos para revisar antes de continuar.';
