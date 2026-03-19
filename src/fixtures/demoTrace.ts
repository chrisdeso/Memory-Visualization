import type { ExecutionSnapshot } from '../types/snapshot';

/**
 * Hand-crafted fixture trace modeling a simple C program:
 *
 *   int main() {
 *     int x = 42;
 *     int *p = malloc(16);
 *     *p = 100;
 *     free(p);
 *     return 0;
 *   }
 */
export const demoTrace: ExecutionSnapshot[] = [
  {
    step: 0,
    lineNumber: 1,
    description: 'Program starts',
    stack: [],
    heap: [],
    pointers: [],
    registers: { pc: 1, sp: 0x7fffffff },
  },
  {
    step: 1,
    lineNumber: 3,
    description: 'main() called, int x = 42 declared on stack',
    stack: [
      {
        name: 'main',
        returnAddr: 0x7fff0000,
        locals: [
          { name: 'x', type: 'int', value: '42', address: 0x7fff0010 },
        ],
      },
    ],
    heap: [],
    pointers: [],
    registers: { pc: 3, sp: 0x7fff0000 },
  },
  {
    step: 2,
    lineNumber: 4,
    description: 'int *p = malloc(16) — heap block allocated',
    stack: [
      {
        name: 'main',
        returnAddr: 0x7fff0000,
        locals: [
          { name: 'x', type: 'int', value: '42', address: 0x7fff0010 },
          { name: 'p', type: 'int*', value: '0x20000000', address: 0x7fff0008 },
        ],
      },
    ],
    heap: [
      { address: 0x20000000, size: 16, status: 'allocated', label: 'p' },
    ],
    pointers: [
      { varAddress: 0x7fff0008, pointsToAddress: 0x20000000 },
    ],
    registers: { pc: 4, sp: 0x7fff0000 },
  },
  {
    step: 3,
    lineNumber: 5,
    description: '*p = 100 — heap value written',
    stack: [
      {
        name: 'main',
        returnAddr: 0x7fff0000,
        locals: [
          { name: 'x', type: 'int', value: '42', address: 0x7fff0010 },
          { name: 'p', type: 'int*', value: '0x20000000', address: 0x7fff0008 },
        ],
      },
    ],
    heap: [
      { address: 0x20000000, size: 16, status: 'allocated', label: 'p' },
    ],
    pointers: [
      { varAddress: 0x7fff0008, pointsToAddress: 0x20000000 },
    ],
    registers: { pc: 5, sp: 0x7fff0000 },
  },
  {
    step: 4,
    lineNumber: 6,
    description: 'free(p) — heap block deallocated',
    stack: [
      {
        name: 'main',
        returnAddr: 0x7fff0000,
        locals: [
          { name: 'x', type: 'int', value: '42', address: 0x7fff0010 },
          { name: 'p', type: 'int*', value: '0x20000000', address: 0x7fff0008 },
        ],
      },
    ],
    heap: [
      { address: 0x20000000, size: 16, status: 'freed', label: 'p' },
    ],
    pointers: [
      { varAddress: 0x7fff0008, pointsToAddress: 0x20000000 },
    ],
    registers: { pc: 6, sp: 0x7fff0000 },
  },
  {
    step: 5,
    lineNumber: 7,
    description: 'return 0 — main() exits, stack frame popped',
    stack: [],
    heap: [],
    pointers: [],
    registers: { pc: 7, sp: 0x7fffffff },
  },
];
