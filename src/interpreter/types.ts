import type { ExecutionSnapshot } from '../types/snapshot';

export type WorkerRequest = {
  source: string;
};

export type WorkerResult =
  | { type: 'trace'; trace: ExecutionSnapshot[] }
  | { type: 'error'; message: string; partialTrace: ExecutionSnapshot[] };
