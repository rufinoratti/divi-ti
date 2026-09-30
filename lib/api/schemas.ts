import { z } from 'zod';
import { toCurrencyCents } from '@/lib/ledger';

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

export const groupJoinCodeSchema = z.object({
  code: z
    .string({ message: 'Pegá el código del grupo.' })
    .trim()
    .min(1, 'Pegá el código del grupo.')
    .max(32, 'El código del grupo no es válido.')
    .transform((value) => value.toUpperCase().replace(/[\s-]/g, ''))
    .refine((value) => /^[A-F0-9]{12}$/.test(value), 'El código del grupo debe tener 12 caracteres.'),
});

export const createSettlementSchema = z.object({
  groupId: uuid,
  movementId: uuid,
  fromMemberId: uuid,
  toMemberId: uuid,
  amount: z
    .number({ message: 'El importe debe ser un número.' })
    .finite('El importe debe ser un número válido.')
    .positive('El importe debe ser mayor a cero.')
    .max(999999999999.99, 'El importe es demasiado grande.')
    .refine((value) => toCurrencyCents(value) > 0, 'El importe mínimo es $0,01.'),
}).refine((value) => value.fromMemberId !== value.toMemberId, {
  path: ['toMemberId'],
  message: 'El pago debe ser entre dos integrantes distintos.',
});

export const resolveSettlementSchema = z.object({
  settlementId: uuid,
  action: z.enum(['confirm', 'reject']),
});

export const markNotificationsReadSchema = z.object({}).strict();

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
const divisionMethod = z.enum(['equal', 'consumption', 'income']);

export const profileIncomeSchema = z.object({
  income: z.number().finite().positive().max(999999999999.99).nullable(),
}).strict().superRefine((values, context) => {
  if (values.income !== null && toCurrencyCents(values.income) < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['income'],
      message: 'El ingreso mensual mínimo es $0,01.',
    });
  }
});

export const incomeSplitPreviewSchema = z.object({
  groupId: uuid,
  amount: z.number().finite().positive().max(999999999999.99),
  participants: z.array(uuid).min(1).max(100).refine((values) => new Set(values).size === values.length, 'No repitas participantes.'),
}).superRefine((values, context) => {
  if (toCurrencyCents(values.amount) < values.participants.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'El importe debe alcanzar para asignar al menos un centavo a cada participante.',
    });
  }
});

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
    divisionMethod: divisionMethod.optional(),
    paidBy: uuid,
    recipient: uuid.optional().nullable(),
    participants: z
      .array(uuid)
      .max(100, 'Un gasto no puede tener más de 100 participantes.')
      .refine((values) => new Set(values).size === values.length, 'No repitas participantes.'),
    participantShares: z.record(uuid, z.number().finite().positive().max(999999999999.99)).optional(),
  })
  .superRefine((values, context) => {
    const amountCents = toCurrencyCents(values.amount);
    if (amountCents < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'El importe mínimo es $0,01.',
      });
    }

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
      const method = values.divisionMethod ?? 'equal';
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

      if (method === 'equal' && amountCents < values.participants.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'El importe debe alcanzar para asignar al menos un centavo a cada participante.',
        });
      }

      if (values.recipient) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['recipient'],
          message: 'Un gasto no puede tener receptor individual.',
        });
      }

      if (method === 'consumption') {
        const participantIds = new Set(values.participants);
        const shareIds = Object.keys(values.participantShares ?? {});
        const shareTotalCents = shareIds.reduce(
          (sum, memberId) => sum + toCurrencyCents(values.participantShares?.[memberId] ?? 0),
          0,
        );
        if (shareIds.length !== participantIds.size || shareIds.some((memberId) => !participantIds.has(memberId))) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['participantShares'],
            message: 'Ingresá la parte de cada persona seleccionada.',
          });
        } else if (shareTotalCents !== amountCents) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['participantShares'],
            message: 'Las partes deben sumar exactamente el importe total.',
          });
        }
      } else if (values.participantShares) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['participantShares'],
          message: 'Este método calcula las partes automáticamente.',
        });
      }
    }
  });
