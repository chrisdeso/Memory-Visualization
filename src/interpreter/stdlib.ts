import type { Memory } from './memory';

// ─── StdVector ────────────────────────────────────────────────────────────────

export class StdVector {
  private elements: unknown[] = [];
  private heapAddress: number;
  private elementType: string;

  constructor(memory: Memory, elementType: string) {
    this.elementType = elementType;
    this.heapAddress = memory.allocHeap(32, `vector<${elementType}>`);
  }

  push_back(value: unknown): void {
    this.elements.push(value);
  }

  pop_back(): void {
    if (this.elements.length === 0) {
      throw new Error('pop_back on empty vector');
    }
    this.elements.pop();
  }

  at(index: number): unknown {
    if (index < 0 || index >= this.elements.length) {
      throw new Error(`vector::at: index ${index} out of range (size=${this.elements.length})`);
    }
    return this.elements[index];
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  'operator[]'(index: number): unknown {
    return this.elements[index];
  }

  size(): number {
    return this.elements.length;
  }

  empty(): boolean {
    return this.elements.length === 0;
  }

  clear(): void {
    this.elements = [];
  }

  front(): unknown {
    if (this.elements.length === 0) throw new Error('front on empty vector');
    return this.elements[0];
  }

  back(): unknown {
    if (this.elements.length === 0) throw new Error('back on empty vector');
    return this.elements[this.elements.length - 1];
  }

  getHeapAddress(): number {
    return this.heapAddress;
  }

  getSnapshot(): { size: number; elements: string[] } {
    return {
      size: this.elements.length,
      elements: this.elements.map(e => String(e)),
    };
  }

  destroy(memory: Memory): void {
    try {
      memory.freeHeap(this.heapAddress);
    } catch {
      // Already freed or invalid — ignore
    }
  }

  getElementType(): string {
    return this.elementType;
  }
}

// ─── StdString ────────────────────────────────────────────────────────────────

export class StdString {
  private data: string;
  private heapAddress: number;

  constructor(memory: Memory, initial: string = '') {
    this.data = initial;
    this.heapAddress = memory.allocHeap(initial.length + 1, 'string');
  }

  length(): number {
    return this.data.length;
  }

  size(): number {
    return this.data.length;
  }

  at(index: number): string {
    if (index < 0 || index >= this.data.length) {
      throw new Error(`string::at: index ${index} out of range`);
    }
    return this.data[index] ?? '';
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  'operator[]'(index: number): string {
    return this.data[index] ?? '';
  }

  c_str(): string {
    return this.data;
  }

  append(s: string): void {
    this.data += s;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  'operator+='(s: string): void {
    this.data += s;
  }

  substr(pos: number, len?: number): string {
    if (len === undefined) {
      return this.data.slice(pos);
    }
    return this.data.slice(pos, pos + len);
  }

  find(s: string): number {
    const idx = this.data.indexOf(s);
    return idx === -1 ? -1 : idx; // -1 as npos equivalent
  }

  empty(): boolean {
    return this.data.length === 0;
  }

  getHeapAddress(): number {
    return this.heapAddress;
  }

  toString(): string {
    return `"${this.data}"`;
  }

  getValue(): string {
    return this.data;
  }

  setValue(s: string): void {
    this.data = s;
  }

  destroy(memory: Memory): void {
    try {
      memory.freeHeap(this.heapAddress);
    } catch {
      // Already freed or invalid — ignore
    }
  }
}

// ─── StdArray ─────────────────────────────────────────────────────────────────

export class StdArray {
  private elements: unknown[];
  private fixedSize: number;

  constructor(size: number, _elementType: string) {
    this.fixedSize = size;
    this.elements = new Array(size).fill(0);
  }

  at(index: number): unknown {
    if (index < 0 || index >= this.fixedSize) {
      throw new Error(`array::at: index ${index} out of range (size=${this.fixedSize})`);
    }
    return this.elements[index];
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  'operator[]'(index: number): unknown {
    return this.elements[index];
  }

  set(index: number, value: unknown): void {
    if (index >= 0 && index < this.fixedSize) {
      this.elements[index] = value;
    }
  }

  size(): number {
    return this.fixedSize;
  }

  fill(value: unknown): void {
    this.elements = new Array(this.fixedSize).fill(value);
  }

  front(): unknown {
    if (this.fixedSize === 0) throw new Error('front on empty array');
    return this.elements[0];
  }

  back(): unknown {
    if (this.fixedSize === 0) throw new Error('back on empty array');
    return this.elements[this.fixedSize - 1];
  }

  getSnapshot(): { size: number; elements: string[] } {
    return {
      size: this.fixedSize,
      elements: this.elements.map(e => String(e)),
    };
  }
}

// ─── StdLib Facade ────────────────────────────────────────────────────────────

export class StdLib {
  static isStdType(typeName: string): boolean {
    return ['vector', 'string', 'array'].includes(typeName);
  }

  static createInstance(
    typeName: string,
    memory: Memory,
    args: unknown[]
  ): StdVector | StdString | StdArray {
    switch (typeName) {
      case 'vector':
        return new StdVector(memory, (args[0] as string) ?? 'int');
      case 'string':
        return new StdString(memory, (args[0] as string) ?? '');
      case 'array':
        return new StdArray((args[0] as number) ?? 0, (args[1] as string) ?? 'int');
      default:
        throw new Error(`Unknown STL type: ${typeName}`);
    }
  }

  static callMethod(
    obj: StdVector | StdString | StdArray,
    method: string,
    args: unknown[],
    memory: Memory
  ): unknown {
    if (obj instanceof StdVector) {
      return StdLib.callVectorMethod(obj, method, args, memory);
    }
    if (obj instanceof StdString) {
      return StdLib.callStringMethod(obj, method, args, memory);
    }
    if (obj instanceof StdArray) {
      return StdLib.callArrayMethod(obj, method, args);
    }
    throw new Error(`Unknown STL object type`);
  }

  private static callVectorMethod(
    obj: StdVector,
    method: string,
    args: unknown[],
    memory: Memory
  ): unknown {
    switch (method) {
      case 'push_back':
        obj.push_back(args[0]);
        return undefined;
      case 'pop_back':
        obj.pop_back();
        return undefined;
      case 'at':
        return obj.at(args[0] as number);
      case 'size':
        return obj.size();
      case 'empty':
        return obj.empty() ? 1 : 0;
      case 'clear':
        obj.clear();
        return undefined;
      case 'front':
        return obj.front();
      case 'back':
        return obj.back();
      case 'destroy':
        obj.destroy(memory);
        return undefined;
      default:
        throw new Error(`Unknown vector method: ${method}`);
    }
  }

  private static callStringMethod(
    obj: StdString,
    method: string,
    args: unknown[],
    memory: Memory
  ): unknown {
    switch (method) {
      case 'length':
      case 'size':
        return obj.length();
      case 'at':
        return obj.at(args[0] as number);
      case 'c_str':
        return obj.c_str();
      case 'append':
        obj.append(args[0] as string);
        return undefined;
      case 'operator+=':
        obj['operator+='](args[0] as string);
        return undefined;
      case 'substr':
        return obj.substr(args[0] as number, args[1] as number | undefined);
      case 'find':
        return obj.find(args[0] as string);
      case 'empty':
        return obj.empty() ? 1 : 0;
      case 'destroy':
        obj.destroy(memory);
        return undefined;
      default:
        throw new Error(`Unknown string method: ${method}`);
    }
  }

  private static callArrayMethod(
    obj: StdArray,
    method: string,
    args: unknown[]
  ): unknown {
    switch (method) {
      case 'at':
        return obj.at(args[0] as number);
      case 'size':
        return obj.size();
      case 'fill':
        obj.fill(args[0]);
        return undefined;
      case 'front':
        return obj.front();
      case 'back':
        return obj.back();
      default:
        throw new Error(`Unknown array method: ${method}`);
    }
  }
}
