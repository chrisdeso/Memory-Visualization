import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkerResult } from './types';
import type { ExecutionSnapshot } from '../types/snapshot';

// ─── Helper: build a minimal ExecutionSnapshot for testing ───────────────────

function makeSnapshot(step: number): ExecutionSnapshot {
  return {
    step,
    lineNumber: 1,
    description: `Step ${step}`,
    stack: [],
    heap: [],
    pointers: [],
    registers: { pc: 0, sp: 0 },
  };
}

// ─── Handler logic extracted from worker.ts for testability ──────────────────
// (Matches the exact logic in worker.ts — tested without instantiating a Worker)

function handleMessage(
  source: string,
  interpretFn: (src: string) => ExecutionSnapshot[]
): WorkerResult {
  try {
    const trace = interpretFn(source);
    return { type: 'trace', trace };
  } catch (err: unknown) {
    const error = err as Error & { partialTrace?: ExecutionSnapshot[] };
    return {
      type: 'error',
      message: error.message || 'Unknown interpreter error',
      partialTrace: error.partialTrace ?? [],
    };
  }
}

// ─── App-side timeout simulation ─────────────────────────────────────────────

interface MockWorker {
  terminate: () => void;
  postMessage: (data: unknown) => void;
  onmessage: ((e: MessageEvent<WorkerResult>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  _terminateMock: ReturnType<typeof vi.fn>;
  _postMessageMock: ReturnType<typeof vi.fn>;
}

function makeMockWorker(): MockWorker {
  const terminateMock = vi.fn();
  const postMessageMock = vi.fn();
  const worker: MockWorker = {
    terminate: terminateMock,
    postMessage: postMessageMock,
    onmessage: null,
    onerror: null,
    _terminateMock: terminateMock,
    _postMessageMock: postMessageMock,
  };
  return worker;
}

const WORKER_TIMEOUT_MS = 5000;

function runProgramWithWorker(
  worker: MockWorker,
  source: string,
  onResult: (result: WorkerResult) => void,
  onTimeout: () => void
): ReturnType<typeof setTimeout> {
  let terminated = false;

  const timer = setTimeout(() => {
    terminated = true;
    worker.terminate();
    onTimeout();
  }, WORKER_TIMEOUT_MS);

  worker.onmessage = (e: MessageEvent<WorkerResult>) => {
    if (terminated) return;
    clearTimeout(timer);
    worker.terminate();
    onResult(e.data);
  };

  worker.postMessage({ source });
  return timer;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Worker protocol: handler logic', () => {
  it('valid source produces trace result', () => {
    const expectedTrace = [makeSnapshot(0), makeSnapshot(1)];
    const mockInterpret = vi.fn<(src: string) => ExecutionSnapshot[]>().mockReturnValue(expectedTrace);

    const result = handleMessage('int main() { return 0; }', mockInterpret);

    expect(result.type).toBe('trace');
    if (result.type === 'trace') {
      expect(result.trace).toEqual(expectedTrace);
    }
    expect(mockInterpret).toHaveBeenCalledWith('int main() { return 0; }');
  });

  it('source that throws produces error result with partialTrace', () => {
    const partial = [makeSnapshot(0)];
    const mockInterpret = vi.fn<(src: string) => ExecutionSnapshot[]>().mockImplementation(() => {
      const err = new Error('divide by zero') as Error & { partialTrace?: ExecutionSnapshot[] };
      err.partialTrace = partial;
      throw err;
    });

    const result = handleMessage('bad source', mockInterpret);

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('divide by zero');
      expect(result.partialTrace).toEqual(partial);
    }
  });

  it('source that throws without partialTrace defaults to empty array', () => {
    const mockInterpret = vi.fn<(src: string) => ExecutionSnapshot[]>().mockImplementation(() => {
      throw new Error('syntax error');
    });

    const result = handleMessage('bad source', mockInterpret);

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('syntax error');
      expect(result.partialTrace).toEqual([]);
    }
  });

  it('error with no message falls back to Unknown interpreter error', () => {
    const mockInterpret = vi.fn<(src: string) => ExecutionSnapshot[]>().mockImplementation(() => {
      const err = new Error('');
      err.message = '';
      throw err;
    });

    const result = handleMessage('source', mockInterpret);

    expect(result.type).toBe('error');
    if (result.type === 'error') {
      expect(result.message).toBe('Unknown interpreter error');
    }
  });
});

describe('Worker protocol: App-side timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('timeout fires and terminates worker when no response arrives', () => {
    const worker = makeMockWorker();
    const onResult = vi.fn();
    const onTimeout = vi.fn();

    runProgramWithWorker(worker, 'infinite loop source', onResult, onTimeout);

    // Worker has been sent the message
    expect(worker._postMessageMock).toHaveBeenCalledWith({ source: 'infinite loop source' });
    // Timeout not yet fired
    expect(worker._terminateMock).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance time past the timeout
    vi.advanceTimersByTime(WORKER_TIMEOUT_MS + 1);

    expect(worker._terminateMock).toHaveBeenCalledOnce();
    expect(onTimeout).toHaveBeenCalledOnce();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('result received before timeout clears timer and terminates worker', () => {
    const worker = makeMockWorker();
    const onResult = vi.fn();
    const onTimeout = vi.fn();
    const trace = [makeSnapshot(0)];
    const fakeEvent = { data: { type: 'trace', trace } } as unknown as MessageEvent<WorkerResult>;

    runProgramWithWorker(worker, 'valid source', onResult, onTimeout);

    // Simulate worker sending result back before timeout
    worker.onmessage?.(fakeEvent);

    // Timer was cleared — should NOT fire after advancing time
    vi.advanceTimersByTime(WORKER_TIMEOUT_MS + 1);

    expect(worker._terminateMock).toHaveBeenCalledOnce();
    expect(onResult).toHaveBeenCalledWith({ type: 'trace', trace });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('message received after terminate is discarded', () => {
    const worker = makeMockWorker();
    const onResult = vi.fn();
    const onTimeout = vi.fn();
    const fakeEvent = { data: { type: 'trace', trace: [] } } as unknown as MessageEvent<WorkerResult>;

    runProgramWithWorker(worker, 'slow source', onResult, onTimeout);

    // Fire the timeout
    vi.advanceTimersByTime(WORKER_TIMEOUT_MS + 1);
    expect(onTimeout).toHaveBeenCalledOnce();

    // Worker sends a late message — should be ignored
    worker.onmessage?.(fakeEvent);

    expect(onResult).not.toHaveBeenCalled();
  });
});

describe('WorkerResult discriminated union type safety', () => {
  it('trace result has trace property', () => {
    const trace = [makeSnapshot(0)];
    const result: WorkerResult = { type: 'trace', trace };

    // TypeScript discriminated union — type narrows correctly
    if (result.type === 'trace') {
      expect(result.trace).toBeDefined();
      expect(Array.isArray(result.trace)).toBe(true);
    } else {
      // Should not reach here
      expect.fail('Expected trace result');
    }
  });

  it('error result has message and partialTrace properties', () => {
    const partialTrace = [makeSnapshot(0)];
    const result: WorkerResult = { type: 'error', message: 'runtime error', partialTrace };

    if (result.type === 'error') {
      expect(result.message).toBe('runtime error');
      expect(result.partialTrace).toEqual(partialTrace);
    } else {
      expect.fail('Expected error result');
    }
  });
});
