import { z } from 'zod';

export const idSchema = z.uuid();
export const tokenSchema = z.uuid();
export const createGroupSchema = z.strictObject({ requestId: z.uuid(), name: z.string().trim().min(2).max(60) });
export const renameGroupSchema = z.strictObject({ requestId: z.uuid(), revision: z.number().int().positive(), name: z.string().trim().min(2).max(60) });
export const inviteSchema = z.strictObject({ token: tokenSchema, kind: z.enum(['friend', 'group']), groupId: z.uuid().optional() })
  .refine(value => (value.kind === 'group') === Boolean(value.groupId), 'Choisis un groupe pour cette invitation.');
export const decisionSchema = z.strictObject({ accept: z.boolean() });
export const preferenceSchema = z.strictObject({ requestId: z.uuid(), revision: z.number().int().nonnegative(), shareActivity: z.boolean(), shareRecords: z.boolean() });
export const challengeSchema = z.strictObject({ requestId: z.uuid(), title: z.string().trim().min(2).max(80), targetSessions: z.number().int().min(1).max(1000), durationDays: z.union([z.literal(7), z.literal(14)]) });
export const transferSchema = z.strictObject({ requestId: z.uuid(), userId: z.uuid() });
export const actionSchema = z.strictObject({ requestId: z.uuid() });
