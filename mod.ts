/**	Allows to iterate over tokens (code units) in Javascript or Typescript code.

	## Example

	```ts
	// To run this example:
	// deno run example.ts

	import {jstok, TokenType} from './mod.ts';
	import {assertEquals} from 'jsr:@std/assert@1.0.7/equals';

	const source =
	`	// Comment
		console.log(\`Current time: \${new Date}\`);
	`;

	assertEquals
	(	[...jstok(source)].map(v => Object.assign<Record<never, never>, unknown>({}, v)),
		[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.WHITESPACE, text: "\t"},
			{nLine: 1, nColumn: 5, level: 0, type: TokenType.COMMENT, text: "// Comment"},
			{nLine: 1, nColumn: 15, level: 0, type: TokenType.WHITESPACE, text: "\n\t"},
			{nLine: 2, nColumn: 5, level: 0, type: TokenType.IDENT, text: "console"},
			{nLine: 2, nColumn: 12, level: 0, type: TokenType.OTHER, text: "."},
			{nLine: 2, nColumn: 13, level: 0, type: TokenType.IDENT, text: "log"},
			{nLine: 2, nColumn: 16, level: 0, type: TokenType.OTHER, text: "("},
			{nLine: 2, nColumn: 17, level: 1, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`Current time: ${"},
			{nLine: 2, nColumn: 34, level: 2, type: TokenType.IDENT, text: "new"},
			{nLine: 2, nColumn: 37, level: 2, type: TokenType.WHITESPACE, text: " "},
			{nLine: 2, nColumn: 38, level: 2, type: TokenType.IDENT, text: "Date"},
			{nLine: 2, nColumn: 42, level: 1, type: TokenType.STRING_TEMPLATE_END, text: "}`"},
			{nLine: 2, nColumn: 44, level: 0, type: TokenType.OTHER, text: ")"},
			{nLine: 2, nColumn: 45, level: 0, type: TokenType.OTHER, text: ";"},
			{nLine: 2, nColumn: 46, level: 0, type: TokenType.MORE_REQUEST, text: "\n"},
			{nLine: 2, nColumn: 46, level: 0, type: TokenType.WHITESPACE, text: "\n"},
		]
	);

	for (const token of jstok(source))
	{	if (token.type != TokenType.MORE_REQUEST)
		{	console.log(token);
		}
	}
	```

	## jstok() - Tokenize string

	{@linkcode jstok()}

	This function returns iterator over JavaScript or TypeScript tokens found in a source code provided as a string.

	It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

	Before returning the last token in the source, it generates {@link TokenType.MORE_REQUEST}.
	You can ignore it, or you can react by calling the next `it.next(more)` function on the iterator with a string argument, that contains code continuation.
	This code will be concatenated with the contents of the {@link TokenType.MORE_REQUEST}, and the tokenization process will continue.

	```ts
	// To run this example:
	// deno run example.ts

	import {jstok, TokenType} from './mod.ts';

	let source =
	`	// Comment
		console.log(\`Current time: \${new Date}\`);
	`;

	function getNextPart()
	{	const part = source.slice(0, 10);
		source = source.slice(10);
		return part;
	}

	const it = jstok(getNextPart());
	let token;
	L:while ((token = it.next().value))
	{	while (token.type == TokenType.MORE_REQUEST)
		{	token = it.next(getNextPart()).value;
			if (!token)
			{	break L;
			}
		}

		console.log(token);
	}
	```

	This library cannot be used to check source code syntax.
	Though in 2 cases it returns {@link TokenType.ERROR}:

	1. if invalid character occured
	2. if unbalanced bracket occured

	## Token

	{@linkcode Token}

	- `text` - original JavaScript token text.
	- `type` - Token type.
	- `nLine` - Line number where this token starts.
	- `nColumn` - Column number on the line where this token starts.
	- `level` - Nesting level. Entering `(`, `[` and `{` increments the level counter. Also the level is incremented when entering `${` parameters in string templates.

	[toString()]{@link Token.toString} method returns original JavaScript token (`this.text`), except for {@link TokenType.MORE_REQUEST}, for which it returns empty string.

	[getValue()]{@link Token.getValue()} method converts JavaScript token to it's JavaScript value, if the value is string.
	- For {@link TokenType.COMMENT} - it's the text after `//` or between `/*` and `*‎/`.
	- For {@link TokenType.STRING} and all `TokenType.STRING_TEMPLATE*` types - it's the JavaScript value of the token.
	- For {@link TokenType.MORE_REQUEST} - empty string.
	- For others, including {@link TokenType.NUMBER} - it's the original JavaScript token.

	[getNumberValue()]{@link Token.getNumberValue()} method returns `Number` or `BigInt` value of the token for {@link TokenType.NUMBER} tokens. For others returns `NaN`.

	[getRegExpValue()]{@link Token.getRegExpValue()} method returns `RegExp` object. For {@link TokenType.REGEXP} tokens it's the regular expression that this token represents.
	For other token types this method returns just a default empty `RegExp` object.

	[debug()]{@link Token.debug()} method returns string with console.log()-ready representation of this `Token` object for debug purposes.

	```ts
	// To run this example:
	// deno run --allow-read example.ts

	import {jstok} from './mod.ts';

	const code = await Deno.readTextFile(new URL(import.meta.url).pathname);
	const tokens = [...jstok(code)];
	console.log(tokens.map(t => t.debug()).join(',\n') + ',');
	```

	## TokenType

	{@linkcode TokenType}

	- `WHITESPACE` - Any number of any whitespace characters. Multiple such token types are not generated in sequence.
	- `COMMENT` - One single-line or multiline comment, or hashbang.
	- `ATTRIBUTE` - Like `@Component`.
	- `IDENT` - Can contain unicode letters. Private property names like `#flags` are also considered `IDENT`s.
	- `NUMBER` - Number.
	- `STRING` - String.
	- `STRING_TEMPLATE` - Whole backtick-string, if it has no parameters.
	- `STRING_TEMPLATE_BEGIN` - First part of a backtick-string, till it's first parameter. The contents of parameters will be tokenized separately, and returned as corresponding token types.
	- `STRING_TEMPLATE_MID` - Part of backtick-string between two parameters.
	- `STRING_TEMPLATE_END` - Last part of backtick-string.
	- `REGEXP` - Regular expression literal.
	- `OTHER` - Other tokens, like `+`, `++`, `?.`, etc.
	- `MORE_REQUEST` - Before returning the last token found in the source string, {@link jstok()} generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
	- `ERROR` - This token type is returned in 2 situations: 1) invalid character occured; 2) unbalanced bracket occured.

	## jstokStream() - Tokenize ReadableStream<Uint8Array>

	This function allows to tokenize a `ReadableStream<Uint8Array>` of JavaScript or TypeScript source code.
	It never generates {@link TokenType.MORE_REQUEST}.

	{@linkcode jstokStream}

	It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

	If `decoder` is provided, will use it to convert bytes to text.

	```ts
	// To run this example:
	// deno run --allow-read example.ts

	import {jstokStream} from './mod.ts';

	const fh = await Deno.open(new URL(import.meta.url).pathname, {read: true});
	for await (const token of jstokStream(fh.readable))
	{	console.log(token);
	}
	```

	@module
 **/

export {jstok, Token, TokenType} from './private/jstok.ts';
export {jstokStream, jstokStreamArray} from './private/jstok_stream.ts';
