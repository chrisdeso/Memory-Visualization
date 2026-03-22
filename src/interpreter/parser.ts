import { tokenize } from './lexer';
import {
  TokenType,
  type Token,
  type ASTNode,
  type ProgramNode,
  type FunctionDecl,
  type ClassDecl,
  type ClassMember,
  type VarDecl,
  type ArrayDecl,
  type Assignment,
  type CompoundAssignment,
  type BinaryExpr,
  type UnaryExpr,
  type CallExpr,
  type MemberExpr,
  type ArrayAccess,
  type IfStmt,
  type WhileStmt,
  type ForStmt,
  type ReturnStmt,
  type NewExpr,
  type DeleteExpr,
  type BlockStmt,
  type ExpressionStmt,
  type BreakStmt,
  type ContinueStmt,
  type IncludeDirective,
  type CastExpr,
  type SizeofExpr,
  type IdentifierNode,
  type IntLiteralNode,
  type FloatLiteralNode,
  type StringLiteralNode,
  type CharLiteralNode,
  type BoolLiteralNode,
  type NullptrLiteralNode,
  type TypeNode,
  type ParamNode,
} from './ast';

// ─── Type Keywords Set ───────────────────────────────────────────────────────

const TYPE_KEYWORDS = new Set([
  TokenType.Int,
  TokenType.Float,
  TokenType.Double,
  TokenType.Char,
  TokenType.Bool,
  TokenType.Void,
  TokenType.Const,
]);

// ─── Parser State ────────────────────────────────────────────────────────────

let tokens: Token[];
let current: number;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function peek(offset = 0): Token {
  const idx = current + offset;
  const t = idx < tokens.length ? tokens[idx] : tokens[tokens.length - 1];
  return t!;
}

function advance(): Token {
  const t = tokens[current]!;
  if (current < tokens.length - 1) current++;
  return t;
}

function check(type: TokenType): boolean {
  return peek().type === type;
}

function match(...types: TokenType[]): boolean {
  for (const t of types) {
    if (check(t)) {
      advance();
      return true;
    }
  }
  return false;
}

function expect(type: TokenType, msg?: string): Token {
  if (check(type)) return advance();
  const t = peek();
  throw new Error(
    `Parse error at line ${t.line}: ${msg ?? `Expected ${type} but got '${t.value}' (${t.type})`}`
  );
}

function error(msg: string): never {
  const t = peek();
  throw new Error(`Parse error at line ${t.line}: ${msg}`);
}

// ─── Type Parsing ─────────────────────────────────────────────────────────────

function isTypeToken(): boolean {
  const t = peek();
  // type keywords
  if (TYPE_KEYWORDS.has(t.type)) return true;
  // struct/class used as type prefix (e.g. struct Node *next)
  if (t.type === TokenType.Struct || t.type === TokenType.Class) return true;
  // std::... types
  if (t.type === TokenType.Std && peek(1).type === TokenType.ColonColon) return true;
  // Identifier followed by * or & or identifier could be a user-defined type
  if (t.type === TokenType.Identifier) {
    // Look ahead: if next is *, &, identifier, or <, treat as type
    const next = peek(1);
    if (
      next.type === TokenType.Star ||
      next.type === TokenType.Amp ||
      next.type === TokenType.Identifier ||
      next.type === TokenType.Less
    ) return true;
  }
  return false;
}

function parseType(): TypeNode {
  let isConst = false;
  if (check(TokenType.Const)) {
    advance();
    isConst = true;
  }

  let base = '';

  // std::type
  if (check(TokenType.Std)) {
    advance(); // std
    expect(TokenType.ColonColon, "Expected '::' after 'std'");
    const name = advance();
    if (name.type !== TokenType.Identifier) {
      throw new Error(`Parse error at line ${name.line}: Expected type name after 'std::'`);
    }
    base = name.value;
  } else if (check(TokenType.Struct) || check(TokenType.Class)) {
    // struct Foo or class Foo used as a type name (e.g. struct Node *next)
    advance(); // consume 'struct' / 'class'
    const name = advance();
    if (name.type !== TokenType.Identifier) {
      throw new Error(`Parse error at line ${name.line}: Expected type name after 'struct'/'class'`);
    }
    base = name.value;
  } else if (TYPE_KEYWORDS.has(peek().type) && peek().type !== TokenType.Const) {
    base = advance().value;
  } else if (check(TokenType.Identifier)) {
    base = advance().value;
  } else {
    error(`Expected type name, got '${peek().value}'`);
  }

  // Template parameter: <T> or <T, N>
  let templateParam: string | undefined;
  if (check(TokenType.Less)) {
    advance(); // <
    // Collect until >
    let depth = 1;
    let tpStr = '';
    while (!check(TokenType.EOF) && depth > 0) {
      const tok = peek();
      if (tok.type === TokenType.Less) { depth++; advance(); tpStr += '<'; }
      else if (tok.type === TokenType.Greater) {
        depth--;
        advance();
        if (depth > 0) tpStr += '>';
      } else {
        tpStr += tok.value;
        advance();
      }
    }
    // Take first part (before comma if any)
    templateParam = (tpStr.split(',')[0] ?? '').trim();
  }

  let isPointer = false;
  let isReference = false;
  if (check(TokenType.Star)) { advance(); isPointer = true; }
  else if (check(TokenType.Amp)) { advance(); isReference = true; }

  return { base, isPointer, isReference, isConst, templateParam };
}

// ─── Forward declarations ─────────────────────────────────────────────────────

function parseStatement(): ASTNode {
  return parseStatementInner();
}

function parseExpression(): ASTNode {
  return parseAssignment();
}

// ─── Statement Parsing ────────────────────────────────────────────────────────

function parseBlock(): BlockStmt {
  const line = peek().line;
  expect(TokenType.LBrace, "Expected '{'");
  const body: ASTNode[] = [];
  while (!check(TokenType.RBrace) && !check(TokenType.EOF)) {
    body.push(parseStatement());
  }
  expect(TokenType.RBrace, "Expected '}'");
  return { kind: 'BlockStmt', body, line };
}

function parseStatementInner(): ASTNode {
  const t = peek();

  // Block statement
  if (t.type === TokenType.LBrace) return parseBlock();

  // if
  if (t.type === TokenType.If) return parseIf();

  // while
  if (t.type === TokenType.While) return parseWhile();

  // for
  if (t.type === TokenType.For) return parseFor();

  // return
  if (t.type === TokenType.Return) return parseReturn();

  // break
  if (t.type === TokenType.Break) {
    const line = advance().line;
    expect(TokenType.Semicolon, "Expected ';' after 'break'");
    return { kind: 'BreakStmt', line } as BreakStmt;
  }

  // continue
  if (t.type === TokenType.Continue) {
    const line = advance().line;
    expect(TokenType.Semicolon, "Expected ';' after 'continue'");
    return { kind: 'ContinueStmt', line } as ContinueStmt;
  }

  // Variable declaration detection:
  // - type keyword (int, float, etc.) -> var decl
  // - const -> var decl
  // - std:: -> var decl (std::vector etc.)
  // - identifier followed by * or & or identifier -> var decl (user-defined type)
  if (isVarDeclStart()) {
    return parseVarOrArrayDecl();
  }

  // Expression statement
  const line2 = peek().line;
  const expr = parseExpression();
  expect(TokenType.Semicolon, "Expected ';' after expression");
  return { kind: 'ExpressionStmt', expr, line: line2 } as ExpressionStmt;
}

function isVarDeclStart(): boolean {
  const t = peek();
  if (t.type === TokenType.Const) return true;
  if (TYPE_KEYWORDS.has(t.type)) return true;
  // struct/class used as type prefix
  if (t.type === TokenType.Struct || t.type === TokenType.Class) return true;
  if (t.type === TokenType.Std && peek(1).type === TokenType.ColonColon) {
    // std::name followed by << (two Less tokens) is a stream expression, not a var decl
    if (peek(3).type === TokenType.Less && peek(4).type === TokenType.Less) return false;
    return true;
  }
  // User-defined type: identifier followed by another identifier (or * ident or & ident)
  if (t.type === TokenType.Identifier) {
    const next = peek(1);
    if (next.type === TokenType.Identifier) return true;
    if (next.type === TokenType.Star) {
      const afterStar = peek(2);
      return afterStar.type === TokenType.Identifier;
    }
    if (next.type === TokenType.Amp) {
      const afterAmp = peek(2);
      return afterAmp.type === TokenType.Identifier;
    }
    if (next.type === TokenType.Less) return true; // template type
  }
  return false;
}

function parseVarOrArrayDecl(): ASTNode {
  const line = peek().line;
  const typeNode = parseType();
  const nameToken = expect(TokenType.Identifier, "Expected variable name");
  const name = nameToken.value;

  // Array declaration: type name[size]
  if (check(TokenType.LBracket)) {
    advance(); // [
    const size = parseExpression();
    expect(TokenType.RBracket, "Expected ']'");
    // Optional initializer list
    let init: ASTNode[] | undefined;
    if (check(TokenType.Equal)) {
      advance(); // =
      expect(TokenType.LBrace, "Expected '{' for array initializer");
      init = [];
      while (!check(TokenType.RBrace) && !check(TokenType.EOF)) {
        init.push(parseExpression());
        if (!match(TokenType.Comma)) break;
      }
      expect(TokenType.RBrace, "Expected '}' after array initializer");
    }
    expect(TokenType.Semicolon, "Expected ';' after array declaration");
    return { kind: 'ArrayDecl', elementType: typeNode, name, size, init, line } as ArrayDecl;
  }

  // Constructor call: ClassName varName(args); — direct-initialization syntax
  if (check(TokenType.LParen)) {
    advance(); // (
    const args: ASTNode[] = [];
    while (!check(TokenType.RParen) && !check(TokenType.EOF)) {
      args.push(parseExpression());
      if (!match(TokenType.Comma)) break;
    }
    expect(TokenType.RParen, "Expected ')' after constructor arguments");
    expect(TokenType.Semicolon, "Expected ';' after variable declaration");
    // Encode as VarDecl with a CallExpr init (callee is the type name)
    const calleeId: IdentifierNode = { kind: 'Identifier', name: typeNode.base, line };
    const initExpr: CallExpr = { kind: 'CallExpr', callee: calleeId, args, line };
    return { kind: 'VarDecl', varType: typeNode, name, init: initExpr, line } as VarDecl;
  }

  // Regular variable declaration
  let initExpr: ASTNode | undefined;
  if (check(TokenType.Equal)) {
    advance(); // =
    initExpr = parseExpression();
  }
  expect(TokenType.Semicolon, "Expected ';' after variable declaration");
  return { kind: 'VarDecl', varType: typeNode, name, init: initExpr, line } as VarDecl;
}

function parseIf(): IfStmt {
  const line = peek().line;
  advance(); // if
  expect(TokenType.LParen, "Expected '(' after 'if'");
  const condition = parseExpression();
  expect(TokenType.RParen, "Expected ')' after if condition");
  const thenBlock = parseBlock();
  let elseClause: ASTNode | undefined;
  if (check(TokenType.Else)) {
    advance(); // else
    if (check(TokenType.If)) {
      elseClause = parseIf();
    } else {
      elseClause = parseBlock();
    }
  }
  return { kind: 'IfStmt', condition, then: thenBlock, else: elseClause, line };
}

function parseWhile(): WhileStmt {
  const line = peek().line;
  advance(); // while
  expect(TokenType.LParen, "Expected '(' after 'while'");
  const condition = parseExpression();
  expect(TokenType.RParen, "Expected ')' after while condition");
  const body = parseBlock();
  return { kind: 'WhileStmt', condition, body, line };
}

function parseFor(): ForStmt {
  const line = peek().line;
  advance(); // for
  expect(TokenType.LParen, "Expected '(' after 'for'");

  // Init: var decl or expr or empty
  let init: ASTNode | undefined;
  if (!check(TokenType.Semicolon)) {
    if (isVarDeclStart()) {
      init = parseVarOrArrayDeclNoSemicolon();
    } else {
      init = parseExpression();
    }
  }
  expect(TokenType.Semicolon, "Expected ';' after for init");

  // Condition
  let condition: ASTNode | undefined;
  if (!check(TokenType.Semicolon)) {
    condition = parseExpression();
  }
  expect(TokenType.Semicolon, "Expected ';' after for condition");

  // Update
  let update: ASTNode | undefined;
  if (!check(TokenType.RParen)) {
    update = parseExpression();
  }
  expect(TokenType.RParen, "Expected ')' after for update");

  const body = parseBlock();
  return { kind: 'ForStmt', init, condition, update, body, line };
}

// Like parseVarOrArrayDecl but without the trailing semicolon
function parseVarOrArrayDeclNoSemicolon(): VarDecl {
  const line = peek().line;
  const typeNode = parseType();
  const nameToken = expect(TokenType.Identifier, "Expected variable name");
  const name = nameToken.value;

  let initExpr: ASTNode | undefined;
  if (check(TokenType.Equal)) {
    advance();
    initExpr = parseExpression();
  }
  return { kind: 'VarDecl', varType: typeNode, name, init: initExpr, line };
}

function parseReturn(): ReturnStmt {
  const line = peek().line;
  advance(); // return
  let value: ASTNode | undefined;
  if (!check(TokenType.Semicolon)) {
    value = parseExpression();
  }
  expect(TokenType.Semicolon, "Expected ';' after return value");
  return { kind: 'ReturnStmt', value, line };
}

// ─── Expression Parsing ───────────────────────────────────────────────────────

function parseAssignment(): ASTNode {
  const expr = parseLogicalOr();
  const t = peek();

  // Assignment: =, +=, -=, *=, /=
  if (t.type === TokenType.Equal) {
    const line = t.line;
    advance();
    const value = parseAssignment(); // right-associative
    return { kind: 'Assignment', target: expr, value, line } as Assignment;
  }
  if (
    t.type === TokenType.PlusEqual ||
    t.type === TokenType.MinusEqual ||
    t.type === TokenType.StarEqual ||
    t.type === TokenType.SlashEqual
  ) {
    const line = t.line;
    const opToken = advance();
    const opMap: Record<string, '+' | '-' | '*' | '/'> = {
      '+=': '+', '-=': '-', '*=': '*', '/=': '/',
    };
    const op = opMap[opToken.value] ?? '+';
    const value = parseAssignment();
    return { kind: 'CompoundAssignment', op, target: expr, value, line } as CompoundAssignment;
  }

  return expr;
}

function parseLogicalOr(): ASTNode {
  let left = parseLogicalAnd();
  while (check(TokenType.PipePipe)) {
    const line = peek().line;
    const op = advance().value;
    const right = parseLogicalAnd();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseLogicalAnd(): ASTNode {
  let left = parseEquality();
  while (check(TokenType.AmpAmp)) {
    const line = peek().line;
    const op = advance().value;
    const right = parseEquality();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseEquality(): ASTNode {
  let left = parseComparison();
  while (check(TokenType.EqualEqual) || check(TokenType.BangEqual)) {
    const line = peek().line;
    const op = advance().value;
    const right = parseComparison();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseShift(): ASTNode {
  let left = parseAdditive();
  // Handle << (two consecutive Less tokens) and >> (two consecutive Greater tokens)
  while (
    (check(TokenType.Less) && peek(1).type === TokenType.Less) ||
    (check(TokenType.Greater) && peek(1).type === TokenType.Greater)
  ) {
    const line = peek().line;
    const op = peek().type === TokenType.Less ? '<<' : '>>';
    advance(); // first < or >
    advance(); // second < or >
    const right = parseAdditive();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseComparison(): ASTNode {
  let left = parseShift();
  while (
    (check(TokenType.Less) && peek(1).type !== TokenType.Less) ||
    (check(TokenType.Greater) && peek(1).type !== TokenType.Greater) ||
    check(TokenType.LessEqual) ||
    check(TokenType.GreaterEqual)
  ) {
    const line = peek().line;
    const op = advance().value;
    const right = parseShift();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseAdditive(): ASTNode {
  let left = parseMultiplicative();
  while (check(TokenType.Plus) || check(TokenType.Minus)) {
    const line = peek().line;
    const op = advance().value;
    const right = parseMultiplicative();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseMultiplicative(): ASTNode {
  let left = parseUnary();
  while (check(TokenType.Star) || check(TokenType.Slash) || check(TokenType.Percent)) {
    const line = peek().line;
    const op = advance().value;
    const right = parseUnary();
    left = { kind: 'BinaryExpr', op, left, right, line } as BinaryExpr;
  }
  return left;
}

function parseUnary(): ASTNode {
  const t = peek();
  const line = t.line;

  // Prefix ++/--
  if (t.type === TokenType.PlusPlus || t.type === TokenType.MinusMinus) {
    advance();
    const operand = parseUnary();
    return { kind: 'UnaryExpr', op: t.value, operand, prefix: true, line } as UnaryExpr;
  }

  // Unary -, !
  if (t.type === TokenType.Minus || t.type === TokenType.Bang) {
    advance();
    const operand = parseUnary();
    return { kind: 'UnaryExpr', op: t.value, operand, prefix: true, line } as UnaryExpr;
  }

  // Dereference *
  if (t.type === TokenType.Star) {
    advance();
    const operand = parseUnary();
    return { kind: 'UnaryExpr', op: '*', operand, prefix: true, line } as UnaryExpr;
  }

  // Address-of &
  if (t.type === TokenType.Amp) {
    advance();
    const operand = parseUnary();
    return { kind: 'UnaryExpr', op: '&', operand, prefix: true, line } as UnaryExpr;
  }

  // sizeof
  if (t.type === TokenType.Sizeof) {
    advance(); // sizeof
    expect(TokenType.LParen, "Expected '(' after 'sizeof'");
    // Try to parse as type, fall back to expression
    let operand: ASTNode | TypeNode;
    const savedCurrent = current;
    try {
      if (isTypeTokenAt(current)) {
        operand = parseType();
        expect(TokenType.RParen, "Expected ')' after sizeof type");
      } else {
        operand = parseExpression();
        expect(TokenType.RParen, "Expected ')' after sizeof expression");
      }
    } catch {
      current = savedCurrent;
      operand = parseExpression();
      expect(TokenType.RParen, "Expected ')' after sizeof expression");
    }
    return { kind: 'SizeofExpr', operand, line } as SizeofExpr;
  }

  // C-style cast: (Type)expr — detect by (typeKeyword or identifier) followed by )
  if (t.type === TokenType.LParen && isCastLookAhead()) {
    advance(); // (
    const targetType = parseType();
    expect(TokenType.RParen, "Expected ')' after cast type");
    const expr = parseUnary();
    return { kind: 'CastExpr', targetType, expr, line } as CastExpr;
  }

  return parsePostfix();
}

function isTypeTokenAt(idx: number): boolean {
  const t = tokens[idx];
  if (!t) return false;
  if (TYPE_KEYWORDS.has(t.type)) return true;
  if (t.type === TokenType.Std) return true;
  if (t.type === TokenType.Identifier) {
    // Followed by ) or * or &
    const next = tokens[idx + 1];
    if (next && (next.type === TokenType.RParen || next.type === TokenType.Star || next.type === TokenType.Amp)) return true;
  }
  return false;
}

function isCastLookAhead(): boolean {
  // We're at LParen. Look ahead to see if it's (Type)
  // Heuristic: (typeKeyword) or (typeKeyword*) or (typeKeyword&) or (Identifier*)
  let i = current + 1; // skip (
  const t = tokens[i];

  // (const ...) or (int) or (void*) etc.
  if (t && t.type === TokenType.Const) i++;
  const t2 = tokens[i];
  if (t2 !== undefined && TYPE_KEYWORDS.has(t2.type) && t2.type !== TokenType.Const) {
    // Skip type
    i++;
    if (tokens[i]?.type === TokenType.Star) i++;
    if (tokens[i]?.type === TokenType.Amp) i++;
    return tokens[i]?.type === TokenType.RParen;
  }
  if (t2?.type === TokenType.Std) {
    // std::type
    i += 3; // std :: name
    if (tokens[i]?.type === TokenType.Star) i++;
    return tokens[i]?.type === TokenType.RParen;
  }
  if (t2?.type === TokenType.Identifier) {
    i++;
    if (tokens[i]?.type === TokenType.Star) i++;
    if (tokens[i]?.type === TokenType.Amp) i++;
    return tokens[i]?.type === TokenType.RParen;
  }
  return false;
}

function parsePostfix(): ASTNode {
  let expr = parsePrimary();
  let cont = true;
  while (cont) {
    const t = peek();
    if (t.type === TokenType.LParen) {
      // Function call
      const line = t.line;
      advance(); // (
      const args: ASTNode[] = [];
      while (!check(TokenType.RParen) && !check(TokenType.EOF)) {
        args.push(parseExpression());
        if (!match(TokenType.Comma)) break;
      }
      expect(TokenType.RParen, "Expected ')' after arguments");
      expr = { kind: 'CallExpr', callee: expr, args, line } as CallExpr;
    } else if (t.type === TokenType.LBracket) {
      // Array access
      const line = t.line;
      advance(); // [
      const index = parseExpression();
      expect(TokenType.RBracket, "Expected ']' after array index");
      expr = { kind: 'ArrayAccess', array: expr, index, line } as ArrayAccess;
    } else if (t.type === TokenType.Dot) {
      // Member access
      const line = t.line;
      advance(); // .
      const memberToken = expect(TokenType.Identifier, "Expected member name after '.'");
      expr = { kind: 'MemberExpr', object: expr, member: memberToken.value, arrow: false, line } as MemberExpr;
    } else if (t.type === TokenType.Arrow) {
      // Pointer member access
      const line = t.line;
      advance(); // ->
      const memberToken = expect(TokenType.Identifier, "Expected member name after '->'");
      expr = { kind: 'MemberExpr', object: expr, member: memberToken.value, arrow: true, line } as MemberExpr;
    } else if (t.type === TokenType.PlusPlus) {
      // Postfix ++
      const line = t.line;
      advance();
      expr = { kind: 'UnaryExpr', op: '++', operand: expr, prefix: false, line } as UnaryExpr;
    } else if (t.type === TokenType.MinusMinus) {
      // Postfix --
      const line = t.line;
      advance();
      expr = { kind: 'UnaryExpr', op: '--', operand: expr, prefix: false, line } as UnaryExpr;
    } else {
      cont = false;
    }
  }
  return expr;
}

function parsePrimary(): ASTNode {
  const t = peek();
  const line = t.line;

  // Integer literal
  if (t.type === TokenType.IntLiteral) {
    advance();
    return { kind: 'IntLiteral', value: parseInt(t.value, 10), line } as IntLiteralNode;
  }

  // Float literal
  if (t.type === TokenType.FloatLiteral) {
    advance();
    return { kind: 'FloatLiteral', value: parseFloat(t.value), line } as FloatLiteralNode;
  }

  // String literal
  if (t.type === TokenType.StringLiteral) {
    advance();
    return { kind: 'StringLiteral', value: t.value, line } as StringLiteralNode;
  }

  // Char literal
  if (t.type === TokenType.CharLiteral) {
    advance();
    return { kind: 'CharLiteral', value: t.value, line } as CharLiteralNode;
  }

  // true / false
  if (t.type === TokenType.True) {
    advance();
    return { kind: 'BoolLiteral', value: true, line } as BoolLiteralNode;
  }
  if (t.type === TokenType.False) {
    advance();
    return { kind: 'BoolLiteral', value: false, line } as BoolLiteralNode;
  }

  // nullptr
  if (t.type === TokenType.Nullptr) {
    advance();
    return { kind: 'NullptrLiteral', line } as NullptrLiteralNode;
  }

  // new
  if (t.type === TokenType.New) {
    return parseNew();
  }

  // delete
  if (t.type === TokenType.Delete) {
    return parseDelete();
  }

  // Grouped expression (already handled casts in parseUnary)
  if (t.type === TokenType.LParen) {
    advance(); // (
    const expr = parseExpression();
    expect(TokenType.RParen, "Expected ')'");
    return expr;
  }

  // std:: qualified identifier (e.g., std::cout)
  if (t.type === TokenType.Std) {
    advance(); // std
    expect(TokenType.ColonColon, "Expected '::'");
    const name = expect(TokenType.Identifier, "Expected name after 'std::'");
    return { kind: 'Identifier', name: `std::${name.value}`, line } as IdentifierNode;
  }

  // Identifier
  if (t.type === TokenType.Identifier) {
    advance();
    return { kind: 'Identifier', name: t.value, line } as IdentifierNode;
  }

  error(`Unexpected token '${t.value}' (${t.type})`);
}

function parseNew(): NewExpr {
  const line = peek().line;
  advance(); // new

  // Parse type name
  let typeName = '';
  if (check(TokenType.Std)) {
    advance();
    expect(TokenType.ColonColon, "Expected '::'");
    typeName = `std::${expect(TokenType.Identifier).value}`;
  } else if (TYPE_KEYWORDS.has(peek().type)) {
    typeName = advance().value;
  } else {
    typeName = expect(TokenType.Identifier, "Expected type name after 'new'").value;
  }

  // Array new: new Type[size] or new Type[size]{initializer list}
  if (check(TokenType.LBracket)) {
    advance(); // [
    const sizeExpr = parseExpression();
    expect(TokenType.RBracket, "Expected ']'");
    // Consume optional brace initializer: new int[3]{1, 2, 3}
    if (check(TokenType.LBrace)) {
      advance(); // {
      while (!check(TokenType.RBrace) && !check(TokenType.EOF)) {
        parseExpression();
        if (!match(TokenType.Comma)) break;
      }
      expect(TokenType.RBrace, "Expected '}' after array initializer");
    }
    return { kind: 'NewExpr', typeName, args: [sizeExpr], isArray: true, line };
  }

  // Constructor call: new Type(args)
  const args: ASTNode[] = [];
  if (check(TokenType.LParen)) {
    advance(); // (
    while (!check(TokenType.RParen) && !check(TokenType.EOF)) {
      args.push(parseExpression());
      if (!match(TokenType.Comma)) break;
    }
    expect(TokenType.RParen, "Expected ')' after new arguments");
  }

  return { kind: 'NewExpr', typeName, args, line };
}

function parseDelete(): DeleteExpr {
  const line = peek().line;
  advance(); // delete

  // delete[] form
  if (check(TokenType.LBracket)) {
    advance(); // [
    expect(TokenType.RBracket, "Expected ']' after 'delete['");
  }

  const operand = parseUnary();
  return { kind: 'DeleteExpr', operand, line };
}

// ─── Top-Level Parsing ────────────────────────────────────────────────────────

function parseProgram(): ProgramNode {
  const body: ASTNode[] = [];

  while (!check(TokenType.EOF)) {
    const t = peek();

    // #include directive (lexer emits Include token)
    if (t.type === TokenType.Include) {
      advance();
      body.push({ kind: 'IncludeDirective', path: t.value, line: t.line } as IncludeDirective);
      continue;
    }

    // using namespace std;
    if (t.type === TokenType.Using) {
      advance(); // using
      if (check(TokenType.Namespace)) advance();
      if (check(TokenType.Std)) advance();
      if (check(TokenType.Semicolon)) advance();
      continue;
    }

    // class / struct declaration
    if (t.type === TokenType.Class || t.type === TokenType.Struct) {
      body.push(parseClass());
      continue;
    }

    // Function or variable declaration at top level
    // Detect by lookahead: type name ( -> function; type name ; or = -> var
    if (isTopLevelDecl()) {
      const decl = parseTopLevelDecl();
      body.push(decl);
      continue;
    }

    // Fallback: try statement
    body.push(parseStatement());
  }

  return { kind: 'Program', body };
}

function isTopLevelDecl(): boolean {
  // Check if current position looks like a type declaration
  const t = peek();
  if (t.type === TokenType.Const) return true;
  if (TYPE_KEYWORDS.has(t.type)) return true;
  if (t.type === TokenType.Std && peek(1).type === TokenType.ColonColon) return true;
  if (t.type === TokenType.Identifier) return true;
  return false;
}

function parseTopLevelDecl(): ASTNode {
  // Save position for backtracking
  const savedCurrent = current;

  // Try to parse as type + name
  try {
    const typeNode = parseType();
    const nameToken = peek();

    if (nameToken.type !== TokenType.Identifier) {
      // Not a decl, restore and parse as statement
      current = savedCurrent;
      return parseStatement();
    }
    advance(); // name

    // Function declaration: type name ( params ) { body }
    if (check(TokenType.LParen)) {
      return parseFunctionDeclRest(typeNode, nameToken.value, nameToken.line);
    }

    // Array declaration: type name [ size ]
    if (check(TokenType.LBracket)) {
      advance(); // [
      const size = parseExpression();
      expect(TokenType.RBracket, "Expected ']'");
      let init: ASTNode[] | undefined;
      if (check(TokenType.Equal)) {
        advance();
        expect(TokenType.LBrace, "Expected '{'");
        init = [];
        while (!check(TokenType.RBrace) && !check(TokenType.EOF)) {
          init.push(parseExpression());
          if (!match(TokenType.Comma)) break;
        }
        expect(TokenType.RBrace, "Expected '}'");
      }
      expect(TokenType.Semicolon, "Expected ';'");
      return { kind: 'ArrayDecl', elementType: typeNode, name: nameToken.value, size, init, line: nameToken.line } as ArrayDecl;
    }

    // Variable declaration
    let initExpr: ASTNode | undefined;
    if (check(TokenType.Equal)) {
      advance();
      initExpr = parseExpression();
    }
    expect(TokenType.Semicolon, "Expected ';' after declaration");
    return { kind: 'VarDecl', varType: typeNode, name: nameToken.value, init: initExpr, line: nameToken.line } as VarDecl;

  } catch (e) {
    // If parsing failed, backtrack and try as statement
    current = savedCurrent;
    throw e;
  }
}

function parseFunctionDeclRest(returnType: TypeNode, name: string, line: number): FunctionDecl {
  advance(); // (
  const params: ParamNode[] = [];
  while (!check(TokenType.RParen) && !check(TokenType.EOF)) {
    const paramType = parseType();
    const paramName = expect(TokenType.Identifier, "Expected parameter name").value;
    params.push({ type: paramType, name: paramName });
    if (!match(TokenType.Comma)) break;
  }
  expect(TokenType.RParen, "Expected ')' after parameters");
  const body = parseBlock();
  return { kind: 'FunctionDecl', returnType, name, params, body, line };
}

function parseClass(): ClassDecl {
  const line = peek().line;
  advance(); // class or struct
  const nameToken = expect(TokenType.Identifier, "Expected class name");
  const name = nameToken.value;

  expect(TokenType.LBrace, "Expected '{' after class name");

  const members: ClassMember[] = [];
  let currentAccess: 'public' | 'private' = 'private';

  while (!check(TokenType.RBrace) && !check(TokenType.EOF)) {
    // Access specifier
    if (check(TokenType.Public)) {
      advance();
      expect(TokenType.Colon, "Expected ':' after 'public'");
      currentAccess = 'public';
      continue;
    }
    if (check(TokenType.Private)) {
      advance();
      expect(TokenType.Colon, "Expected ':' after 'private'");
      currentAccess = 'private';
      continue;
    }

    // Member declaration
    const decl = parseClassMember(name);
    members.push({ access: currentAccess, decl });
  }

  expect(TokenType.RBrace, "Expected '}' after class body");
  expect(TokenType.Semicolon, "Expected ';' after class declaration");

  return { kind: 'ClassDecl', name, members, line };
}

function parseClassMember(className: string): ASTNode {
  const t = peek();

  // Constructor: ClassName(...)
  if (t.type === TokenType.Identifier && t.value === className && peek(1).type === TokenType.LParen) {
    const line = t.line;
    advance(); // class name
    const voidType: TypeNode = { base: 'void', isPointer: false, isReference: false, isConst: false };
    return parseFunctionDeclRest(voidType, className, line);
  }

  // Destructor: ~ClassName() — tilde token now supported
  if (check(TokenType.Tilde)) {
    const dtorLine = t.line;
    advance(); // ~
    const destructorName = expect(TokenType.Identifier, "Expected class name after '~'").value;
    const voidType: TypeNode = { base: 'void', isPointer: false, isReference: false, isConst: false };
    return parseFunctionDeclRest(voidType, `~${destructorName}`, dtorLine);
  }

  // Check for type-based member (variable or method)
  if (isVarDeclStart() || isTypeToken()) {
    const savedCurrent = current;
    try {
      const typeNode = parseType();
      const nameToken = peek();
      if (nameToken.type === TokenType.Identifier) {
        advance(); // name
        // Method
        if (check(TokenType.LParen)) {
          return parseFunctionDeclRest(typeNode, nameToken.value, nameToken.line);
        }
        // Field
        let initExpr: ASTNode | undefined;
        if (check(TokenType.Equal)) {
          advance();
          initExpr = parseExpression();
        }
        expect(TokenType.Semicolon, "Expected ';' after member declaration");
        return { kind: 'VarDecl', varType: typeNode, name: nameToken.value, init: initExpr, line: nameToken.line } as VarDecl;
      }
      current = savedCurrent;
    } catch {
      current = savedCurrent;
    }
  }

  // Fallback: skip to next semicolon
  const t2 = peek();
  error(`Unexpected token in class body: '${t2.value}' at line ${t2.line}`);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function parse(source: string): ProgramNode {
  tokens = tokenize(source);
  current = 0;
  return parseProgram();
}
