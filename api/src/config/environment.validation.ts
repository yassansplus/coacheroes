import { aiContexts, resolveAiModel, type AiContext } from './ai-models';

type Environment = Record<string, string | number | boolean | undefined>;

const required = [
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
] as const;

function readPort(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined || value === '') return fallback;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return port;
}

function readBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either true or false.`);
}

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const environment = config as Record<string, string | undefined>;
  const missing = required.filter((key) => !environment[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const context of Object.keys(aiContexts) as AiContext[]) {
    resolveAiModel(context, environment[aiContexts[context].variable]);
  }

  return {
    ...environment,
    NODE_ENV: environment.NODE_ENV ?? 'development',
    PORT: readPort(environment.PORT, 'PORT', 3000),
    CORS_ORIGIN: environment.CORS_ORIGIN ?? '*',
    DATABASE_PORT: readPort(environment.DATABASE_PORT, 'DATABASE_PORT', 5432),
    DATABASE_SYNCHRONIZE: readBoolean(
      environment.DATABASE_SYNCHRONIZE,
      'DATABASE_SYNCHRONIZE',
    ),
    DATABASE_MIGRATIONS_RUN: readBoolean(
      environment.DATABASE_MIGRATIONS_RUN,
      'DATABASE_MIGRATIONS_RUN',
    ),
  };
}
