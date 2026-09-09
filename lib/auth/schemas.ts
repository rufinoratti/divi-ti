import { z } from 'zod';

const email = z
  .string({ message: 'Ingresá un email.' })
  .trim()
  .toLowerCase()
  .email('Ingresá un email válido.');

const signupPassword = z
  .string({ message: 'Ingresá una contraseña.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.');

const loginPassword = z
  .string({ message: 'Ingresá tu contraseña.' })
  .min(1, 'Ingresá tu contraseña.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.');

export const loginSchema = z.object({
  email,
  password: loginPassword,
});

export const signupSchema = z.object({
  name: z
    .string({ message: 'Ingresá tu nombre.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar los 80 caracteres.'),
  email,
  password: signupPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password: signupPassword,
    confirmPassword: signupPassword,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });
