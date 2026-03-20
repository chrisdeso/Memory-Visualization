import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer';
import { TokenType } from './ast';

describe('Lexer', () => {
  describe('basic variable declaration', () => {
    it('tokenizes int x = 42;', () => {
      const tokens = tokenize('int x = 42;');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.Int,
        TokenType.Identifier,
        TokenType.Equal,
        TokenType.IntLiteral,
        TokenType.Semicolon,
        TokenType.EOF,
      ]);
      expect(tokens[1]!.value).toBe('x');
      expect(tokens[3]!.value).toBe('42');
    });

    it('tokenizes float declaration', () => {
      const tokens = tokenize('float y = 3.14;');
      expect(tokens[0]!.type).toBe(TokenType.Float);
      expect(tokens[3]!.type).toBe(TokenType.FloatLiteral);
      expect(tokens[3]!.value).toBe('3.14');
    });

    it('tokenizes const int declaration', () => {
      const tokens = tokenize('const int N = 10;');
      expect(tokens[0]!.type).toBe(TokenType.Const);
      expect(tokens[1]!.type).toBe(TokenType.Int);
    });
  });

  describe('pointer declaration', () => {
    it('tokenizes int *p = nullptr;', () => {
      const tokens = tokenize('int *p = nullptr;');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.Int,
        TokenType.Star,
        TokenType.Identifier,
        TokenType.Equal,
        TokenType.Nullptr,
        TokenType.Semicolon,
        TokenType.EOF,
      ]);
    });

    it('tokenizes new expression', () => {
      const tokens = tokenize('int *p = new int(5);');
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.Int,
        TokenType.Star,
        TokenType.Identifier,
        TokenType.Equal,
        TokenType.New,
        TokenType.Int,
        TokenType.LParen,
        TokenType.IntLiteral,
        TokenType.RParen,
        TokenType.Semicolon,
        TokenType.EOF,
      ]);
    });

    it('tokenizes delete expression', () => {
      const tokens = tokenize('delete p;');
      expect(tokens[0]!.type).toBe(TokenType.Delete);
    });
  });

  describe('multi-character operators', () => {
    it('tokenizes equality operator ==', () => {
      const tokens = tokenize('a == b');
      expect(tokens[1]!.type).toBe(TokenType.EqualEqual);
    });

    it('tokenizes inequality operator !=', () => {
      const tokens = tokenize('a != b');
      expect(tokens[1]!.type).toBe(TokenType.BangEqual);
    });

    it('tokenizes less-than-or-equal <=', () => {
      const tokens = tokenize('a <= b');
      expect(tokens[1]!.type).toBe(TokenType.LessEqual);
    });

    it('tokenizes greater-than-or-equal >=', () => {
      const tokens = tokenize('a >= b');
      expect(tokens[1]!.type).toBe(TokenType.GreaterEqual);
    });

    it('tokenizes logical AND &&', () => {
      const tokens = tokenize('a && b');
      expect(tokens[1]!.type).toBe(TokenType.AmpAmp);
    });

    it('tokenizes logical OR ||', () => {
      const tokens = tokenize('a || b');
      expect(tokens[1]!.type).toBe(TokenType.PipePipe);
    });

    it('tokenizes arrow operator ->', () => {
      const tokens = tokenize('p->x');
      expect(tokens[1]!.type).toBe(TokenType.Arrow);
    });

    it('tokenizes scope resolution ::', () => {
      const tokens = tokenize('std::cout');
      expect(tokens[1]!.type).toBe(TokenType.ColonColon);
    });
  });

  describe('increment and decrement', () => {
    it('tokenizes prefix increment ++', () => {
      const tokens = tokenize('++i');
      expect(tokens[0]!.type).toBe(TokenType.PlusPlus);
    });

    it('tokenizes postfix decrement --', () => {
      const tokens = tokenize('i--');
      expect(tokens[1]!.type).toBe(TokenType.MinusMinus);
    });
  });

  describe('compound assignment operators', () => {
    it('tokenizes +=', () => {
      const tokens = tokenize('x += 1');
      expect(tokens[1]!.type).toBe(TokenType.PlusEqual);
    });

    it('tokenizes -=', () => {
      const tokens = tokenize('x -= 1');
      expect(tokens[1]!.type).toBe(TokenType.MinusEqual);
    });

    it('tokenizes *=', () => {
      const tokens = tokenize('x *= 2');
      expect(tokens[1]!.type).toBe(TokenType.StarEqual);
    });

    it('tokenizes /=', () => {
      const tokens = tokenize('x /= 2');
      expect(tokens[1]!.type).toBe(TokenType.SlashEqual);
    });
  });

  describe('string literals', () => {
    it('tokenizes a plain string literal', () => {
      const tokens = tokenize('"hello"');
      expect(tokens[0]!.type).toBe(TokenType.StringLiteral);
      expect(tokens[0]!.value).toBe('hello');
    });

    it('tokenizes string literal with escape sequences', () => {
      const tokens = tokenize('"hello\\nworld"');
      expect(tokens[0]!.type).toBe(TokenType.StringLiteral);
      expect(tokens[0]!.value).toBe('hello\nworld');
    });

    it('tokenizes string with tab escape', () => {
      const tokens = tokenize('"col1\\tcol2"');
      expect(tokens[0]!.value).toBe('col1\tcol2');
    });
  });

  describe('char literals', () => {
    it("tokenizes a char literal 'a'", () => {
      const tokens = tokenize("'a'");
      expect(tokens[0]!.type).toBe(TokenType.CharLiteral);
      expect(tokens[0]!.value).toBe('a');
    });

    it("tokenizes escape char literal '\\n'", () => {
      const tokens = tokenize("'\\n'");
      expect(tokens[0]!.type).toBe(TokenType.CharLiteral);
      expect(tokens[0]!.value).toBe('\n');
    });
  });

  describe('float literals', () => {
    it('tokenizes 3.14', () => {
      const tokens = tokenize('3.14');
      expect(tokens[0]!.type).toBe(TokenType.FloatLiteral);
      expect(tokens[0]!.value).toBe('3.14');
    });

    it('tokenizes 0.5', () => {
      const tokens = tokenize('0.5');
      expect(tokens[0]!.type).toBe(TokenType.FloatLiteral);
      expect(tokens[0]!.value).toBe('0.5');
    });
  });

  describe('comments', () => {
    it('skips single-line comments //', () => {
      const tokens = tokenize('int x; // this is a comment\nint y;');
      const types = tokens.map(t => t.type);
      expect(types).toEqual([
        TokenType.Int,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Int,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.EOF,
      ]);
    });

    it('skips multi-line block comments /* ... */', () => {
      const tokens = tokenize('int x; /* block\ncomment */ int y;');
      const types = tokens.map(t => t.type);
      expect(types).toEqual([
        TokenType.Int,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Int,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.EOF,
      ]);
    });
  });

  describe('#include directive', () => {
    it('tokenizes #include <iostream>', () => {
      const tokens = tokenize('#include <iostream>');
      expect(tokens[0]!.type).toBe(TokenType.Include);
      expect(tokens[0]!.value).toBe('iostream');
      expect(tokens[1]!.type).toBe(TokenType.EOF);
    });

    it('tokenizes #include "myfile.h"', () => {
      const tokens = tokenize('#include "myfile.h"');
      expect(tokens[0]!.type).toBe(TokenType.Include);
      expect(tokens[0]!.value).toBe('myfile.h');
    });
  });

  describe('line and column tracking', () => {
    it('tracks line numbers across multiple lines', () => {
      const tokens = tokenize('int x;\nfloat y;');
      const intToken = tokens[0]!;
      const floatToken = tokens[3]!;
      expect(intToken.line).toBe(1);
      expect(floatToken.line).toBe(2);
    });

    it('tracks column numbers on the same line', () => {
      const tokens = tokenize('int x;');
      expect(tokens[0]!.col).toBe(1);
      expect(tokens[1]!.col).toBe(5);
    });
  });

  describe('class tokens', () => {
    it('tokenizes class keyword', () => {
      const tokens = tokenize('class Foo { public: int x; };');
      expect(tokens[0]!.type).toBe(TokenType.Class);
      expect(tokens[1]!.type).toBe(TokenType.Identifier);
      expect(tokens[1]!.value).toBe('Foo');
      expect(tokens[2]!.type).toBe(TokenType.LBrace);
      expect(tokens[3]!.type).toBe(TokenType.Public);
      expect(tokens[4]!.type).toBe(TokenType.Colon);
      expect(tokens[5]!.type).toBe(TokenType.Int);
      expect(tokens[6]!.type).toBe(TokenType.Identifier);
      expect(tokens[6]!.value).toBe('x');
      expect(tokens[7]!.type).toBe(TokenType.Semicolon);
      expect(tokens[8]!.type).toBe(TokenType.RBrace);
      expect(tokens[9]!.type).toBe(TokenType.Semicolon);
    });

    it('tokenizes private access modifier', () => {
      const tokens = tokenize('private: int y;');
      expect(tokens[0]!.type).toBe(TokenType.Private);
    });
  });

  describe('new and delete keywords', () => {
    it('tokenizes new keyword', () => {
      const tokens = tokenize('new MyClass()');
      expect(tokens[0]!.type).toBe(TokenType.New);
    });

    it('tokenizes delete keyword', () => {
      const tokens = tokenize('delete[] arr;');
      expect(tokens[0]!.type).toBe(TokenType.Delete);
      expect(tokens[1]!.type).toBe(TokenType.LBracket);
      expect(tokens[2]!.type).toBe(TokenType.RBracket);
    });
  });

  describe('error handling', () => {
    it('throws on unrecognized character @', () => {
      expect(() => tokenize('@')).toThrow();
      expect(() => tokenize('@')).toThrow(/line 1/);
    });

    it('error message includes line and column info', () => {
      expect(() => tokenize('int x;\n@')).toThrow(/line 2/);
    });
  });

  describe('boolean and null literals', () => {
    it('tokenizes true', () => {
      const tokens = tokenize('true');
      expect(tokens[0]!.type).toBe(TokenType.True);
    });

    it('tokenizes false', () => {
      const tokens = tokenize('false');
      expect(tokens[0]!.type).toBe(TokenType.False);
    });

    it('tokenizes nullptr', () => {
      const tokens = tokenize('nullptr');
      expect(tokens[0]!.type).toBe(TokenType.Nullptr);
    });
  });

  describe('void and control flow keywords', () => {
    it('tokenizes void, if, else, while, for, return', () => {
      const tokens = tokenize('void if else while for return');
      expect(tokens[0]!.type).toBe(TokenType.Void);
      expect(tokens[1]!.type).toBe(TokenType.If);
      expect(tokens[2]!.type).toBe(TokenType.Else);
      expect(tokens[3]!.type).toBe(TokenType.While);
      expect(tokens[4]!.type).toBe(TokenType.For);
      expect(tokens[5]!.type).toBe(TokenType.Return);
    });

    it('tokenizes break and continue', () => {
      const tokens = tokenize('break continue');
      expect(tokens[0]!.type).toBe(TokenType.Break);
      expect(tokens[1]!.type).toBe(TokenType.Continue);
    });
  });
});
