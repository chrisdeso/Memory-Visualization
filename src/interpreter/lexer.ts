import { Token, TokenType } from './ast';

// ─── Keyword Map ─────────────────────────────────────────────────────────────

const KEYWORDS: Record<string, TokenType> = {
  int: TokenType.Int,
  float: TokenType.Float,
  double: TokenType.Double,
  char: TokenType.Char,
  bool: TokenType.Bool,
  void: TokenType.Void,
  if: TokenType.If,
  else: TokenType.Else,
  while: TokenType.While,
  for: TokenType.For,
  return: TokenType.Return,
  class: TokenType.Class,
  public: TokenType.Public,
  private: TokenType.Private,
  new: TokenType.New,
  delete: TokenType.Delete,
  nullptr: TokenType.Nullptr,
  true: TokenType.True,
  false: TokenType.False,
  sizeof: TokenType.Sizeof,
  const: TokenType.Const,
  struct: TokenType.Struct,
  break: TokenType.Break,
  continue: TokenType.Continue,
  using: TokenType.Using,
  namespace: TokenType.Namespace,
  std: TokenType.Std,
};

// ─── Escape Sequence Helper ───────────────────────────────────────────────────

function processEscape(ch: string): string {
  switch (ch) {
    case 'n': return '\n';
    case 't': return '\t';
    case 'r': return '\r';
    case '\\': return '\\';
    case '"': return '"';
    case "'": return "'";
    case '0': return '\0';
    default: return ch;
  }
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(offset = 0): string {
    return source[pos + offset] ?? '';
  }

  function advance(): string {
    const ch = source[pos++] ?? '';
    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function makeToken(type: TokenType, value: string, startLine: number, startCol: number): Token {
    return { type, value, line: startLine, col: startCol };
  }

  while (pos < source.length) {
    // Skip whitespace
    if (/\s/.test(peek())) {
      advance();
      continue;
    }

    const startLine = line;
    const startCol = col;
    const ch = peek();

    // Single-line comment //
    if (ch === '/' && peek(1) === '/') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && peek(1) === '*') {
      advance(); // /
      advance(); // *
      while (pos < source.length) {
        if (peek() === '*' && peek(1) === '/') {
          advance(); // *
          advance(); // /
          break;
        }
        advance();
      }
      continue;
    }

    // #include directive
    if (ch === '#') {
      advance(); // #
      // Skip whitespace after #
      while (pos < source.length && peek() === ' ') advance();
      // Read directive name
      let directive = '';
      while (pos < source.length && /[a-z]/.test(peek())) directive += advance();
      if (directive === 'include') {
        // Skip whitespace
        while (pos < source.length && peek() === ' ') advance();
        let path = '';
        if (peek() === '<') {
          advance(); // <
          while (pos < source.length && peek() !== '>' && peek() !== '\n') path += advance();
          if (peek() === '>') advance();
        } else if (peek() === '"') {
          advance(); // opening "
          while (pos < source.length && peek() !== '"' && peek() !== '\n') path += advance();
          if (peek() === '"') advance();
        }
        tokens.push(makeToken(TokenType.Include, path, startLine, startCol));
      }
      // Skip rest of line
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // String literal
    if (ch === '"') {
      advance(); // opening "
      let value = '';
      while (pos < source.length && peek() !== '"') {
        const c = advance();
        if (c === '\\' && pos < source.length) {
          value += processEscape(advance());
        } else {
          value += c;
        }
      }
      if (peek() === '"') advance(); // closing "
      tokens.push(makeToken(TokenType.StringLiteral, value, startLine, startCol));
      continue;
    }

    // Char literal
    if (ch === "'") {
      advance(); // opening '
      let value = '';
      if (pos < source.length) {
        const c = advance();
        if (c === '\\' && pos < source.length) {
          value = processEscape(advance());
        } else {
          value = c;
        }
      }
      if (peek() === "'") advance(); // closing '
      tokens.push(makeToken(TokenType.CharLiteral, value, startLine, startCol));
      continue;
    }

    // Number literals (int or float)
    if (/[0-9]/.test(ch)) {
      let numStr = '';
      while (pos < source.length && /[0-9]/.test(peek())) numStr += advance();
      if (peek() === '.' && /[0-9]/.test(peek(1))) {
        numStr += advance(); // .
        while (pos < source.length && /[0-9]/.test(peek())) numStr += advance();
        tokens.push(makeToken(TokenType.FloatLiteral, numStr, startLine, startCol));
      } else {
        tokens.push(makeToken(TokenType.IntLiteral, numStr, startLine, startCol));
      }
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (pos < source.length && /[a-zA-Z0-9_]/.test(peek())) ident += advance();
      const kwType = KEYWORDS[ident];
      tokens.push(makeToken(kwType ?? TokenType.Identifier, ident, startLine, startCol));
      continue;
    }

    // Two-character operators (check before single-char)
    const two = ch + peek(1);
    switch (two) {
      case '==': advance(); advance(); tokens.push(makeToken(TokenType.EqualEqual, '==', startLine, startCol)); continue;
      case '!=': advance(); advance(); tokens.push(makeToken(TokenType.BangEqual, '!=', startLine, startCol)); continue;
      case '<=': advance(); advance(); tokens.push(makeToken(TokenType.LessEqual, '<=', startLine, startCol)); continue;
      case '>=': advance(); advance(); tokens.push(makeToken(TokenType.GreaterEqual, '>=', startLine, startCol)); continue;
      case '&&': advance(); advance(); tokens.push(makeToken(TokenType.AmpAmp, '&&', startLine, startCol)); continue;
      case '||': advance(); advance(); tokens.push(makeToken(TokenType.PipePipe, '||', startLine, startCol)); continue;
      case '->': advance(); advance(); tokens.push(makeToken(TokenType.Arrow, '->', startLine, startCol)); continue;
      case '::': advance(); advance(); tokens.push(makeToken(TokenType.ColonColon, '::', startLine, startCol)); continue;
      case '++': advance(); advance(); tokens.push(makeToken(TokenType.PlusPlus, '++', startLine, startCol)); continue;
      case '--': advance(); advance(); tokens.push(makeToken(TokenType.MinusMinus, '--', startLine, startCol)); continue;
      case '+=': advance(); advance(); tokens.push(makeToken(TokenType.PlusEqual, '+=', startLine, startCol)); continue;
      case '-=': advance(); advance(); tokens.push(makeToken(TokenType.MinusEqual, '-=', startLine, startCol)); continue;
      case '*=': advance(); advance(); tokens.push(makeToken(TokenType.StarEqual, '*=', startLine, startCol)); continue;
      case '/=': advance(); advance(); tokens.push(makeToken(TokenType.SlashEqual, '/=', startLine, startCol)); continue;
    }

    // Single-character operators/punctuation
    advance();
    switch (ch) {
      case '+': tokens.push(makeToken(TokenType.Plus, '+', startLine, startCol)); break;
      case '-': tokens.push(makeToken(TokenType.Minus, '-', startLine, startCol)); break;
      case '*': tokens.push(makeToken(TokenType.Star, '*', startLine, startCol)); break;
      case '/': tokens.push(makeToken(TokenType.Slash, '/', startLine, startCol)); break;
      case '%': tokens.push(makeToken(TokenType.Percent, '%', startLine, startCol)); break;
      case '<': tokens.push(makeToken(TokenType.Less, '<', startLine, startCol)); break;
      case '>': tokens.push(makeToken(TokenType.Greater, '>', startLine, startCol)); break;
      case '!': tokens.push(makeToken(TokenType.Bang, '!', startLine, startCol)); break;
      case '&': tokens.push(makeToken(TokenType.Amp, '&', startLine, startCol)); break;
      case '.': tokens.push(makeToken(TokenType.Dot, '.', startLine, startCol)); break;
      case '=': tokens.push(makeToken(TokenType.Equal, '=', startLine, startCol)); break;
      case '{': tokens.push(makeToken(TokenType.LBrace, '{', startLine, startCol)); break;
      case '}': tokens.push(makeToken(TokenType.RBrace, '}', startLine, startCol)); break;
      case '(': tokens.push(makeToken(TokenType.LParen, '(', startLine, startCol)); break;
      case ')': tokens.push(makeToken(TokenType.RParen, ')', startLine, startCol)); break;
      case '[': tokens.push(makeToken(TokenType.LBracket, '[', startLine, startCol)); break;
      case ']': tokens.push(makeToken(TokenType.RBracket, ']', startLine, startCol)); break;
      case ';': tokens.push(makeToken(TokenType.Semicolon, ';', startLine, startCol)); break;
      case ',': tokens.push(makeToken(TokenType.Comma, ',', startLine, startCol)); break;
      case ':': tokens.push(makeToken(TokenType.Colon, ':', startLine, startCol)); break;
      case '|': tokens.push(makeToken(TokenType.PipePipe, '|', startLine, startCol)); break;
      case '~': tokens.push(makeToken(TokenType.Tilde, '~', startLine, startCol)); break;
      default:
        throw new Error(`Unexpected character '${ch}' at line ${startLine}:${startCol}`);
    }
  }

  tokens.push({ type: TokenType.EOF, value: '', line, col });
  return tokens;
}
