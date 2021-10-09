# jstok - JavaScript and TypeScript source code tokenizer

Allows to iterate over tokens in code (code units).

## Example

```ts
import {jstok, TokenType} from 'https://deno.land/x/jstok@v0.0.1/mod.ts';
import {assertEquals} from "https://deno.land/std@0.106.0/testing/asserts.ts";

const source =
`	// Comment
	console.log(\`Current time: \${new Date}\`);
`;

assertEquals
(	[...jstok(source)],
	[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.WHITESPACE, value: "\t"},
		{nLine: 1, nColumn: 5, level: 0, type: TokenType.COMMENT, value: "// Comment"},
		{nLine: 1, nColumn: 15, level: 0, type: TokenType.WHITESPACE, value: "\n\t"},
		{nLine: 2, nColumn: 5, level: 0, type: TokenType.IDENT, value: "console"},
		{nLine: 2, nColumn: 12, level: 0, type: TokenType.OTHER, value: "."},
		{nLine: 2, nColumn: 13, level: 0, type: TokenType.IDENT, value: "log"},
		{nLine: 2, nColumn: 16, level: 0, type: TokenType.OTHER, value: "("},
		{nLine: 2, nColumn: 17, level: 1, type: TokenType.STRING_TEMPLATE_BEGIN, value: "`Current time: ${"},
		{nLine: 2, nColumn: 34, level: 2, type: TokenType.IDENT, value: "new"},
		{nLine: 2, nColumn: 37, level: 2, type: TokenType.WHITESPACE, value: " "},
		{nLine: 2, nColumn: 38, level: 2, type: TokenType.IDENT, value: "Date"},
		{nLine: 2, nColumn: 42, level: 1, type: TokenType.STRING_TEMPLATE_END, value: "}`"},
		{nLine: 2, nColumn: 44, level: 0, type: TokenType.OTHER, value: ")"},
		{nLine: 2, nColumn: 45, level: 0, type: TokenType.OTHER, value: ";"},
		{nLine: 2, nColumn: 46, level: 0, type: TokenType.MORE_REQUEST, value: "\n"},
		{nLine: 2, nColumn: 46, level: 0, type: TokenType.WHITESPACE, value: "\n"},
	]
);

for (const token of jstok(source))
{	if (token.type != TokenType.MORE_REQUEST)
	{	console.log(token);
	}
}
```

### jstok() - Tokenize string

This function returns iterator over JavaScript or TypeScript tokens found in a source code provided as a string.

```ts
function jstok(source: string, tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|boolean|undefined>;

type Token =
{	nLine: number;
	nColumn: number;
	level: number,
	type: TokenType;
	value: string;
};

const enum TokenType
{	WHITESPACE,
	COMMENT,
	ATTRIBUTE,
	IDENT,
	NUMBER,
	STRING,
	STRING_TEMPLATE,
	STRING_TEMPLATE_BEGIN,
	STRING_TEMPLATE_MID,
	STRING_TEMPLATE_END,
	REGEXP,
	OTHER,
	MORE_REQUEST,
	ERROR,
}
```

It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

Before returning the last token in the source, it generates `TokenType.MORE_REQUEST`.
You can ignore it, or you can react by calling the following `it.next(more)` function of the iterator with a string argument, that contains code continuation.
In this case this code will be appended to the last token, and the tokenization process will continue.

```ts
import {jstok, TokenType} from 'https://deno.land/x/jstok@v0.0.1/mod.ts';

let source =
`	// Comment
	console.log(\`Current time: \${new Date}\`);
`;

function read()
{	const part = source.slice(0, 10);
	source = source.slice(10);
	return part;
}

const it = jstok(read());
let token;
L:while ((token = it.next().value))
{	while (token.type == TokenType.MORE_REQUEST)
	{	token = it.next(read()).value;
		if (!token)
		{	break L;
		}
	}

	console.log(token);
}
```

This library cannot be used to check source code syntax.
Though in 3 cases it returns `TokenType.ERROR`: 1) if invalid character occured; 2) if unbalanced bracket occured; 3) if occured comment inside string template parameter.
If you react to `TokenType.ERROR` by calling `it.next(ignore)` with `true` argument, the error will be ignored, and the tokenization process will continue.

```ts
import {jstok, TokenType} from 'https://deno.land/x/jstok@v0.0.1/mod.ts';

const source =
`	// Comment
	}
	console.log(\`Current time: \${new Date}\`);
`;

const it = jstok(source);
let token;
L:while ((token = it.next().value))
{	while (token.type == TokenType.ERROR)
	{	console.log('Ignored wrong token:', token);
		token = it.next(true).value;
		if (!token)
		{	break L;
		}
	}

	console.log(token);
}
```

## Token

```ts
type Token =
{	nLine: number;
	nColumn: number;
	level: number,
	type: TokenType;
	value: string;
};
```

- `nLine` - Line number where this token occured.
- `nColumn` - Column number where this token occured.
- `level` - Nesting level. Each one of `(`, `[` and `{` increments the `level` counter. Also `${` inside string templates increments it.
- `type` - Token type.
- `value` - Token text.

## TokenType

```ts
const enum TokenType
{	WHITESPACE,
	COMMENT,
	ATTRIBUTE,
	IDENT,
	NUMBER,
	STRING,
	STRING_TEMPLATE,
	STRING_TEMPLATE_BEGIN,
	STRING_TEMPLATE_MID,
	STRING_TEMPLATE_END,
	REGEXP,
	OTHER,
	MORE_REQUEST,
	ERROR,
}
```

- `WHITESPACE` - Any number of any whitespace characters. Multiple such token types are not generated in sequence.
- `COMMENT` - One single-line or multiline comment, or hashbang.
- `ATTRIBUTE` - Like `@json`.
- `IDENT` - Can contain unicode letters. Private property names like `#flags` are also considered `IDENT`s.
- `NUMBER` - Number.
- `STRING` - String.
- `STRING_TEMPLATE` - Whole backtick-string, if it has no parameters.
- `STRING_TEMPLATE_BEGIN` - First part of a backtick-string, till it's first parameter. The contents of parameters will be tokenized separately, and returned as corresponding token types.
- `STRING_TEMPLATE_MID` - Part of backtick-string between two parameters.
- `STRING_TEMPLATE_END` - Last part of backtick-string.
- `REGEXP` - Regular expression literal.
- `OTHER` - Other tokens, like `+`, `++`, `?.`, etc.
- `MORE_REQUEST` - Before returning the last token found in the source string, `jstok()` generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
- `ERROR` - This token type is returned in 3 situations: 1) invalid character occured; 2) unbalanced bracket occured; 3) occured comment inside string template parameter. If then you call `it.next(ignore)` with `true` argument, this error condition will be ignored, and the tokenization will continue.

## jstokReader() - Tokenize Deno.Reader

This function allows to tokenize a `Deno.Reader` stream of JavaScript or TypeScript source code.
It never generates `TokenType.MORE_REQUEST`.

```ts
async function *jstokReader(source: Deno.Reader, tabWidth=4, nLine=1, nColumn=1, decoder?: TextDecoder): AsyncGenerator<Token, void>;
```

It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

If `decoder` is provided, will use it to convert bytes to text. This function only supports "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).

```ts
import {jstokReader} from 'https://deno.land/x/jstok@v0.0.1/mod.ts';

const fh = await Deno.open(new URL(import.meta.url).pathname, {read: true});
try
{	for await (const token of jstokReader(fh))
	{	console.log(token);
	}
}
finally
{	fh.close();
}
```
