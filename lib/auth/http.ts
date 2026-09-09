import { NextResponse } from 'next/server';
import type { Session, User } from '@supabase/supabase-js';
import type { ZodError } from 'zod';

export async function readJson(request: Request) {
  try {
    return { data: await request.json() as unknown };
  } catch {
    return {
      response: errorResponse(
        'INVALID_JSON',
        'El cuerpo de la solicitud no es válido.',
        400,
      ),
    };
  }
}

export function validationResponse(error: ZodError) {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'formulario';
    fields[field] ??= [];
    fields[field].push(issue.message);
  }

  return errorResponse(
    'VALIDATION_ERROR',
    'Revisá los datos ingresados.',
    400,
    fields,
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    },
    { status },
  );
}

export function translateAuthError(message: string, fallback: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'El email o la contraseña son incorrectos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirmá tu email antes de iniciar sesión.';
  }

  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con ese email.';
  }

  if (normalized.includes('password')) {
    return 'La contraseña no cumple con los requisitos configurados.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
  }

  return fallback;
}

export function authErrorResponse(
  error: unknown,
  status: number,
  fallback: string,
) {
  const message = error instanceof Error ? error.message : '';
  return errorResponse(
    'AUTH_ERROR',
    translateAuthError(message, fallback),
    status,
  );
}

export function configurationErrorResponse() {
  return errorResponse(
    'CONFIGURATION_ERROR',
    'El servicio de autenticación no está configurado todavía.',
    503,
  );
}

export function internalErrorResponse() {
  return errorResponse(
    'INTERNAL_ERROR',
    'Ocurrió un error inesperado. Probá de nuevo en unos instantes.',
    500,
  );
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export function serializeSession(session: Session | null) {
  if (!session) return null;

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
}

export function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
