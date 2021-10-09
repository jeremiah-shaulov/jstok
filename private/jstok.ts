import { CharsReader } from "./chars_reader.ts";

const BUFFER_SIZE = 16*1024;

const defaultDecoder = new TextDecoder;

const C_HASH = '#'.charCodeAt(0);
const C_EXCL = '!'.charCodeAt(0);
const C_APOS = "'".charCodeAt(0);
const C_QUOT = '"'.charCodeAt(0);
const C_BACKTICK = '`'.charCodeAt(0);
const C_AT = '@'.charCodeAt(0);
const C_EQ = '='.charCodeAt(0);
const C_PLUS = '+'.charCodeAt(0);
const C_MINUS = '-'.charCodeAt(0);
const C_SLASH = '/'.charCodeAt(0);
const C_BACKSLASH = '\\'.charCodeAt(0);
const C_COMMA = ','.charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_PAREN_OPEN = '('.charCodeAt(0);
const C_PAREN_CLOSE = ')'.charCodeAt(0);
const C_SQUARE_OPEN = '['.charCodeAt(0);
const C_SQUARE_CLOSE = ']'.charCodeAt(0);
const C_BRACE_OPEN = '{'.charCodeAt(0);
const C_BRACE_CLOSE = '}'.charCodeAt(0);
const C_ZERO = '0'.charCodeAt(0);
const C_NINE = '9'.charCodeAt(0);
const C_A = 'a'.charCodeAt(0);
const C_Z = 'z'.charCodeAt(0);

/**	`WHITESPACE` - Any number of any whitespace characters. Multiple such token types are not generated in sequence.
	`COMMENT` - One single-line or multiline comment, or hashbang.
	`ATTRIBUTE` - Like `@json`.
	`IDENT` - Can contain unicode letters. Private property names like `#flags` are also considered `IDENT`s.
	`NUMBER` - Number.
	`STRING` - String.
	`STRING_TEMPLATE` - Whole backtick-string, if it has no parameters.
	`STRING_TEMPLATE_BEGIN` - First part of a backtick-string, till it's first parameter. The contents of parameters will be tokenized separately, and returned as corresponding token types.
	`STRING_TEMPLATE_MID` - Part of backtick-string between two parameters.
	`STRING_TEMPLATE_END` - Last part of backtick-string.
	`REGEXP` - Regular expression literal.
	`OTHER` - Other tokens, like `+`, `++`, `?.`, etc.
	`MORE_REQUEST` - Before returning the last token found in the source string, `jstok()` generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
	`ERROR` - This token type is returned in 3 situations: 1) invalid character occured; 2) unbalanced bracket occured; 3) occured comment inside string template parameter. If then you call `it.next(ignore)` with `true` argument, this error condition will be ignored, and the tokenization will continue.
 **/
export const enum TokenType
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

/**	`nLine` number of line where this token starts.
	`nColumn` - number of column on the line where this token starts.
	`level` - nesting level. Entering `(`, `[` and `{` increments the level. Also the level is incremented when entering parameters in string templates.
	`type` - token type.
	`value` - token text.
 **/
export type Token =
{	nLine: number;
	nColumn: number;
	level: number,
	type: TokenType;
	value: string;
};

const enum Structure
{	PAREN,	// (
	SQUARE,	// [
	BRACE,	// {
	STRING_TEMPLATE, // `${
}

const RE_LINE = /[\r\n]/;

const RE_STRING_TEMPLATE_STR = String.raw
`	(?: [^${'`'}\\$] | [$](?!\{) )*  (?:\\(?:.|$) (?: [^${'`'}\\$] | [$](?!\{) )* )* (?:${'`'} | [$]\{)?
`;
const RE_TOKENIZER_STR = String.raw
`	(\p{White_Space}) \p{White_Space}*  |
	/ (?: / [^\r\n]* | \* .*? (?:\*/|$) )  |
	[@#]? ([_$] | \p{General_Category=Letter})  (?:[_$0-9] | \p{General_Category=Letter})*  |
	(	0[Xx] (?:[0-9A-Fa-f_]+|$)  n?  |
		0[Oo] (?:[0-7]+|$)  n?  |
		0[Bb] (?:[01]+|$)  n?  |
		(?:	[0-9] [0-9_]*
			(?:n  |  (?:\. [0-9_]*)?  (?: e [+\-]? [0-9_]+ )? )?  |
						\. [0-9_]+    (?: e [+\-]? [0-9_]+ )?
		)
	)  |
	' [^'\\\r\n]* (?:\\(?:.|$) [^'\\\r\n]*)* (?:'|$)  |
	" [^"\\\r\n]* (?:\\(?:.|$) [^"\\\r\n]*)* (?:"|$)  |
	${'`'}  ${RE_STRING_TEMPLATE_STR}  |
	\*{1,2}=? | <{1,2}=? | >{1,3}=? | &{1,2}=? | [|]{1,2}=? | [?!][.] | [?]{1,2}=? | [+\-/%<>^]= | \+{1,2} | -{1,2} | ={1,3} | !=?=? | [.](?:[.][.])?
`;
const RE_TOKENIZER = new RegExp((RE_TOKENIZER_STR + '|.').replace(/\s+/g, ''), 'suy');
const RE_TOKENIZER_INSIDE_TEMPLATE = new RegExp((RE_TOKENIZER_STR + '|\\}'+RE_STRING_TEMPLATE_STR + '|.').replace(/\s+/g, ''), 'suy');

/**	Returns iterator over JavaScript tokens found in source code.
	`nLine` and `nColumn` - will start counting lines from these initial values.
 **/
export function *jstok(source: string, tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|boolean|undefined>
{	let regExpExpected = true;
	const structure: Structure[] = [];
	let level = 0;
	let tplLevel = 0;
	let re = RE_TOKENIZER;

	re.lastIndex = 0;

	if (source.charCodeAt(0)==C_HASH && source.charCodeAt(1)==C_EXCL)
	{	const pos = source.match(RE_LINE)?.index ?? source.length;
		re.lastIndex = pos;
		yield {nLine, nColumn, level, type: TokenType.COMMENT, value: source.slice(0, pos)};
	}

	let m;
	while ((m = re.exec(source)))
	{	let [value, isSpace, isIdent, isNumber] = m;

		// MORE_REQUEST?
		if (re.lastIndex == source.length)
		{	const more = yield {nLine, nColumn, level, type: TokenType.MORE_REQUEST, value};
			if (typeof(more)=='string' && more.length)
			{	re.lastIndex = 0;
				source = value + more;
				continue;
			}
		}

		// number?
		if (isNumber)
		{	yield {nLine, nColumn, level, type: TokenType.NUMBER, value};
			regExpExpected = false;
			// advance nColumn and nLine
			nColumn += value.length;
			continue;
		}

		const c = value.charCodeAt(0);

		// ident?
		if (isIdent)
		{	yield {nLine, nColumn, level, type: c==C_AT ? TokenType.ATTRIBUTE : TokenType.IDENT, value};
			regExpExpected = value=='return' || value=='yield';
			// advance nColumn and nLine
			nColumn += value.length;
			continue;
		}

		// unary maybe postfix operator? (don't affect "regExpExpected")
		if ((c==C_PLUS || c==C_MINUS) && value.length==2)
		{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
			// advance nColumn and nLine
			nColumn += value.length;
			continue;
		}

		// ' or " string?
		if (c==C_APOS || c==C_QUOT)
		{	if (value.length == 1)
			{	// ' or " char, that doesn't comprise string
				const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
				if (!ignore)
				{	return;
				}
				nColumn++;
			}
			else
			{	yield {nLine, nColumn, level, type: TokenType.STRING, value};
				regExpExpected = false;
				// advance nColumn and nLine
				for (let i=0, iEnd=value.length; i<iEnd; i++)
				{	const c = value.charCodeAt(i);
					if (c == C_TAB)
					{	nColumn += tabWidth - (nColumn-1)%tabWidth;
					}
					else if (!(c>=0xDC00 && c<=0xDFFF)) // if not a second byte of a surrogate pair
					{	nColumn++;
					}
				}
			}
			continue;
		}

		// space?
		if (isSpace)
		{	yield {nLine, nColumn, level, type: TokenType.WHITESPACE, value};
		}
		else
		{	switch (c)
			{	case C_BACKTICK:
				{	if (value.charCodeAt(value.length-1) == C_BACKTICK)
					{	// complete `string` without embedded parameters
						yield {nLine, nColumn, level, type: TokenType.STRING_TEMPLATE, value};
						regExpExpected = false;
					}
					else if (re.lastIndex == source.length)
					{	// ` string not terminated
						const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
						if (!ignore)
						{	return;
						}
					}
					else
					{	yield {nLine, nColumn, level, type: TokenType.STRING_TEMPLATE_BEGIN, value};
						structure[level++] = Structure.STRING_TEMPLATE;
						tplLevel++;
						regExpExpected = true;
						const {lastIndex} = re;
						re = RE_TOKENIZER_INSIDE_TEMPLATE;
						re.lastIndex = lastIndex;
					}
					break;
				}
				case C_PAREN_OPEN:
				{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					structure[level++] = Structure.PAREN;
					regExpExpected = true;
					nColumn++;
					continue;
				}
				case C_SQUARE_OPEN:
				{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					structure[level++] = Structure.SQUARE;
					regExpExpected = true;
					nColumn++;
					continue;
				}
				case C_BRACE_OPEN:
				{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					structure[level++] = Structure.BRACE;
					regExpExpected = true;
					nColumn++;
					continue;
				}
				case C_PAREN_CLOSE:
				{	if (structure[--level] == Structure.PAREN)
					{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					}
					else
					{	level++;
						const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
						if (!ignore)
						{	return;
						}
					}
					regExpExpected = false;
					nColumn++;
					continue;
				}
				case C_SQUARE_CLOSE:
				{	if (structure[--level] == Structure.SQUARE)
					{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					}
					else
					{	level++;
						const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
						if (!ignore)
						{	return;
						}
					}
					regExpExpected = false;
					nColumn++;
					continue;
				}
				case C_BRACE_CLOSE:
				{	const s = structure[--level];
					if (s == Structure.STRING_TEMPLATE)
					{	tplLevel--;
						if (value.charCodeAt(value.length-1) == C_BACKTICK)
						{	yield {nLine, nColumn, level, type: TokenType.STRING_TEMPLATE_END, value};
							regExpExpected = false;
							const {lastIndex} = re;
							re = tplLevel==0 ? RE_TOKENIZER : RE_TOKENIZER_INSIDE_TEMPLATE;
							re.lastIndex = lastIndex;
						}
						else if (re.lastIndex == source.length)
						{	// ` string not terminated
							const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
							if (!ignore)
							{	return;
							}
						}
						else
						{	yield {nLine, nColumn, level, type: TokenType.STRING_TEMPLATE_MID, value};
							level++; // reenter Structure.STRING_TEMPLATE
							tplLevel++;
							regExpExpected = true;
						}
					}
					else
					{	if (s == Structure.BRACE)
						{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
						}
						else
						{	level++;
							const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
							if (!ignore)
							{	return;
							}
						}
						regExpExpected = false;
						nColumn++;
						continue;
					}
					break;
				}
				case C_SLASH:
				{	if (value.length>1 && value.charCodeAt(1)!=C_EQ)
					{	// comment
						if (tplLevel == 0)
						{	yield {nLine, nColumn, level, type: TokenType.COMMENT, value};
						}
						else
						{	const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
							if (!ignore)
							{	return;
							}
						}
					}
					// regexp or TokenType.OTHER that starts with slash
					else if (regExpExpected)
					{	// regexp?
						let i = re.lastIndex;
						const iEnd = source.length;
						let regExpFound = false;
						let parenLevel = 0;
L:						for (; i<iEnd; i++)
						{	switch (source.charCodeAt(i))
							{	case C_CR:
								case C_LF:
									break L;
								case C_SLASH:
									// skip flags
									while (++i < iEnd)
									{	const c = source.charCodeAt(i);
										if (c<C_A || c>C_Z)
										{	break;
										}
									}
									regExpFound = parenLevel==0;
									break L;
								case C_BACKSLASH:
									i++;
									break;
								case C_PAREN_OPEN:
									parenLevel++;
									break;
								case C_PAREN_CLOSE:
									if (--parenLevel < 0)
									{	break L;
									}
									break;
								case C_SQUARE_OPEN:
									while (++i < iEnd)
									{	switch (source.charCodeAt(i))
										{	case C_CR:
											case C_LF:
												break L;
											case C_BACKSLASH:
												i++;
												break;
											case C_SQUARE_CLOSE:
												continue L;
										}
									}
									break;
								case C_BRACE_OPEN:
									while (++i < iEnd)
									{	const c = source.charCodeAt(i);
										switch (c)
										{	case C_BRACE_CLOSE:
												continue L;
											case C_COMMA:
												break;
											case C_SLASH:
												i--;
												continue L;
											default:
												if (c<C_ZERO || c>C_NINE)
												{	break L;
												}
										}
									}
							}
						}

						// MORE_REQUEST?
						if (i == iEnd)
						{	const remaining = source.slice(re.lastIndex - value.length);
							const more = yield {nLine, nColumn, level, type: TokenType.MORE_REQUEST, value: remaining};
							if (typeof(more)=='string' && more.length)
							{	source = remaining + more;
								re.lastIndex = 0;
								continue;
							}
						}

						if (regExpFound)
						{	value = source.slice(re.lastIndex - value.length, i); // token includes / at the beginning, and / at the end
							re.lastIndex = i; // skip the terminating /
							yield {nLine, nColumn, level, type: TokenType.REGEXP, value};
							regExpExpected = false;
						}
						else
						{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
							regExpExpected = true;
							nColumn += value.length;
							continue;
						}
					}
					else
					{	// just slash
						yield {nLine, nColumn, level, type: TokenType.OTHER, value};
						regExpExpected = true;
						nColumn += value.length;
						continue;
					}
					break;
				}
				default:
				{	if (c<0x20 || c>=0x7F)
					{	const ignore = yield {nLine, nColumn, level, type: TokenType.ERROR, value};
						if (!ignore)
						{	return;
						}
					}
					else
					{	yield {nLine, nColumn, level, type: TokenType.OTHER, value};
					}
					regExpExpected = true;
					nColumn += value.length;
					continue;
				}
			}
		}

		// advance nColumn and nLine
		for (let i=0, iEnd=value.length; i<iEnd; i++)
		{	const c = value.charCodeAt(i);
			if (c == C_CR)
			{	nLine++;
				nColumn = 1;
				if (value.charCodeAt(i+1) == C_LF)
				{	i++;
				}
			}
			else if (c == C_LF)
			{	nLine++;
				nColumn = 1;
			}
			else if (c == C_TAB)
			{	nColumn += tabWidth - (nColumn-1)%tabWidth;
			}
			else if (!(c>=0xDC00 && c<=0xDFFF)) // if not a second byte of a surrogate pair
			{	nColumn++;
			}
		}
	}

	if (level != 0)
	{	yield {nLine, nColumn, level, type: TokenType.ERROR, value: ''};
	}
}

/**	Returns async iterator over JavaScript tokens found in source code.
	`nLine` and `nColumn` - will start counting lines from these initial values.
	`decoder` will use it to convert bytes to text. This function only supports "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).
 **/
export async function *jstokReader(source: Deno.Reader, tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token, void>
{	const reader = new CharsReader(source, decoder.encoding);
	const buffer = new Uint8Array(BUFFER_SIZE);
	let part = await reader.readChars(buffer);
	if (part != null)
	{	const it = jstok(part, tabWidth, nLine, nColumn);
		while (true)
		{	let {value} = it.next();
			if (!value)
			{	return;
			}
			while (value.type == TokenType.MORE_REQUEST)
			{	part = await reader.readChars(buffer);
				if (part != null)
				{	value = it.next(part).value;
					if (!value)
					{	return; // must not happen
					}
				}
				else
				{	value = it.next().value;
					if (!value)
					{	return; // must not happen
					}
					break;
				}
			}
			yield value;
		}
	}
}
