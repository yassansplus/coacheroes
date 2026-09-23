import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { TrainingProgram } from '@/services/trainingProgram';

type ProgramCache = { sequence: number; program: TrainingProgram | null };

const memory = new Map<string, ProgramCache>();
const loads = new Map<string, Promise<ProgramCache>>();
const writes = new Map<string, Promise<void>>();

const cacheKey = (userId: string, slot: number) => `training-program-v1-${userId}-${slot}`;
const cachePath = (userId: string, slot: number) => `${FileSystem.documentDirectory}${cacheKey(userId, slot)}.json`;

export function readTrainingProgramCache(userId: string): Promise<ProgramCache> {
  const cached = memory.get(userId);
  if (cached) return Promise.resolve(cached);
  const pending = loads.get(userId);
  if (pending) return pending;
  const loading = loadTrainingProgramCache(userId).finally(() => loads.delete(userId));
  loads.set(userId, loading);
  return loading;
}

async function loadTrainingProgramCache(userId: string): Promise<ProgramCache> {
  const candidates = await Promise.all([0, 1].map(async slot => {
    try {
      const raw = Platform.OS === 'web'
        ? localStorage.getItem(cacheKey(userId, slot))
        : await FileSystem.readAsStringAsync(cachePath(userId, slot));
      const value = JSON.parse(raw ?? 'null') as ProgramCache | null;
      return value && Number.isInteger(value.sequence) && 'program' in value ? value : null;
    } catch { return null; }
  }));
  const value = candidates.filter((candidate): candidate is ProgramCache => candidate !== null)
    .sort((a, b) => b.sequence - a.sequence)[0] ?? { sequence: 0, program: null };
  memory.set(userId, value);
  return value;
}

export function writeTrainingProgramCache(userId: string, program: TrainingProgram | null): Promise<void> {
  const pending = (writes.get(userId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const current = await readTrainingProgramCache(userId);
    const next = { sequence: current.sequence + 1, program };
    const raw = JSON.stringify(next);
    const slot = next.sequence % 2;
    if (Platform.OS === 'web') localStorage.setItem(cacheKey(userId, slot), raw);
    else await FileSystem.writeAsStringAsync(cachePath(userId, slot), raw);
    memory.set(userId, next);
  });
  writes.set(userId, pending);
  return pending;
}
