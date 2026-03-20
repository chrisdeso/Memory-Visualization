import { interpret } from './evaluator';
import type { WorkerRequest, WorkerResult } from './types';
import type { ExecutionSnapshot } from '../types/snapshot';

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  try {
    const trace = interpret(e.data.source);
    const result: WorkerResult = { type: 'trace', trace };
    self.postMessage(result);
  } catch (err: unknown) {
    const error = err as Error & { partialTrace?: ExecutionSnapshot[] };
    const result: WorkerResult = {
      type: 'error',
      message: error.message || 'Unknown interpreter error',
      partialTrace: error.partialTrace ?? [],
    };
    self.postMessage(result);
  }
};
