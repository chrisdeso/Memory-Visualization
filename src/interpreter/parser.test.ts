import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  ProgramNode,
  FunctionDecl,
  VarDecl,
  ArrayDecl,
  IfStmt,
  WhileStmt,
  ForStmt,
  ReturnStmt,
  BlockStmt,
  BinaryExpr,
  UnaryExpr,
  Assignment,
  MemberExpr,
  ArrayAccess,
  NewExpr,
  DeleteExpr,
  ClassDecl,
  CallExpr,
  ExpressionStmt,
  IdentifierNode,
  IntLiteralNode,
  CastExpr,
  SizeofExpr,
} from './ast';

// Helper: wrap statements in int main() { ... }
function wrapInMain(code: string): string {
  return `int main() {\n${code}\n}`;
}

// Helper: get the first statement from main
function firstStmt(source: string) {
  const prog = parse(source) as ProgramNode;
  const mainFn = prog.body[0] as FunctionDecl;
  return mainFn.body.body[0];
}

describe('Parser - Basic declarations', () => {
  it('parses int main() { return 0; }', () => {
    const result = parse('int main() { return 0; }') as ProgramNode;
    expect(result.kind).toBe('Program');
    expect(result.body.length).toBe(1);
    const fn = result.body[0] as FunctionDecl;
    expect(fn.kind).toBe('FunctionDecl');
    expect(fn.name).toBe('main');
    expect(fn.body.kind).toBe('BlockStmt');
    const ret = fn.body.body[0] as ReturnStmt;
    expect(ret.kind).toBe('ReturnStmt');
    const val = ret.value as IntLiteralNode;
    expect(val.kind).toBe('IntLiteral');
    expect(val.value).toBe(0);
  });

  it('parses int x = 5; inside main', () => {
    const stmt = firstStmt(wrapInMain('int x = 5;'));
    expect(stmt.kind).toBe('VarDecl');
    const v = stmt as VarDecl;
    expect(v.name).toBe('x');
    expect(v.varType.base).toBe('int');
    const init = v.init as IntLiteralNode;
    expect(init.kind).toBe('IntLiteral');
    expect(init.value).toBe(5);
  });

  it('parses two VarDecl nodes: int x = 5; int y = x + 3;', () => {
    const prog = parse(wrapInMain('int x = 5;\nint y = x + 3;')) as ProgramNode;
    const main = prog.body[0] as FunctionDecl;
    expect(main.body.body.length).toBe(2);
    expect(main.body.body[0].kind).toBe('VarDecl');
    expect(main.body.body[1].kind).toBe('VarDecl');
    const y = main.body.body[1] as VarDecl;
    expect(y.name).toBe('y');
    const init = y.init as BinaryExpr;
    expect(init.kind).toBe('BinaryExpr');
    expect(init.op).toBe('+');
  });

  it('parses global variable declaration at top level', () => {
    const prog = parse('int x = 5;') as ProgramNode;
    expect(prog.body[0].kind).toBe('VarDecl');
  });
});

describe('Parser - Control flow', () => {
  it('parses if statement with BinaryExpr condition', () => {
    const stmt = firstStmt(wrapInMain('if (x > 0) { y = 1; }'));
    expect(stmt.kind).toBe('IfStmt');
    const ifStmt = stmt as IfStmt;
    const cond = ifStmt.condition as BinaryExpr;
    expect(cond.kind).toBe('BinaryExpr');
    expect(cond.op).toBe('>');
  });

  it('parses if/else statement', () => {
    const stmt = firstStmt(wrapInMain('if (x > 0) { y = 1; } else { y = 2; }'));
    expect(stmt.kind).toBe('IfStmt');
    const ifStmt = stmt as IfStmt;
    expect(ifStmt.else).toBeDefined();
  });

  it('parses while statement', () => {
    const stmt = firstStmt(wrapInMain('while (i < 10) { i = i + 1; }'));
    expect(stmt.kind).toBe('WhileStmt');
    const ws = stmt as WhileStmt;
    const cond = ws.condition as BinaryExpr;
    expect(cond.kind).toBe('BinaryExpr');
    expect(cond.op).toBe('<');
  });

  it('parses for statement with init, condition, update', () => {
    const stmt = firstStmt(wrapInMain('for (int i = 0; i < 10; i++) { }'));
    expect(stmt.kind).toBe('ForStmt');
    const fs = stmt as ForStmt;
    expect(fs.init).toBeDefined();
    expect(fs.condition).toBeDefined();
    expect(fs.update).toBeDefined();
  });

  it('parses break and continue', () => {
    const prog = parse(wrapInMain('while (1) { break; continue; }')) as ProgramNode;
    const main = prog.body[0] as FunctionDecl;
    const ws = main.body.body[0] as WhileStmt;
    expect(ws.body.body[0].kind).toBe('BreakStmt');
    expect(ws.body.body[1].kind).toBe('ContinueStmt');
  });
});

describe('Parser - Expressions and operators', () => {
  it('parses binary expression with correct precedence: x + y * z', () => {
    const prog = parse(wrapInMain('int r = x + y * z;')) as ProgramNode;
    const main = prog.body[0] as FunctionDecl;
    const v = main.body.body[0] as VarDecl;
    const init = v.init as BinaryExpr;
    expect(init.kind).toBe('BinaryExpr');
    expect(init.op).toBe('+');
    // right side should be y * z (higher precedence)
    const right = init.right as BinaryExpr;
    expect(right.kind).toBe('BinaryExpr');
    expect(right.op).toBe('*');
  });

  it('parses right-associative assignment: a = b = 5', () => {
    const stmt = firstStmt(wrapInMain('a = b = 5;'));
    // ExpressionStmt containing assignment
    const exprStmt = stmt as ExpressionStmt;
    const assign = exprStmt.expr as Assignment;
    expect(assign.kind).toBe('Assignment');
    // right side should also be an Assignment
    const inner = assign.value as Assignment;
    expect(inner.kind).toBe('Assignment');
  });

  it('parses array access: arr[i]', () => {
    const stmt = firstStmt(wrapInMain('int r = arr[i];'));
    const v = stmt as VarDecl;
    const init = v.init as ArrayAccess;
    expect(init.kind).toBe('ArrayAccess');
    const arr = init.array as IdentifierNode;
    expect(arr.name).toBe('arr');
  });

  it('parses member access with dot: obj.member', () => {
    const stmt = firstStmt(wrapInMain('int r = obj.member;'));
    const v = stmt as VarDecl;
    const init = v.init as MemberExpr;
    expect(init.kind).toBe('MemberExpr');
    expect(init.arrow).toBe(false);
    expect(init.member).toBe('member');
  });

  it('parses member access with arrow: ptr->field', () => {
    const stmt = firstStmt(wrapInMain('int r = ptr->field;'));
    const v = stmt as VarDecl;
    const init = v.init as MemberExpr;
    expect(init.kind).toBe('MemberExpr');
    expect(init.arrow).toBe(true);
    expect(init.member).toBe('field');
  });

  it('parses function call expression', () => {
    const stmt = firstStmt(wrapInMain('foo(1, 2);'));
    const exprStmt = stmt as ExpressionStmt;
    const call = exprStmt.expr as CallExpr;
    expect(call.kind).toBe('CallExpr');
    expect(call.args.length).toBe(2);
  });
});

describe('Parser - Pointer operations', () => {
  it('parses int *p = nullptr;', () => {
    const stmt = firstStmt(wrapInMain('int *p = nullptr;'));
    expect(stmt.kind).toBe('VarDecl');
    const v = stmt as VarDecl;
    expect(v.name).toBe('p');
    expect(v.varType.isPointer).toBe(true);
    expect(v.varType.base).toBe('int');
    const init = v.init as { kind: string };
    expect(init.kind).toBe('NullptrLiteral');
  });

  it('parses dereference assignment: *p = 42;', () => {
    const stmt = firstStmt(wrapInMain('*p = 42;'));
    const exprStmt = stmt as ExpressionStmt;
    const assign = exprStmt.expr as Assignment;
    expect(assign.kind).toBe('Assignment');
    const target = assign.target as UnaryExpr;
    expect(target.kind).toBe('UnaryExpr');
    expect(target.op).toBe('*');
    expect(target.prefix).toBe(true);
  });

  it('parses sizeof expression', () => {
    const stmt = firstStmt(wrapInMain('int n = sizeof(int);'));
    const v = stmt as VarDecl;
    const init = v.init as SizeofExpr;
    expect(init.kind).toBe('SizeofExpr');
  });
});

describe('Parser - Classes', () => {
  it('parses class with public member', () => {
    const prog = parse('class Foo { public: int x; };') as ProgramNode;
    expect(prog.body[0].kind).toBe('ClassDecl');
    const cls = prog.body[0] as ClassDecl;
    expect(cls.name).toBe('Foo');
    expect(cls.members.length).toBe(1);
    expect(cls.members[0].access).toBe('public');
    expect(cls.members[0].decl.kind).toBe('VarDecl');
  });

  it('parses class with constructor', () => {
    const prog = parse('class Point { public: int x; int y; Point(int a, int b) { x = a; y = b; } };') as ProgramNode;
    const cls = prog.body[0] as ClassDecl;
    expect(cls.kind).toBe('ClassDecl');
    expect(cls.name).toBe('Point');
    // Find constructor
    const ctorMember = cls.members.find(m => m.decl.kind === 'FunctionDecl');
    expect(ctorMember).toBeDefined();
    const ctor = ctorMember!.decl as FunctionDecl;
    expect(ctor.name).toBe('Point');
  });

  it('parses new expression: Foo* f = new Foo(1);', () => {
    const stmt = firstStmt(wrapInMain('Foo* f = new Foo(1);'));
    expect(stmt.kind).toBe('VarDecl');
    const v = stmt as VarDecl;
    expect(v.varType.isPointer).toBe(true);
    const init = v.init as NewExpr;
    expect(init.kind).toBe('NewExpr');
    expect(init.typeName).toBe('Foo');
    expect(init.args.length).toBe(1);
  });

  it('parses delete expression: delete f;', () => {
    const stmt = firstStmt(wrapInMain('delete f;'));
    const exprStmt = stmt as ExpressionStmt;
    const del = exprStmt.expr as DeleteExpr;
    expect(del.kind).toBe('DeleteExpr');
    const operand = del.operand as IdentifierNode;
    expect(operand.name).toBe('f');
  });

  it('parses Point* p = new Point(1, 2) using VarDecl with NewExpr init', () => {
    const stmt = firstStmt(wrapInMain('Point* p = new Point(1, 2);'));
    const v = stmt as VarDecl;
    expect(v.kind).toBe('VarDecl');
    const init = v.init as NewExpr;
    expect(init.kind).toBe('NewExpr');
    expect(init.typeName).toBe('Point');
    expect(init.args.length).toBe(2);
  });
});

describe('Parser - STL types', () => {
  it('parses std::vector<int> v;', () => {
    const stmt = firstStmt(wrapInMain('std::vector<int> v;'));
    expect(stmt.kind).toBe('VarDecl');
    const v = stmt as VarDecl;
    expect(v.varType.base).toBe('vector');
    expect(v.varType.templateParam).toBe('int');
  });

  it('parses std::string s = "hello";', () => {
    const stmt = firstStmt(wrapInMain('std::string s = "hello";'));
    expect(stmt.kind).toBe('VarDecl');
    const v = stmt as VarDecl;
    expect(v.varType.base).toBe('string');
  });
});

describe('Parser - Arrays', () => {
  it('parses int arr[5]; as ArrayDecl', () => {
    const stmt = firstStmt(wrapInMain('int arr[5];'));
    expect(stmt.kind).toBe('ArrayDecl');
    const a = stmt as ArrayDecl;
    expect(a.name).toBe('arr');
    expect(a.elementType.base).toBe('int');
    const size = a.size as IntLiteralNode;
    expect(size.value).toBe(5);
  });

  it('parses arr[2] = 10; as Assignment with ArrayAccess target', () => {
    const stmt = firstStmt(wrapInMain('arr[2] = 10;'));
    const exprStmt = stmt as ExpressionStmt;
    const assign = exprStmt.expr as Assignment;
    expect(assign.kind).toBe('Assignment');
    const target = assign.target as ArrayAccess;
    expect(target.kind).toBe('ArrayAccess');
    const arr = target.array as IdentifierNode;
    expect(arr.name).toBe('arr');
  });
});

describe('Parser - Error handling', () => {
  it('throws with "line" in message for missing semicolon', () => {
    expect(() => parse(wrapInMain('int x = 5'))).toThrow(/line/i);
  });

  it('throws with descriptive message for unexpected token', () => {
    expect(() => parse('@ invalid')).toThrow();
  });

  it('includes line number in parse error', () => {
    try {
      parse('int main() {\nint x = 5\n}');
      expect(true).toBe(false); // should not reach here
    } catch (e) {
      expect((e as Error).message).toMatch(/line/i);
    }
  });
});

describe('Parser - include directives', () => {
  it('skips #include directives and still parses function', () => {
    const prog = parse('#include <iostream>\nint main() { return 0; }') as ProgramNode;
    // Should still parse main
    const mainFn = prog.body.find(n => n.kind === 'FunctionDecl') as FunctionDecl | undefined;
    expect(mainFn).toBeDefined();
    expect(mainFn?.name).toBe('main');
  });
});

describe('Parser - using namespace std', () => {
  it('parses program with using namespace std', () => {
    const prog = parse('using namespace std;\nint main() { return 0; }') as ProgramNode;
    const mainFn = prog.body.find(n => n.kind === 'FunctionDecl') as FunctionDecl | undefined;
    expect(mainFn).toBeDefined();
    expect(mainFn?.name).toBe('main');
  });
});
