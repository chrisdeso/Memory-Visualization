// AST node types and TokenType enum for C++ subset interpreter

// ─── Token Types ────────────────────────────────────────────────────────────

export enum TokenType {
  // Keywords
  Int = 'Int',
  Float = 'Float',
  Double = 'Double',
  Char = 'Char',
  Bool = 'Bool',
  Void = 'Void',
  If = 'If',
  Else = 'Else',
  While = 'While',
  For = 'For',
  Return = 'Return',
  Class = 'Class',
  Public = 'Public',
  Private = 'Private',
  New = 'New',
  Delete = 'Delete',
  Nullptr = 'Nullptr',
  True = 'True',
  False = 'False',
  Sizeof = 'Sizeof',
  Const = 'Const',
  Struct = 'Struct',
  Include = 'Include',
  Break = 'Break',
  Continue = 'Continue',
  Using = 'Using',
  Namespace = 'Namespace',
  Std = 'Std',

  // Operators
  Plus = 'Plus',
  Minus = 'Minus',
  Star = 'Star',
  Slash = 'Slash',
  Percent = 'Percent',
  EqualEqual = 'EqualEqual',
  BangEqual = 'BangEqual',
  Less = 'Less',
  Greater = 'Greater',
  LessEqual = 'LessEqual',
  GreaterEqual = 'GreaterEqual',
  AmpAmp = 'AmpAmp',
  PipePipe = 'PipePipe',
  Bang = 'Bang',
  Amp = 'Amp',
  Tilde = 'Tilde',
  Arrow = 'Arrow',
  Dot = 'Dot',
  ColonColon = 'ColonColon',
  Equal = 'Equal',
  PlusEqual = 'PlusEqual',
  MinusEqual = 'MinusEqual',
  StarEqual = 'StarEqual',
  SlashEqual = 'SlashEqual',
  PlusPlus = 'PlusPlus',
  MinusMinus = 'MinusMinus',

  // Punctuation
  LBrace = 'LBrace',
  RBrace = 'RBrace',
  LParen = 'LParen',
  RParen = 'RParen',
  LBracket = 'LBracket',
  RBracket = 'RBracket',
  Semicolon = 'Semicolon',
  Comma = 'Comma',
  Colon = 'Colon',
  Hash = 'Hash',

  // Literals
  IntLiteral = 'IntLiteral',
  FloatLiteral = 'FloatLiteral',
  StringLiteral = 'StringLiteral',
  CharLiteral = 'CharLiteral',

  // Other
  Identifier = 'Identifier',
  EOF = 'EOF',
}

// ─── Token Interface ─────────────────────────────────────────────────────────

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// ─── Type and Parameter Nodes ────────────────────────────────────────────────

export type TypeNode = {
  base: string;
  isPointer: boolean;
  isReference: boolean;
  isConst: boolean;
  isArray?: boolean;
  arraySize?: number;
  templateParam?: string;
};

export type ParamNode = {
  type: TypeNode;
  name: string;
};

// ─── AST Node Types ──────────────────────────────────────────────────────────

export type ProgramNode = {
  kind: 'Program';
  body: ASTNode[];
};

export type FunctionDecl = {
  kind: 'FunctionDecl';
  returnType: TypeNode;
  name: string;
  params: ParamNode[];
  body: BlockStmt;
  line: number;
};

export type ClassDecl = {
  kind: 'ClassDecl';
  name: string;
  members: ClassMember[];
  line: number;
};

export type ClassMember = {
  access: 'public' | 'private';
  decl: ASTNode;
};

export type VarDecl = {
  kind: 'VarDecl';
  varType: TypeNode;
  name: string;
  init?: ASTNode;
  line: number;
};

export type ArrayDecl = {
  kind: 'ArrayDecl';
  elementType: TypeNode;
  name: string;
  size: ASTNode;
  init?: ASTNode[];
  line: number;
};

export type Assignment = {
  kind: 'Assignment';
  target: ASTNode;
  value: ASTNode;
  line: number;
};

export type CompoundAssignment = {
  kind: 'CompoundAssignment';
  op: '+' | '-' | '*' | '/';
  target: ASTNode;
  value: ASTNode;
  line: number;
};

export type BinaryExpr = {
  kind: 'BinaryExpr';
  op: string;
  left: ASTNode;
  right: ASTNode;
  line: number;
};

export type UnaryExpr = {
  kind: 'UnaryExpr';
  op: string;
  operand: ASTNode;
  prefix: boolean;
  line: number;
};

export type CallExpr = {
  kind: 'CallExpr';
  callee: ASTNode;
  args: ASTNode[];
  line: number;
};

export type MemberExpr = {
  kind: 'MemberExpr';
  object: ASTNode;
  member: string;
  arrow: boolean;
  line: number;
};

export type ArrayAccess = {
  kind: 'ArrayAccess';
  array: ASTNode;
  index: ASTNode;
  line: number;
};

export type IfStmt = {
  kind: 'IfStmt';
  condition: ASTNode;
  then: BlockStmt;
  else?: ASTNode;
  line: number;
};

export type WhileStmt = {
  kind: 'WhileStmt';
  condition: ASTNode;
  body: BlockStmt;
  line: number;
};

export type ForStmt = {
  kind: 'ForStmt';
  init?: ASTNode;
  condition?: ASTNode;
  update?: ASTNode;
  body: BlockStmt;
  line: number;
};

export type ReturnStmt = {
  kind: 'ReturnStmt';
  value?: ASTNode;
  line: number;
};

export type NewExpr = {
  kind: 'NewExpr';
  typeName: string;
  args: ASTNode[];
  isArray?: boolean;
  line: number;
};

export type DeleteExpr = {
  kind: 'DeleteExpr';
  operand: ASTNode;
  line: number;
};

export type BlockStmt = {
  kind: 'BlockStmt';
  body: ASTNode[];
  line: number;
};

export type ExpressionStmt = {
  kind: 'ExpressionStmt';
  expr: ASTNode;
  line: number;
};

export type BreakStmt = {
  kind: 'BreakStmt';
  line: number;
};

export type ContinueStmt = {
  kind: 'ContinueStmt';
  line: number;
};

export type IncludeDirective = {
  kind: 'IncludeDirective';
  path: string;
  line: number;
};

export type CastExpr = {
  kind: 'CastExpr';
  targetType: TypeNode;
  expr: ASTNode;
  line: number;
};

export type SizeofExpr = {
  kind: 'SizeofExpr';
  operand: ASTNode | TypeNode;
  line: number;
};

export type IdentifierNode = {
  kind: 'Identifier';
  name: string;
  line: number;
};

export type IntLiteralNode = {
  kind: 'IntLiteral';
  value: number;
  line: number;
};

export type FloatLiteralNode = {
  kind: 'FloatLiteral';
  value: number;
  line: number;
};

export type StringLiteralNode = {
  kind: 'StringLiteral';
  value: string;
  line: number;
};

export type CharLiteralNode = {
  kind: 'CharLiteral';
  value: string;
  line: number;
};

export type BoolLiteralNode = {
  kind: 'BoolLiteral';
  value: boolean;
  line: number;
};

export type NullptrLiteralNode = {
  kind: 'NullptrLiteral';
  line: number;
};

// ─── ASTNode Union ───────────────────────────────────────────────────────────

export type ASTNode =
  | ProgramNode
  | FunctionDecl
  | ClassDecl
  | VarDecl
  | ArrayDecl
  | Assignment
  | CompoundAssignment
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | MemberExpr
  | ArrayAccess
  | IfStmt
  | WhileStmt
  | ForStmt
  | ReturnStmt
  | NewExpr
  | DeleteExpr
  | BlockStmt
  | ExpressionStmt
  | BreakStmt
  | ContinueStmt
  | IncludeDirective
  | CastExpr
  | SizeofExpr
  | IdentifierNode
  | IntLiteralNode
  | FloatLiteralNode
  | StringLiteralNode
  | CharLiteralNode
  | BoolLiteralNode
  | NullptrLiteralNode;
