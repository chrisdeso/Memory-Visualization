export interface LocalVar {
  name: string;
  type: string;
  value: string;
  address: number;
}

export interface StackFrame {
  name: string;
  returnAddr: number;
  locals: LocalVar[];
}

export interface HeapBlock {
  address: number;
  size: number;
  status: 'allocated' | 'freed' | 'leaked';
  label?: string;
}

export interface PointerLink {
  varAddress: number;
  pointsToAddress: number;
}

export interface Registers {
  pc: number;
  sp: number;
}

export interface ExecutionSnapshot {
  step: number;
  lineNumber: number;
  description: string;
  stack: StackFrame[];
  heap: HeapBlock[];
  pointers: PointerLink[];
  registers: Registers;
}
