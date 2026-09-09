import { z } from 'zod';

const uuid = z.string().uuid('El identificador no es válido.');

export const groupIdQuerySchema = z.object({
  group_id: uuid,
});

export const createGroupSchema = z.object({
  name: z
    .string({ message: 'Ingresá un nombre para el grupo.' })
    .trim()
    .min(2, 'El nombre del grupo debe tener al menos 2 caracteres.')
    .max(80, 'El nombre del grupo no puede superar los 80 caracteres.'),
  memberName: z
    .string()
    .trim()
    .min(2, 'El nombre del integrante debe tener al menos 2 caracteres.')
    .max(80, 'El nombre del integrante no puede superar los 80 caracteres.')
    .optional(),
});

export const createMemberSchema = z.object({
  groupId: uuid,
  name: z
    .string({ message: 'Ingresá el nombre del integrante.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar los 80 caracteres.'),
  initials: z
    .string({ message: 'Ingresá las iniciales del integrante.' })
    .trim()
    .min(1, 'Las iniciales no pueden estar vacías.')
    .max(4, 'Las iniciales no pueden superar 4 caracteres.'),
  userId: uuid.optional().nullable(),
});

const invitationEmail = z
  .string({ message: 'Ingresá el email de la persona invitada.' })
  .trim()
  .toLowerCase()
  .email('Ingresá un email válido.');

export const createInvitationSchema = z.object({
  groupId: uuid,
  email: invitationEmail,
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar los 80 caracteres.')
    .optional(),
});

export const invitationTokenSchema = z.object({
  token: z
    .string({ message: 'El enlace de invitación no es válido.' })
    .trim()
    .min(20, 'El enlace de invitación no es válido.')
    .max(200, 'El enlace de invitación no es válido.'),
});

const movementKind = z.enum(['expense', 'loan']);
const movementCategory = z.enum(['Alquiler', 'Comida', 'Transporte', 'Compras', 'Otros', 'Préstamo']);

export const createMovementSchema = z
  .object({
    groupId: uuid,
    kind: movementKind,
    description: z
      .string({ message: 'Ingresá una descripción.' })
      .trim()
      .min(1, 'La descripción no puede estar vacía.')
      .max(160, 'La descripción no puede superar los 160 caracteres.'),
    amount: z
      .number({ message: 'El importe debe ser un número.' })
      .finite('El importe debe ser un número válido.')
      .positive('El importe debe ser mayor a cero.')
      .max(999999999999.99, 'El importe es demasiado grande.'),
    category: movementCategory,
    paidBy: uuid,
    recipient: uuid.optional().nullable(),
    participants: z
      .array(uuid)
      .max(100, 'Un gasto no puede tener más de 100 participantes.')
      .refine((values) => new Set(values).size === values.length, 'No repitas participantes.'),
  })
  .superRefine((values, context) => {
    if (values.kind === 'loan') {
      if (!values.recipient) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipient'],
          message: 'Elegí quién recibe el préstamo.',
        });
      } else if (values.recipient === values.paidBy) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipient'],
          message: 'El receptor debe ser distinto de quien presta.',
        });
      }

      if (values.category !== 'Préstamo') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Un préstamo debe usar la categoría Préstamo.',
        });
      }

      if (values.participants.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['participants'],
          message: 'Un préstamo no tiene participantes grupales.',
        });
      }
    }

    if (values.kind === 'expense') {
      if (values.category === 'Préstamo') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category'],
          message: 'Un gasto necesita una categoría de gasto.',
        });
      }

      if (values.participants.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['participants'],
          message: 'Elegí al menos un participante.',
        });
      }

      if (values.recipient) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipient'],
          message: 'Un gasto no puede tener receptor individual.',
        });
      }
    }
  });

export const updateMovementSchema = z.object({ movementId: uuid }).and(createMovementSchema);
