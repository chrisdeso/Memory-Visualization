import { parse } from './parser';
import { Memory } from './memory';
import type { ExecutionSnapshot } from '../types/snapshot';
import type {
  ASTNode,
  FunctionDecl,
  ClassDecl,
  VarDecl,
  ArrayDecl,
  Assignment,
  CompoundAssignment,
  BinaryExpr,
  UnaryExpr,
  CallExpr,
  IfStmt,
  WhileStmt,
  ForStmt,
  ReturnStmt,
  DeleteExpr,
  BlockStmt,
  ExpressionStmt,
  BreakStmt,
  ContinueStmt,
  CastExpr,
  SizeofExpr,
  IdentifierNode,
  IntLiteralNode,
  FloatLiteralNode,
  StringLiteralNode,
  CharLiteralNode,
  BoolLiteralNode,
  ArrayAccess,
  MemberExpr,
  NewExpr,
  TypeNode,
} from './ast';
import { StdLib, StdVector, StdString, StdArray } from './stdlib';

// ─── Class Instance Runtime Type ──────────────────────────────────────────────

interface ClassInstance {
  className: string;
  address: number;
  members: Map<string, number>;  // member name -> address
  isHeap: boolean;
}

// ─── Signal Classes ───────────────────────────────────────────────────────────

class ReturnSignal {
  constructor(public value: unknown) {}
}

class BreakSignal {}
class ContinueSignal {}

// ─── Environment (scope chain) ────────────────────────────────────────────────

class Environment {
  private scopes: Map<string, number>[] = [];

  push(): void {
    this.scopes.push(new Map());
  }

  pop(): void {
    this.scopes.pop();
  }

  set(name: string, address: number): void {
    const scope = this.scopes[this.scopes.length - 1];
    if (scope) scope.set(name, address);
  }

  get(name: string): number | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const addr = this.scopes[i]?.get(name);
      if (addr !== undefined) return addr;
    }
    return undefined;
  }
}

// ─── Eval Context ─────────────────────────────────────────────────────────────

interface EvalContext {
  memory: Memory;
  trace: ExecutionSnapshot[];
  stepCount: number;
  maxSteps: number;
  env: Environment;
  functions: Map<string, FunctionDecl>;
  classes: Map<string, ClassDecl>;
  classInstances: Map<number, ClassInstance>;  // address -> ClassInstance
  stlObjects: Map<number, StdVector | StdString | StdArray>;  // address -> STL object
  arrayBounds: Map<number, number>;  // base address -> element count
  currentLine: number;
}

// ─── Type Size Helper ─────────────────────────────────────────────────────────

function typeSizeOf(typeNode: TypeNode): number {
  if (typeNode.isPointer || typeNode.isReference) return 4;
  const sizes: Record<string, number> = {
    int: 4, float: 4, double: 8, char: 1, bool: 1, void: 0,
  };
  return sizes[typeNode.base] ?? 4;
}

function classSize(classDecl: ClassDecl): number {
  let total = 0;
  for (const member of classDecl.members) {
    if (member.decl.kind === 'VarDecl') {
      const field = member.decl as VarDecl;
      total += Math.max(typeSizeOf(field.varType), 4);
    }
  }
  return Math.max(total, 4);
}

function typeNodeToString(typeNode: TypeNode): string {
  let base = typeNode.base;
  if (typeNode.isPointer) base += '*';
  if (typeNode.isReference) base += '&';
  return base;
}

// ─── interpret() entry point ──────────────────────────────────────────────────

export function interpret(source: string): ExecutionSnapshot[] {
  const program = parse(source);
  const memory = new Memory();
  const ctx: EvalContext = {
    memory,
    trace: [],
    stepCount: 0,
    maxSteps: 50000,
    env: new Environment(),
    functions: new Map(),
    classes: new Map(),
    classInstances: new Map(),
    stlObjects: new Map(),
    arrayBounds: new Map(),
    currentLine: 1,
  };

  // First pass: collect all function and class declarations
  for (const node of program.body) {
    if (node.kind === 'FunctionDecl') {
      ctx.functions.set(node.name, node);
    }
    if (node.kind === 'ClassDecl') {
      ctx.classes.set(node.name, node);
      // Also register class member functions
      for (const member of node.members) {
        if (member.decl.kind === 'FunctionDecl') {
          const fn = member.decl;
          // Register as ClassName::methodName for internal use
          ctx.functions.set(`${node.name}::${fn.name}`, fn);
        }
      }
    }
  }

  // Find main
  const mainFn = ctx.functions.get('main');
  if (!mainFn) {
    throw new Error('No main() function found');
  }

  try {
    evalFunction('main', [], ctx);
  } catch (err) {
    if (err instanceof ReturnSignal) {
      // Normal return from main
    } else {
      // Runtime error — attach partial trace
      const e = err as Error & { partialTrace?: ExecutionSnapshot[] };
      e.partialTrace = ctx.trace;
      throw e;
    }
  }

  // Mark leaks and push final snapshot
  ctx.memory.markLeaks();
  if (ctx.trace.length > 0) {
    const lastSnap = ctx.trace[ctx.trace.length - 1];
    const lastLine = lastSnap?.lineNumber ?? 1;
    ctx.trace.push(ctx.memory.captureSnapshot(
      ctx.stepCount++,
      lastLine,
      'Program complete',
      lastLine
    ));
  }

  return ctx.trace;
}

// ─── Function Evaluation ──────────────────────────────────────────────────────

function evalFunction(name: string, args: unknown[], ctx: EvalContext): unknown {
  const fn = ctx.functions.get(name);
  if (!fn) {
    throw new Error(`Undefined function: ${name}`);
  }

  const returnAddr = fn.line;
  ctx.memory.pushFrame(name, returnAddr);
  ctx.env.push();

  // Allocate parameters and store argument values
  for (let i = 0; i < fn.params.length; i++) {
    const param = fn.params[i];
    if (!param) continue;
    const size = typeSizeOf(param.type);
    const addr = ctx.memory.allocLocal(param.name, typeNodeToString(param.type), size);
    ctx.env.set(param.name, addr);
    const argVal = i < args.length ? args[i] : 0;
    ctx.memory.store(addr, argVal);
  }

  // Entry snapshot
  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    fn.line,
    `Enter ${name}()`,
    fn.line
  ));

  let returnValue: unknown = 0;
  try {
    evalBlock(fn.body, ctx);
  } catch (err) {
    if (err instanceof ReturnSignal) {
      returnValue = err.value;
    } else {
      ctx.env.pop();
      ctx.memory.popFrame();
      throw err;
    }
  }

  ctx.env.pop();
  ctx.memory.popFrame();
  return returnValue;
}

// ─── Block Evaluation ─────────────────────────────────────────────────────────

function evalBlock(block: BlockStmt, ctx: EvalContext): void {
  ctx.env.push();
  try {
    for (const stmt of block.body) {
      evalStatement(stmt, ctx);
    }
  } finally {
    ctx.env.pop();
  }
}

// ─── Statement Evaluation ─────────────────────────────────────────────────────

function evalStatement(node: ASTNode, ctx: EvalContext): void {
  if (ctx.stepCount >= ctx.maxSteps) {
    const e = new Error('Execution timed out: step limit exceeded') as Error & { partialTrace?: ExecutionSnapshot[] };
    e.partialTrace = ctx.trace;
    throw e;
  }

  switch (node.kind) {
    case 'VarDecl':
      evalVarDecl(node, ctx);
      break;
    case 'ArrayDecl':
      evalArrayDecl(node, ctx);
      break;
    case 'Assignment':
      evalAssignment(node, ctx);
      break;
    case 'CompoundAssignment':
      evalCompoundAssignment(node, ctx);
      break;
    case 'IfStmt':
      evalIfStmt(node, ctx);
      break;
    case 'WhileStmt':
      evalWhileStmt(node, ctx);
      break;
    case 'ForStmt':
      evalForStmt(node, ctx);
      break;
    case 'ReturnStmt':
      evalReturnStmt(node, ctx);
      break;
    case 'ExpressionStmt':
      evalExpressionStmt(node, ctx);
      break;
    case 'BlockStmt':
      evalBlock(node, ctx);
      break;
    case 'BreakStmt':
      evalBreakStmt(node, ctx);
      break;
    case 'ContinueStmt':
      evalContinueStmt(node, ctx);
      break;
    case 'IncludeDirective':
      // Skip — no-op
      break;
    default:
      // Unknown statement — skip
      break;
  }
}

// ─── Class Instance Helpers ───────────────────────────────────────────────────

function allocClassInstance(
  classDecl: ClassDecl,
  baseAddress: number,
  isHeap: boolean,
  ctx: EvalContext
): ClassInstance {
  const members = new Map<string, number>();
  let offset = 0;
  for (const member of classDecl.members) {
    if (member.decl.kind === 'VarDecl') {
      const field = member.decl as VarDecl;
      const fieldSize = typeSizeOf(field.varType);
      const fieldAddr = baseAddress + offset;
      members.set(field.name, fieldAddr);
      ctx.memory.store(fieldAddr, 0); // zero-initialize
      offset += Math.max(fieldSize, 4); // min alignment 4
    }
  }
  const instance: ClassInstance = {
    className: classDecl.name,
    address: baseAddress,
    members,
    isHeap,
  };
  ctx.classInstances.set(baseAddress, instance);
  return instance;
}

function invokeMethod(
  fn: FunctionDecl,
  instance: ClassInstance,
  args: unknown[],
  frameName: string,
  ctx: EvalContext
): unknown {
  const returnAddr = fn.line;
  ctx.memory.pushFrame(frameName, returnAddr);
  ctx.env.push();

  // Bind 'this' as a pseudo-variable pointing to the instance
  const thisAddr = ctx.memory.allocLocal('this', 'ptr', 4);
  ctx.env.set('this', thisAddr);
  ctx.memory.store(thisAddr, instance.address);

  // Make member variables directly accessible by name in scope
  for (const [memberName, memberAddr] of instance.members) {
    ctx.env.set(memberName, memberAddr);
  }

  // Bind parameters
  for (let i = 0; i < fn.params.length; i++) {
    const param = fn.params[i];
    if (!param) continue;
    const size = typeSizeOf(param.type);
    const addr = ctx.memory.allocLocal(param.name, typeNodeToString(param.type), size);
    ctx.env.set(param.name, addr);
    const argVal = i < args.length ? args[i] : 0;
    ctx.memory.store(addr, argVal);
  }

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    fn.line,
    `Enter ${frameName}`,
    fn.line
  ));

  let returnValue: unknown = undefined;
  try {
    evalBlock(fn.body, ctx);
  } catch (err) {
    if (err instanceof ReturnSignal) {
      returnValue = err.value;
    } else {
      ctx.env.pop();
      ctx.memory.popFrame();
      throw err;
    }
  }

  ctx.env.pop();
  ctx.memory.popFrame();
  return returnValue;
}

// ─── Specific Statement Handlers ─────────────────────────────────────────────

function evalVarDecl(node: VarDecl, ctx: EvalContext): void {
  const typeName = node.varType.base;

  // STL type: vector, string, array — store as STL object
  if (StdLib.isStdType(typeName) && !node.varType.isPointer) {
    const addr = ctx.memory.allocLocal(node.name, typeNodeToString(node.varType), 4);
    ctx.env.set(node.name, addr);

    let initialArg: unknown = '';
    // For string: check for "= string_literal" init
    if (typeName === 'string' && node.init !== undefined) {
      initialArg = evalExpr(node.init, ctx);
    }
    // For vector/array: templateParam provides element type
    const elementType = node.varType.templateParam ?? 'int';

    let stlObj: StdVector | StdString | StdArray;
    if (typeName === 'string') {
      stlObj = new StdString(ctx.memory, typeof initialArg === 'string' ? initialArg : '');
    } else if (typeName === 'vector') {
      stlObj = new StdVector(ctx.memory, elementType);
    } else {
      // array<T, N> — size from templateParam second component or default 0
      const parts = (node.varType.templateParam ?? '').split(',');
      const arrSize = parseInt(parts[1]?.trim() ?? '0', 10) || 0;
      stlObj = new StdArray(arrSize, elementType);
    }

    ctx.stlObjects.set(addr, stlObj);
    ctx.memory.store(addr, addr); // store self-address as sentinel

    // For string: display current value
    const displayVal = stlObj instanceof StdString ? stlObj.toString() : `${typeName}<${elementType}>`;
    ctx.trace.push(ctx.memory.captureSnapshot(
      ctx.stepCount++,
      node.line,
      `Declare ${node.name}: ${displayVal}`,
      node.line
    ));
    return;
  }

  // Class type (user-defined, non-pointer): stack allocation with constructor
  if (!node.varType.isPointer && ctx.classes.has(typeName)) {
    const classDecl = ctx.classes.get(typeName)!;
    let classSize = 0;
    for (const member of classDecl.members) {
      if (member.decl.kind === 'VarDecl') {
        const field = member.decl as VarDecl;
        classSize += Math.max(typeSizeOf(field.varType), 4);
      }
    }
    if (classSize === 0) classSize = 4;
    const addr = ctx.memory.allocLocal(node.name, typeName, classSize);
    ctx.env.set(node.name, addr);

    // Compute constructor args from init (CallExpr wrapping constructor args)
    const constructorArgs: unknown[] = [];
    if (node.init !== undefined && node.init.kind === 'CallExpr') {
      for (const arg of (node.init as CallExpr).args) {
        constructorArgs.push(evalExpr(arg, ctx));
      }
    }

    // Allocate instance (on "stack" — use the variable address as the base)
    const instance = allocClassInstance(classDecl, addr, false, ctx);
    ctx.memory.store(addr, addr); // store self-reference

    // Call constructor if it exists
    const ctorName = typeName;
    const ctorFn = ctx.functions.get(`${typeName}::${ctorName}`);
    if (ctorFn) {
      invokeMethod(ctorFn, instance, constructorArgs, `${typeName}::${ctorName}`, ctx);
    }

    ctx.trace.push(ctx.memory.captureSnapshot(
      ctx.stepCount++,
      node.line,
      `Declare ${node.name}: ${typeName}`,
      node.line
    ));
    return;
  }

  const size = typeSizeOf(node.varType);
  const addr = ctx.memory.allocLocal(node.name, typeNodeToString(node.varType), size);
  ctx.env.set(node.name, addr);

  let value: unknown = 0;
  if (node.init !== undefined) {
    value = evalExpr(node.init, ctx);
  }
  ctx.memory.store(addr, value);

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    `Declare ${node.name} = ${formatVal(value)}`,
    node.line
  ));
}

function evalArrayDecl(node: ArrayDecl, ctx: EvalContext): void {
  const sizeVal = evalExpr(node.size, ctx);
  const count = typeof sizeVal === 'number' ? sizeVal : 1;
  const elemSize = typeSizeOf(node.elementType);
  const totalSize = count * elemSize;

  const addr = ctx.memory.allocLocal(node.name, typeNodeToString(node.elementType) + '[]', totalSize);
  ctx.env.set(node.name, addr);
  ctx.arrayBounds.set(addr, count); // record bounds for out-of-bounds detection

  // Initialize elements
  if (node.init) {
    for (let i = 0; i < node.init.length; i++) {
      const initItem = node.init[i];
      if (!initItem) continue;
      const val = evalExpr(initItem, ctx);
      ctx.memory.store(addr + i * elemSize, val);
    }
  } else {
    for (let i = 0; i < count; i++) {
      ctx.memory.store(addr + i * elemSize, 0);
    }
  }

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    `Declare array ${node.name}[${count}]`,
    node.line
  ));
}

function evalAssignment(node: Assignment, ctx: EvalContext): void {
  const value = evalExpr(node.value, ctx);
  const addr = evalLValue(node.target, ctx);
  ctx.memory.store(addr, value);

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    `Assign = ${formatVal(value)}`,
    node.line
  ));
}

function evalCompoundAssignment(node: CompoundAssignment, ctx: EvalContext): void {
  const addr = evalLValue(node.target, ctx);

  // STL string += : delegate to StdString.append
  if (node.op === '+') {
    const stlObj = ctx.stlObjects.get(addr);
    if (stlObj instanceof StdString) {
      const rhs = evalExpr(node.value, ctx);
      stlObj.append(String(rhs));
      ctx.trace.push(ctx.memory.captureSnapshot(
        ctx.stepCount++,
        node.line,
        `string += "${formatVal(rhs)}"`,
        node.line
      ));
      return;
    }
  }

  const current = ctx.memory.load(addr) as number;
  const rhs = evalExpr(node.value, ctx) as number;
  let result: number;
  switch (node.op) {
    case '+': result = current + rhs; break;
    case '-': result = current - rhs; break;
    case '*': result = current * rhs; break;
    case '/':
      if (rhs === 0) throw runtimeError('Division by zero', ctx);
      result = Math.trunc(current / rhs);
      break;
    default: result = current; break;
  }
  ctx.memory.store(addr, result);

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    `${node.op}= ${formatVal(result)}`,
    node.line
  ));
}

function evalIfStmt(node: IfStmt, ctx: EvalContext): void {
  const cond = evalExpr(node.condition, ctx);
  if (isTruthy(cond)) {
    evalBlock(node.then, ctx);
  } else if (node.else !== undefined) {
    if (node.else.kind === 'BlockStmt') {
      evalBlock(node.else, ctx);
    } else {
      evalStatement(node.else, ctx);
    }
  }
}

function evalWhileStmt(node: WhileStmt, ctx: EvalContext): void {
  while (isTruthy(evalExpr(node.condition, ctx))) {
    if (ctx.stepCount >= ctx.maxSteps) {
      const e = new Error('Execution timed out: step limit exceeded') as Error & { partialTrace?: ExecutionSnapshot[] };
      e.partialTrace = ctx.trace;
      throw e;
    }
    try {
      evalBlock(node.body, ctx);
    } catch (err) {
      if (err instanceof BreakSignal) break;
      if (err instanceof ContinueSignal) continue;
      throw err;
    }
  }
}

function evalForStmt(node: ForStmt, ctx: EvalContext): void {
  ctx.env.push();
  try {
    if (node.init !== undefined) {
      evalStatement(node.init, ctx);
    }
    while (true) {
      if (ctx.stepCount >= ctx.maxSteps) {
        const e = new Error('Execution timed out: step limit exceeded') as Error & { partialTrace?: ExecutionSnapshot[] };
        e.partialTrace = ctx.trace;
        throw e;
      }
      if (node.condition !== undefined) {
        const cond = evalExpr(node.condition, ctx);
        if (!isTruthy(cond)) break;
      }
      try {
        evalBlock(node.body, ctx);
      } catch (err) {
        if (err instanceof BreakSignal) break;
        if (err instanceof ContinueSignal) {
          // Continue: still run update
        } else {
          throw err;
        }
      }
      if (node.update !== undefined) {
        evalExpr(node.update, ctx);
      }
    }
  } finally {
    ctx.env.pop();
  }
}

function evalReturnStmt(node: ReturnStmt, ctx: EvalContext): void {
  const value = node.value !== undefined ? evalExpr(node.value, ctx) : undefined;

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    `return ${formatVal(value)}`,
    node.line
  ));

  throw new ReturnSignal(value);
}

function evalExpressionStmt(node: ExpressionStmt, ctx: EvalContext): void {
  const value = evalExpr(node.expr, ctx);

  ctx.trace.push(ctx.memory.captureSnapshot(
    ctx.stepCount++,
    node.line,
    describeExpr(node.expr, value),
    node.line
  ));
}

function evalBreakStmt(_node: BreakStmt, _ctx: EvalContext): void {
  throw new BreakSignal();
}

function evalContinueStmt(_node: ContinueStmt, _ctx: EvalContext): void {
  throw new ContinueSignal();
}

// ─── Expression Evaluation ────────────────────────────────────────────────────

function evalExpr(node: ASTNode, ctx: EvalContext): unknown {
  switch (node.kind) {
    case 'IntLiteral':
      return (node as IntLiteralNode).value;
    case 'FloatLiteral':
      return (node as FloatLiteralNode).value;
    case 'BoolLiteral':
      return (node as { kind: 'BoolLiteral'; value: boolean }).value ? 1 : 0;
    case 'CharLiteral': {
      const ch = (node as CharLiteralNode).value;
      return ch.charCodeAt(0);
    }
    case 'StringLiteral':
      return (node as StringLiteralNode).value;
    case 'NullptrLiteral':
      return 0;
    case 'Identifier': {
      const id = node as IdentifierNode;
      // NULL / nullptr — C/C++ null pointer constants
      if (id.name === 'NULL' || id.name === 'nullptr') return 0;
      // std::cout, std::cerr, std::endl etc. are stream objects — treat as no-op sentinel
      if (id.name === 'std::cout' || id.name === 'std::cerr' || id.name === 'std::cin' || id.name === 'std::endl') {
        return 0;
      }
      const addr = ctx.env.get(id.name);
      if (addr === undefined) {
        throw runtimeError(`Undefined variable: ${id.name}`, ctx);
      }
      try {
        return ctx.memory.load(addr);
      } catch {
        return 0; // uninitialized — return 0
      }
    }
    case 'BinaryExpr':
      return evalBinaryExpr(node as BinaryExpr, ctx);
    case 'UnaryExpr':
      return evalUnaryExpr(node as UnaryExpr, ctx);
    case 'CallExpr':
      return evalCallExpr(node as CallExpr, ctx);
    case 'Assignment': {
      const asn = node as Assignment;
      const val = evalExpr(asn.value, ctx);
      const addr = evalLValue(asn.target, ctx);
      ctx.memory.store(addr, val);
      return val;
    }
    case 'CastExpr':
      return evalCastExpr(node as CastExpr, ctx);
    case 'SizeofExpr':
      return evalSizeofExpr(node as SizeofExpr, ctx);
    case 'NewExpr':
      return evalNewExpr(node as NewExpr, ctx);
    case 'DeleteExpr':
      evalDeleteExpr(node as DeleteExpr, ctx);
      return undefined;
    case 'ArrayAccess':
      return evalArrayAccess(node as ArrayAccess, ctx);
    case 'MemberExpr':
      return evalMemberExpr(node as MemberExpr, ctx);
    case 'CompoundAssignment': {
      const ca = node as CompoundAssignment;
      const addr = evalLValue(ca.target, ctx);
      const cur = ctx.memory.load(addr) as number;
      const rhs = evalExpr(ca.value, ctx) as number;
      let result: number;
      switch (ca.op) {
        case '+': result = cur + rhs; break;
        case '-': result = cur - rhs; break;
        case '*': result = cur * rhs; break;
        case '/':
          if (rhs === 0) throw runtimeError('Division by zero', ctx);
          result = Math.trunc(cur / rhs);
          break;
        default: result = cur; break;
      }
      ctx.memory.store(addr, result);
      return result;
    }
    default:
      return 0;
  }
}

function evalBinaryExpr(node: BinaryExpr, ctx: EvalContext): unknown {
  const left = evalExpr(node.left, ctx);
  const right = evalExpr(node.right, ctx);
  const l = toNumber(left);
  const r = toNumber(right);

  switch (node.op) {
    case '+': return l + r;
    case '-': return l - r;
    case '*': return l * r;
    case '/':
      if (r === 0) throw runtimeError('Division by zero', ctx);
      return Math.trunc(l / r);
    case '%':
      if (r === 0) throw runtimeError('Division by zero (modulo)', ctx);
      return l % r;
    case '==': return l === r ? 1 : 0;
    case '!=': return l !== r ? 1 : 0;
    case '<': return l < r ? 1 : 0;
    case '>': return l > r ? 1 : 0;
    case '<=': return l <= r ? 1 : 0;
    case '>=': return l >= r ? 1 : 0;
    case '&&': return (isTruthy(left) && isTruthy(right)) ? 1 : 0;
    case '||': return (isTruthy(left) || isTruthy(right)) ? 1 : 0;
    case '<<': return left; // stream insertion (std::cout << x) — no-op, return lhs
    case '>>': return left; // stream extraction (std::cin >> x) — no-op
    default: return 0;
  }
}

function evalUnaryExpr(node: UnaryExpr, ctx: EvalContext): unknown {
  switch (node.op) {
    case '!': return isTruthy(evalExpr(node.operand, ctx)) ? 0 : 1;
    case '-': return -toNumber(evalExpr(node.operand, ctx));
    case '+': return toNumber(evalExpr(node.operand, ctx));
    case '*': {
      // Dereference: load from pointed-to address
      const addr = toNumber(evalExpr(node.operand, ctx));
      try {
        return ctx.memory.load(addr);
      } catch {
        throw runtimeError(`Null pointer dereference or invalid memory access at 0x${addr.toString(16)}`, ctx);
      }
    }
    case '&': {
      // Address-of: return address from env
      if (node.operand.kind === 'Identifier') {
        const id = node.operand as IdentifierNode;
        const addr = ctx.env.get(id.name);
        if (addr === undefined) throw runtimeError(`Cannot take address of undefined: ${id.name}`, ctx);
        return addr;
      }
      return 0;
    }
    case '++': {
      const addr = evalLValue(node.operand, ctx);
      const val = toNumber(ctx.memory.load(addr));
      if (node.prefix) {
        ctx.memory.store(addr, val + 1);
        return val + 1;
      } else {
        ctx.memory.store(addr, val + 1);
        return val;
      }
    }
    case '--': {
      const addr = evalLValue(node.operand, ctx);
      const val = toNumber(ctx.memory.load(addr));
      if (node.prefix) {
        ctx.memory.store(addr, val - 1);
        return val - 1;
      } else {
        ctx.memory.store(addr, val - 1);
        return val;
      }
    }
    default: return evalExpr(node.operand, ctx);
  }
}

function evalCallExpr(node: CallExpr, ctx: EvalContext): unknown {
  // Method call: obj.method(args) or ptr->method(args)
  if (node.callee.kind === 'MemberExpr') {
    const mem = node.callee as MemberExpr;
    const methodName = mem.member;

    // Get the object address
    let objectAddr: number;
    if (mem.arrow) {
      objectAddr = toNumber(evalExpr(mem.object, ctx));
    } else {
      try {
        objectAddr = evalLValue(mem.object, ctx);
      } catch {
        objectAddr = toNumber(evalExpr(mem.object, ctx));
      }
    }

    // Evaluate method args
    const args = node.args.map(arg => evalExpr(arg, ctx));

    // STL method call
    const stlObj = ctx.stlObjects.get(objectAddr);
    if (stlObj) {
      // Handle += for string specially
      if (methodName === 'operator+=') {
        const result = StdLib.callMethod(stlObj, 'operator+=', args, ctx.memory);
        return result;
      }
      return StdLib.callMethod(stlObj, methodName, args, ctx.memory);
    }

    // Class instance method call
    const instance = ctx.classInstances.get(objectAddr);
    if (instance) {
      const methodFn = ctx.functions.get(`${instance.className}::${methodName}`);
      if (methodFn) {
        return invokeMethod(methodFn, instance, args, `${instance.className}::${methodName}`, ctx);
      }
      return 0;
    }

    // Fallback — unknown method
    return 0;
  }

  // Get function name
  let funcName: string;
  if (node.callee.kind === 'Identifier') {
    funcName = (node.callee as IdentifierNode).name;
  } else {
    return 0;
  }

  // Evaluate arguments
  const args = node.args.map(arg => evalExpr(arg, ctx));

  // Built-in functions
  switch (funcName) {
    case 'malloc': {
      const size = toNumber(args[0] ?? 4);
      return ctx.memory.allocHeap(size, 'malloc');
    }
    case 'free': {
      const ptr = toNumber(args[0] ?? 0);
      if (ptr !== 0) {
        ctx.memory.freeHeap(ptr);
      }
      return undefined;
    }
    case 'printf':
    case 'cout':
      return undefined; // no-op
    case 'sizeof':
      return 4; // fallback
    default:
      break;
  }

  // Class constructor call used in VarDecl init (ClassName p(args))
  if (ctx.classes.has(funcName)) {
    // This case is handled in evalVarDecl — shouldn't reach here
    return 0;
  }

  // User-defined function
  if (ctx.functions.has(funcName)) {
    return evalFunction(funcName, args, ctx);
  }

  // Unknown function — return 0
  return 0;
}

function evalCastExpr(node: CastExpr, ctx: EvalContext): unknown {
  const val = evalExpr(node.expr, ctx);
  // When casting a heap address to a known struct/class pointer type,
  // register a ClassInstance so that -> member access works afterward.
  if (node.targetType.isPointer && ctx.classes.has(node.targetType.base)) {
    const addr = toNumber(val);
    if (addr !== 0 && !ctx.classInstances.has(addr)) {
      const classDecl = ctx.classes.get(node.targetType.base)!;
      allocClassInstance(classDecl, addr, true, ctx);
    }
  }
  return val;
}

function evalSizeofExpr(node: SizeofExpr, ctx: EvalContext): unknown {
  if ('kind' in node.operand) {
    // It's an ASTNode
    const operandNode = node.operand as ASTNode;
    if (operandNode.kind === 'Identifier') {
      // Try to find the type from environment
      return 4; // default
    }
    return 4;
  } else {
    // It's a TypeNode
    const typeNode = node.operand as TypeNode;
    if (!typeNode.isPointer && !typeNode.isReference && ctx.classes.has(typeNode.base)) {
      return classSize(ctx.classes.get(typeNode.base)!);
    }
    return typeSizeOf(typeNode);
  }
}

function evalNewExpr(node: NewExpr, ctx: EvalContext): unknown {
  const typeName = node.typeName;

  // Class type: allocate heap + run constructor
  if (ctx.classes.has(typeName)) {
    const classDecl = ctx.classes.get(typeName)!;

    // Calculate size: sum of member sizes (min 4 bytes each)
    let totalSize = 0;
    for (const member of classDecl.members) {
      if (member.decl.kind === 'VarDecl') {
        const field = member.decl as VarDecl;
        totalSize += Math.max(typeSizeOf(field.varType), 4);
      }
    }
    if (totalSize === 0) totalSize = 4;

    const baseAddress = ctx.memory.allocHeap(totalSize, typeName);
    const instance = allocClassInstance(classDecl, baseAddress, true, ctx);

    // Evaluate constructor args
    const constructorArgs: unknown[] = node.args.map(a => evalExpr(a, ctx));

    // Call constructor if exists
    const ctorFn = ctx.functions.get(`${typeName}::${typeName}`);
    if (ctorFn) {
      invokeMethod(ctorFn, instance, constructorArgs, `${typeName}::${typeName}`, ctx);
    }

    return baseAddress;
  }

  // Primitive type
  const sizes: Record<string, number> = {
    int: 4, float: 4, double: 8, char: 1, bool: 1,
  };
  const elemSize = sizes[typeName] ?? 4;
  if (node.isArray) {
    // Array new: args[0] is the count
    const count = node.args.length === 1 ? Math.max(1, toNumber(evalExpr(node.args[0]!, ctx))) : 1;
    return ctx.memory.allocHeap(elemSize * count, `new ${typeName}[${count}]`);
  }
  return ctx.memory.allocHeap(elemSize, `new ${typeName}`);
}

function evalDeleteExpr(node: DeleteExpr, ctx: EvalContext): void {
  const addr = toNumber(evalExpr(node.operand, ctx));
  if (addr !== 0) {
    // Call destructor if this is a class instance
    const instance = ctx.classInstances.get(addr);
    if (instance) {
      const dtorFn = ctx.functions.get(`${instance.className}::~${instance.className}`);
      if (dtorFn) {
        invokeMethod(dtorFn, instance, [], `${instance.className}::~${instance.className}`, ctx);
      }
      ctx.classInstances.delete(addr);
    }
    ctx.memory.freeHeap(addr);
  }
}

function evalArrayAccess(node: ArrayAccess, ctx: EvalContext): unknown {
  // For array variables, get the base address from env (lvalue), not the stored value.
  // An array name in C decays to its own address — evalLValue gives us env address = array base.
  let base: number;
  try {
    base = evalLValue(node.array, ctx);
    // Only use lvalue if it's actually a known array base (bounds recorded)
    if (!ctx.arrayBounds.has(base)) {
      // Not a stack array — fall back to expr value (e.g., pointer subscript)
      base = toNumber(evalExpr(node.array, ctx));
    }
  } catch {
    base = toNumber(evalExpr(node.array, ctx));
  }
  const idx = toNumber(evalExpr(node.index, ctx));

  // Bounds check for known arrays
  const count = ctx.arrayBounds.get(base);
  if (count !== undefined) {
    if (idx < 0 || idx >= count) {
      throw runtimeError(`Array out-of-bounds: index ${idx} is out of range [0, ${count - 1}]`, ctx);
    }
  }

  const addr = base + idx * 4; // assume int size=4
  try {
    return ctx.memory.load(addr);
  } catch {
    return 0;
  }
}

function evalMemberExpr(node: MemberExpr, ctx: EvalContext): unknown {
  // Get the object address
  let objectAddr: number;
  if (node.arrow) {
    // ptr->member: object expression gives pointer value
    objectAddr = toNumber(evalExpr(node.object, ctx));
  } else {
    // obj.member: object expression is an lvalue — get its address
    try {
      objectAddr = evalLValue(node.object, ctx);
    } catch {
      objectAddr = toNumber(evalExpr(node.object, ctx));
    }
  }

  // Check if it's an STL object
  const stlObj = ctx.stlObjects.get(objectAddr);
  if (stlObj) {
    // STL member access (size, empty — non-call reads)
    if (node.member === 'size') return (stlObj as StdVector | StdString | StdArray).size();
    if (node.member === 'empty') return (stlObj instanceof StdVector || stlObj instanceof StdString) ? (stlObj.empty() ? 1 : 0) : 0;
    // For other members, return the method name as a sentinel (handled by CallExpr)
    return 0;
  }

  // Check if it's a class instance
  const instance = ctx.classInstances.get(objectAddr);
  if (instance) {
    const memberAddr = instance.members.get(node.member);
    if (memberAddr !== undefined) {
      try {
        return ctx.memory.load(memberAddr);
      } catch {
        return 0;
      }
    }
    return 0;
  }

  return 0;
}

function evalMemberExprLValue(node: MemberExpr, ctx: EvalContext): number {
  let objectAddr: number;
  if (node.arrow) {
    objectAddr = toNumber(evalExpr(node.object, ctx));
  } else {
    try {
      objectAddr = evalLValue(node.object, ctx);
    } catch {
      objectAddr = toNumber(evalExpr(node.object, ctx));
    }
  }

  const instance = ctx.classInstances.get(objectAddr);
  if (instance) {
    const memberAddr = instance.members.get(node.member);
    if (memberAddr !== undefined) return memberAddr;
  }

  throw runtimeError(`Cannot take lvalue of member ${node.member}`, ctx);
}

// ─── LValue Evaluation ────────────────────────────────────────────────────────

function evalLValue(node: ASTNode, ctx: EvalContext): number {
  switch (node.kind) {
    case 'Identifier': {
      const id = node as IdentifierNode;
      const addr = ctx.env.get(id.name);
      if (addr === undefined) {
        throw runtimeError(`Undefined variable: ${id.name}`, ctx);
      }
      return addr;
    }
    case 'UnaryExpr': {
      const u = node as UnaryExpr;
      if (u.op === '*') {
        // Dereference — target is the pointed-to address
        return toNumber(evalExpr(u.operand, ctx));
      }
      throw runtimeError(`Cannot assign to expression`, ctx);
    }
    case 'ArrayAccess': {
      const aa = node as ArrayAccess;
      // For stack arrays, array name in env IS the base address (lvalue)
      let base: number;
      try {
        base = evalLValue(aa.array, ctx);
        if (!ctx.arrayBounds.has(base)) {
          base = toNumber(evalExpr(aa.array, ctx));
        }
      } catch {
        base = toNumber(evalExpr(aa.array, ctx));
      }
      const idx = toNumber(evalExpr(aa.index, ctx));
      const count = ctx.arrayBounds.get(base);
      if (count !== undefined && (idx < 0 || idx >= count)) {
        throw runtimeError(`Array out-of-bounds: index ${idx} is out of range [0, ${count - 1}]`, ctx);
      }
      return base + idx * 4;
    }
    case 'MemberExpr': {
      return evalMemberExprLValue(node as MemberExpr, ctx);
    }
    default:
      throw runtimeError(`Cannot assign to expression of kind ${node.kind}`, ctx);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  return true;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
}

function formatVal(value: unknown): string {
  if (value === undefined || value === null) return 'void';
  return String(value);
}

function describeExpr(node: ASTNode, result: unknown): string {
  if (node.kind === 'CallExpr') {
    const callee = node as CallExpr;
    if (callee.callee.kind === 'Identifier') {
      return `Call ${(callee.callee as IdentifierNode).name}() = ${formatVal(result)}`;
    }
  }
  return `Expression = ${formatVal(result)}`;
}

function runtimeError(message: string, ctx: EvalContext): Error {
  const err = new Error(message) as Error & { partialTrace?: ExecutionSnapshot[] };
  err.partialTrace = ctx.trace;
  return err;
}
