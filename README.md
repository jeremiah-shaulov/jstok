<!--
	This file is generated with the following command:
	deno run --allow-all https://raw.githubusercontent.com/jeremiah-shaulov/tsa/v0.0.51/tsa.ts doc-md --outFile=README.md --outUrl=https://raw.githubusercontent.com/jeremiah-shaulov/jstok/v2.1.1/README.md --importUrl=https://deno.land/x/jstok@v2.1.1/mod.ts mod.ts
-->

# jstok - JavaScript and TypeScript source code tokenizer

[Documentation Index](generated-doc/README.md)

Allows to iterate over tokens (code units) in Javascript or Typescript code.

## Example

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/jstok/v2.1.1/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-p9mn>/' > /tmp/example-p9mn.ts
// deno run /tmp/example-p9mn.ts

import {jstok, TokenType} from 'https://deno.land/x/jstok@v2.1.1/mod.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.14/equals';

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

> `function` [jstok](generated-doc/function.jstok/README.md)(source: `string`, tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1): Generator\<[Token](generated-doc/class.Token/README.md), `void`, `string`>

This function returns iterator over JavaScript or TypeScript tokens found in a source code provided as a string.

It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

Before returning the last token in the source, it generates [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12).
You can ignore it, or you can react by calling the next `it.next(more)` function on the iterator with a string argument, that contains code continuation.
This code will be concatenated with the contents of the [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12), and the tokenization process will continue.

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/jstok/v2.1.1/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-65ya>/' > /tmp/example-65ya.ts
// deno run /tmp/example-65ya.ts

import {jstok, TokenType} from 'https://deno.land/x/jstok@v2.1.1/mod.ts';

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
Though in 2 cases it returns [TokenType.ERROR](generated-doc/enum.TokenType/README.md#error--13):

1. if invalid character occured
2. if unbalanced bracket occured

## Token

> `class` Token<br>
> {<br>
> &nbsp; &nbsp; 🔧 [constructor](generated-doc/class.Token/README.md#-constructortext-string-type-tokentype-nline-number1-ncolumn-number1-level-number0)(text: `string`, type: [TokenType](generated-doc/enum.TokenType/README.md), nLine: `number`=1, nColumn: `number`=1, level: `number`=0)<br>
> &nbsp; &nbsp; 📄 [text](generated-doc/class.Token/README.md#-text-string): `string`<br>
> &nbsp; &nbsp; 📄 [type](generated-doc/class.Token/README.md#-type-tokentype): [TokenType](generated-doc/enum.TokenType/README.md)<br>
> &nbsp; &nbsp; 📄 [nLine](generated-doc/class.Token/README.md#-nline-number): `number`<br>
> &nbsp; &nbsp; 📄 [nColumn](generated-doc/class.Token/README.md#-ncolumn-number): `number`<br>
> &nbsp; &nbsp; 📄 [level](generated-doc/class.Token/README.md#-level-number): `number`<br>
> &nbsp; &nbsp; ⚙ [toString](generated-doc/class.Token/README.md#-tostring-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [debug](generated-doc/class.Token/README.md#-debug-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [getValue](generated-doc/class.Token/README.md#-getvalue-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [getNumberValue](generated-doc/class.Token/README.md#-getnumbervalue-number--bigint)(): `number` | `bigint`<br>
> &nbsp; &nbsp; ⚙ [getRegExpValue](generated-doc/class.Token/README.md#-getregexpvalue-regexp)(): RegExp<br>
> }

- `text` - original JavaScript token text.
- `type` - Token type.
- `nLine` - Line number where this token starts.
- `nColumn` - Column number on the line where this token starts.
- `level` - Nesting level. Entering `(`, `[` and `{` increments the level counter. Also the level is incremented when entering `${` parameters in string templates.

[toString()](generated-doc/class.Token/README.md#-tostring-string) method returns original JavaScript token (`this.text`), except for [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12), for which it returns empty string.

[getValue()](generated-doc/class.Token/README.md#-getvalue-string) method converts JavaScript token to it's JavaScript value, if the value is string.
- For [TokenType.COMMENT](generated-doc/enum.TokenType/README.md#comment--1) - it's the text after `//` or between `/*` and `*‎/`.
- For [TokenType.STRING](generated-doc/enum.TokenType/README.md#string--5) and all `TokenType.STRING_TEMPLATE*` types - it's the JavaScript value of the token.
- For [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12) - empty string.
- For others, including [TokenType.NUMBER](generated-doc/enum.TokenType/README.md#number--4) - it's the original JavaScript token.

[getNumberValue()](generated-doc/class.Token/README.md#-getnumbervalue-number--bigint) method returns `Number` or `BigInt` value of the token for [TokenType.NUMBER](generated-doc/enum.TokenType/README.md#number--4) tokens. For others returns `NaN`.

[getRegExpValue()](generated-doc/class.Token/README.md#-getregexpvalue-regexp) method returns `RegExp` object. For [TokenType.REGEXP](generated-doc/enum.TokenType/README.md#regexp--10) tokens it's the regular expression that this token represents.
For other token types this method returns just a default empty `RegExp` object.

[debug()](generated-doc/class.Token/README.md#-debug-string) method returns string with console.log()-ready representation of this `Token` object for debug purposes.

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/jstok/v2.1.1/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-pf4z>/' > /tmp/example-pf4z.ts
// deno run --allow-read /tmp/example-pf4z.ts

import {jstok} from 'https://deno.land/x/jstok@v2.1.1/mod.ts';

const code = await Deno.readTextFile(new URL(import.meta.url).pathname);
const tokens = [...jstok(code)];
console.log(tokens.map(t => t.debug()).join(',\n') + ',');
```

## TokenType

> `const` `enum` TokenType<br>
> {<br>
> &nbsp; &nbsp; [WHITESPACE](generated-doc/enum.TokenType/README.md#whitespace--0) = <mark>0</mark><br>
> &nbsp; &nbsp; [COMMENT](generated-doc/enum.TokenType/README.md#comment--1) = <mark>1</mark><br>
> &nbsp; &nbsp; [ATTRIBUTE](generated-doc/enum.TokenType/README.md#attribute--2) = <mark>2</mark><br>
> &nbsp; &nbsp; [IDENT](generated-doc/enum.TokenType/README.md#ident--3) = <mark>3</mark><br>
> &nbsp; &nbsp; [NUMBER](generated-doc/enum.TokenType/README.md#number--4) = <mark>4</mark><br>
> &nbsp; &nbsp; [STRING](generated-doc/enum.TokenType/README.md#string--5) = <mark>5</mark><br>
> &nbsp; &nbsp; [STRING\_TEMPLATE](generated-doc/enum.TokenType/README.md#string_template--6) = <mark>6</mark><br>
> &nbsp; &nbsp; [STRING\_TEMPLATE\_BEGIN](generated-doc/enum.TokenType/README.md#string_template_begin--7) = <mark>7</mark><br>
> &nbsp; &nbsp; [STRING\_TEMPLATE\_MID](generated-doc/enum.TokenType/README.md#string_template_mid--8) = <mark>8</mark><br>
> &nbsp; &nbsp; [STRING\_TEMPLATE\_END](generated-doc/enum.TokenType/README.md#string_template_end--9) = <mark>9</mark><br>
> &nbsp; &nbsp; [REGEXP](generated-doc/enum.TokenType/README.md#regexp--10) = <mark>10</mark><br>
> &nbsp; &nbsp; [OTHER](generated-doc/enum.TokenType/README.md#other--11) = <mark>11</mark><br>
> &nbsp; &nbsp; [MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12) = <mark>12</mark><br>
> &nbsp; &nbsp; [ERROR](generated-doc/enum.TokenType/README.md#error--13) = <mark>13</mark><br>
> }

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
- `MORE_REQUEST` - Before returning the last token found in the source string, [jstok()](generated-doc/function.jstok/README.md) generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
- `ERROR` - This token type is returned in 2 situations: 1) invalid character occured; 2) unbalanced bracket occured.

## jstokStream() - Tokenize ReadableStream<Uint8Array>

This function allows to tokenize a `ReadableStream<Uint8Array>` of JavaScript or TypeScript source code.
It never generates [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--12).

> `function` [jstokStream](generated-doc/function.jstokStream/README.md)(source: ReadableStream\<Uint8Array> | [Reader](generated-doc/private.type.Reader/README.md), tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=new TextDecoder, buffer: `number` | ArrayBuffer=BUFFER\_SIZE): AsyncGenerator\<[Token](generated-doc/class.Token/README.md), `void`, `any`>

It will start counting lines and chars from the provided `nLine` and `nColumn` values. When counting chars, it will respect the desired `tabWidth`.

If `decoder` is provided, will use it to convert bytes to text.

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/jstok/v2.1.1/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-ksv8>/' > /tmp/example-ksv8.ts
// deno run --allow-read /tmp/example-ksv8.ts

import {jstokStream} from 'https://deno.land/x/jstok@v2.1.1/mod.ts';

const fh = await Deno.open(new URL(import.meta.url).pathname, {read: true});
for await (const token of jstokStream(fh.readable))
{	console.log(token);
}
```