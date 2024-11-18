const isBigEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] == 0;
const decoder16 = new TextDecoder(isBigEndian ? 'utf-16be' : 'utf-16');

const C_HASH = '#'.charCodeAt(0);
const C_EXCL = '!'.charCodeAt(0);
const C_APOS = "'".charCodeAt(0);
const C_QUOT = '"'.charCodeAt(0);
const C_BACKTICK = '`'.charCodeAt(0);
const C_AT = '@'.charCodeAt(0);
const C_EQ = '='.charCodeAt(0);
const C_DOT = '.'.charCodeAt(0);
const C_PLUS = '+'.charCodeAt(0);
const C_MINUS = '-'.charCodeAt(0);
const C_TIMES = '*'.charCodeAt(0);
const C_SLASH = '/'.charCodeAt(0);
const C_BACKSLASH = '\\'.charCodeAt(0);
const C_COMMA = ','.charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_VTAB = '\v'.charCodeAt(0);
const C_BACKSPACE = '\b'.charCodeAt(0);
const C_FORM_FEED = '\f'.charCodeAt(0);
const C_PAREN_OPEN = '('.charCodeAt(0);
const C_PAREN_CLOSE = ')'.charCodeAt(0);
const C_SQUARE_OPEN = '['.charCodeAt(0);
const C_SQUARE_CLOSE = ']'.charCodeAt(0);
const C_BRACE_OPEN = '{'.charCodeAt(0);
const C_BRACE_CLOSE = '}'.charCodeAt(0);
const C_ZERO = '0'.charCodeAt(0);
const C_ONE = '1'.charCodeAt(0);
const C_TWO = '2'.charCodeAt(0);
const C_THREE = '3'.charCodeAt(0);
const C_FOUR = '4'.charCodeAt(0);
const C_FIVE = '5'.charCodeAt(0);
const C_SIX = '6'.charCodeAt(0);
const C_SEVEN = '7'.charCodeAt(0);
const C_NINE = '9'.charCodeAt(0);
const C_A = 'a'.charCodeAt(0);
const C_B = 'b'.charCodeAt(0);
const C_F = 'f'.charCodeAt(0);
const C_N = 'n'.charCodeAt(0);
const C_O = 'o'.charCodeAt(0);
const C_R = 'r'.charCodeAt(0);
const C_T = 't'.charCodeAt(0);
const C_U = 'u'.charCodeAt(0);
const C_V = 'v'.charCodeAt(0);
const C_X = 'x'.charCodeAt(0);
const C_Z = 'z'.charCodeAt(0);
const C_A_CAP = 'A'.charCodeAt(0);
const C_B_CAP = 'B'.charCodeAt(0);
const C_O_CAP = 'O'.charCodeAt(0);
const C_X_CAP = 'X'.charCodeAt(0);
const C_Z_CAP = 'Z'.charCodeAt(0);

const DEFAULT_REGEXP = /(?:)/;
const RE_LINE = /[\r\n]/;

const PADDER = '                                ';

const RE_STRING_TEMPLATE_STR_MID = String.raw`(?: [^${'`'}\\$] | [$](?!\{) )*`;
const RE_STRING_TEMPLATE_STR = String.raw
`	${RE_STRING_TEMPLATE_STR_MID}  (?:\\(?:.|$) ${RE_STRING_TEMPLATE_STR_MID} )* (?:${'`'} | [$]\{)?
`;
const RE_STRING_TEMPLATE = new RegExp(RE_STRING_TEMPLATE_STR.replace(/\s+/g, ''), 'suy');
const RE_TOKENIZER_STR = String.raw
`	(\p{White_Space}) \p{White_Space}*  |
	/ (?: / [^\r\n]* | \* .*? (?:\*/|$) )  |
	[@#]? ([_$] | \p{Letter})  (?:[_$] | \p{Number} | \p{Letter})*  |
	(	0
		(?:	[Xx] (?:[0-9A-Fa-f_]+|$)  n?  |
			[Oo] (?:[0-7]+|$)  n?  |
			[Bb] (?:[01]+|$)  n?  |
			\.  [0-9_]*  (?: [Ee] [+\-]? [0-9_]+ )?  |
			[0-9_]*  n?
		)  |
		[1-9] [0-9_]*  (?:n  |  (?:\. [0-9_]*)?  (?: [Ee] [+\-]? [0-9_]+ )? )?  |
		                      \. [0-9][0-9_]*    (?: [Ee] [+\-]? [0-9_]+ )?
	)  |
	' [^'\\\r\n]* (?:\\(?:\r\n|.|$) [^'\\\r\n]*)* (?:'|$)  |
	" [^"\\\r\n]* (?:\\(?:\r\n|.|$) [^"\\\r\n]*)* (?:"|$)  |
	${'`'}  ${RE_STRING_TEMPLATE_STR}  |
	\*{1,2}=? | <{1,2}=? | >{1,3}=? | &{1,2}=? | [|]{1,2}=? | [?!][.] | [?]{1,2}=? | [+\-/%<>^]= | \+{1,2} | -{1,2} | => | ={1,3} | !=?=? | [.](?:[.][.])?
`;
const RE_TOKENIZER = new RegExp((RE_TOKENIZER_STR + '|.').replace(/\s+/g, ''), 'suy');

const enum Structure
{	PAREN,	// (
	SQUARE,	// [
	BRACE,	// {
	STRING_TEMPLATE, // `${
}

export const enum TokenType
{	/** Any number of any whitespace characters. Multiple such token types are not generated in sequence. */
	WHITESPACE,
	/** One single-line or multiline comment, or hashbang. */
	COMMENT,
	/** Like `@json`. */
	ATTRIBUTE,
	/** Can contain unicode letters. Private property names like `#flags` are also considered `IDENT`s. */
	IDENT,
	/** Number. */
	NUMBER,
	/** String .*/
	STRING,
	/** Whole backtick-string, if it has no parameters. */
	STRING_TEMPLATE,
	/** First part of a backtick-string, till it's first parameter. The contents of parameters will be tokenized separately, and returned as corresponding token types. */
	STRING_TEMPLATE_BEGIN,
	/** Part of backtick-string between two parameters. */
	STRING_TEMPLATE_MID,
	/** Last part of backtick-string. */
	STRING_TEMPLATE_END,
	/** Regular expression literal. */
	REGEXP,
	/** Other tokens, like `+`, `++`, `?.`, etc. */
	OTHER,
	/** Before returning the last token found in the source string, `jstok()` generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue. */
	MORE_REQUEST,
	/** This token type is returned in 3 situations: 1) invalid character occured; 2) unbalanced bracket occured; 3) occured comment inside string template parameter. If then you call `it.next(ignore)` with `true` argument, this error condition will be ignored, and the tokenization will continue. */
	ERROR,
}

/**	Represents a JavaScript token.
	`text` - Original JavaScript token text.
	`type` - Token type.
	`nLine` Line number where this token starts.
	`nColumn` - Column number on the line where this token starts.
	`level` - Nesting level. Entering `(`, `[` and `{` increments the level counter. Also the level is incremented when entering `${` parameters in string templates.
 **/
export class Token
{	constructor
	(	public text: string,
		public type: TokenType,
		public nLine = 1,
		public nColumn = 1,
		public level = 0,
	){}

	/**	Returns original JavaScript token (`this.text`), except for `TokenType.MORE_REQUEST`, for which it returns empty string.
	 **/
	toString()
	{	return this.type==TokenType.MORE_REQUEST ? '' : this.text;
	}

	debug()
	{	let type = '';
		switch (this.type)
		{	case TokenType.WHITESPACE:            type = 'TokenType.WHITESPACE,           '; break;
			case TokenType.COMMENT:               type = 'TokenType.COMMENT,              '; break;
			case TokenType.ATTRIBUTE:             type = 'TokenType.ATTRIBUTE,            '; break;
			case TokenType.IDENT:                 type = 'TokenType.IDENT,                '; break;
			case TokenType.NUMBER:                type = 'TokenType.NUMBER,               '; break;
			case TokenType.STRING:                type = 'TokenType.STRING,               '; break;
			case TokenType.STRING_TEMPLATE:       type = 'TokenType.STRING_TEMPLATE,      '; break;
			case TokenType.STRING_TEMPLATE_BEGIN: type = 'TokenType.STRING_TEMPLATE_BEGIN,'; break;
			case TokenType.STRING_TEMPLATE_MID:   type = 'TokenType.STRING_TEMPLATE_MID,  '; break;
			case TokenType.STRING_TEMPLATE_END:   type = 'TokenType.STRING_TEMPLATE_END,  '; break;
			case TokenType.REGEXP:                type = 'TokenType.REGEXP,               '; break;
			case TokenType.OTHER:                 type = 'TokenType.OTHER,                '; break;
			case TokenType.MORE_REQUEST:          type = 'TokenType.MORE_REQUEST,         '; break;
			case TokenType.ERROR:                 type = 'TokenType.ERROR,                '; break;
		}
		return `{nLine: ${pad(this.nLine+',', 3)} nColumn: ${pad(this.nColumn+',', 3)} level: ${this.level}, type: ${type} text: ${JSON.stringify(this.text)}}`;
	}

	/**	Converts JavaScript token to it's JavaScript value, if it's string.
		For `TokenType.COMMENT` - it's the text after `//` or between `/*` and `*` `/`.
		For `TokenType.STRING` and all `TokenType.STRING_TEMPLATE*` types - it's the JavaScript value of the token.
		For `TokenType.MORE_REQUEST` - empty string.
		For others, including `TokenType.NUMBER` - it's the original JavaScript token.
	 **/
	getValue()
	{	const {type, text} = this;
		switch (type)
		{	case TokenType.COMMENT:
			{	return text.charCodeAt(1)==C_SLASH ? text.slice(2) : text.slice(2, -2);
			}
			case TokenType.STRING: // '...', "..."
			case TokenType.STRING_TEMPLATE: // `...`
			case TokenType.STRING_TEMPLATE_BEGIN: // `...${
			case TokenType.STRING_TEMPLATE_MID: // }...${
			case TokenType.STRING_TEMPLATE_END: // }...`
			{	const iEnd = text.length - (type==TokenType.STRING_TEMPLATE_BEGIN || type==TokenType.STRING_TEMPLATE_MID ? 2 : 1);
				for (let i=1; i<iEnd; i++)
				{	let c = text.charCodeAt(i);
					if (c == C_BACKSLASH)
					{	const buffer = new Uint16Array(iEnd - 1);
						let j = 0;
						for (let i2=1; i2<i; i2++)
						{	buffer[j++] = text.charCodeAt(i2);
						}
						for (; i<iEnd; i++)
						{	c = text.charCodeAt(i);
							if (c == C_BACKSLASH)
							{	c = text.charCodeAt(++i);
								switch (c)
								{	case C_CR:
										// remove \ at the end of line, and the newline char that follows it
										if (text.charCodeAt(i+1) == C_LF)
										{	i++;
										}
										continue;
									case C_LF:
										// remove \ at the end of line, and the newline char that follows it
										continue;
									case C_R:
										c = C_CR;
										break;
									case C_N:
										c = C_LF;
										break;
									case C_T:
										c = C_TAB;
										break;
									case C_V:
										c = C_VTAB;
										break;
									case C_B:
										c = C_BACKSPACE;
										break;
									case C_F:
										c = C_FORM_FEED;
										break;
									case C_X:
									{	let c1 = text.charCodeAt(++i);
										let c0 = text.charCodeAt(++i);
										c1 -= c1>=C_ZERO && c1<=C_NINE ? C_ZERO : c1>=C_A_CAP && c1<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
										c0 -= c0>=C_ZERO && c0<=C_NINE ? C_ZERO : c0>=C_A_CAP && c0<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
										c = (c1 << 4) | c0;
										break;
									}
									case C_U:
									{	let c3 = text.charCodeAt(++i);
										if (c3 != C_BRACE_OPEN)
										{	let c2 = text.charCodeAt(++i);
											let c1 = text.charCodeAt(++i);
											let c0 = text.charCodeAt(++i);
											c3 -= c3>=C_ZERO && c3<=C_NINE ? C_ZERO : c3>=C_A_CAP && c3<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
											c2 -= c2>=C_ZERO && c2<=C_NINE ? C_ZERO : c2>=C_A_CAP && c2<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
											c1 -= c1>=C_ZERO && c1<=C_NINE ? C_ZERO : c1>=C_A_CAP && c1<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
											c0 -= c0>=C_ZERO && c0<=C_NINE ? C_ZERO : c0>=C_A_CAP && c0<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
											c = (c3 << 12) | (c2 << 8) | (c1 << 4) | c0;
										}
										else
										{	c = 0;
											while (++i < iEnd)
											{	c3 = text.charCodeAt(i);
												if (c3 == C_BRACE_CLOSE)
												{	break;
												}
												c3 -= c3>=C_ZERO && c3<=C_NINE ? C_ZERO : c3>=C_A_CAP && c3<=C_Z_CAP ? C_A_CAP-10 : C_A-10;
												c <<= 4;
												c |= c3;
											}
											if (c >= 0x10000)
											{	c -= 0x10000;
												c3 = 0xD800 | (c >> 10) & 0x3FF; // high surrogate
												c = 0xDC00 | c & 0x3FF; // low surrogate
												buffer[j++] = c3;
											}
										}
										break;
									}
									case C_ZERO:
									case C_ONE:
									case C_TWO:
									case C_THREE:
									case C_FOUR:
									case C_FIVE:
									case C_SIX:
									case C_SEVEN:
									{	c -= C_ZERO;
										const iEnd2 = Math.min(iEnd, i+3);
										while (++i < iEnd2)
										{	const c0 = text.charCodeAt(i);
											if (c0<C_ZERO || c0>C_SEVEN)
											{	break;
											}
											c <<= 3;
											c |= c0 - C_ZERO;
										}
										i--;
									}
								}
							}
							buffer[j++] = c;
						}
						return decoder16.decode(buffer.subarray(0, j));
					}
				}
				return text.slice(1, iEnd);
			}
			case TokenType.MORE_REQUEST:
				return '';
			default:
				return text;
		}
	}

	/**	For `TokenType.NUMBER` returns `Number` or `BigInt` value of the token.
		For others returns `NaN`.
	 **/
	getNumberValue()
	{	let {type, text} = this;
		if (type != TokenType.NUMBER)
		{	return NaN;
		}
		if (text.indexOf('_') != -1)
		{	text = text.replaceAll('_', '');
		}
		if (text.charCodeAt(text.length-1) == C_N)
		{	// BigInt
			return BigInt(text.slice(0, -1));
		}
		else
		{	// Number
			if (text.charCodeAt(0) == C_ZERO)
			{	const c1 = text.charCodeAt(1);
				if (c1!=C_DOT && c1!=C_X && c1!=C_X_CAP && c1!=C_O && c1!=C_O_CAP && c1!=C_B && c1!=C_B_CAP)
				{	if (text.indexOf('8')==-1 && text.indexOf('9')==-1)
					{	text = '0o'+text;
					}
				}
			}
			return Number(text);
		}
	}

	/**	Returns `RegExp` object. For `TokenType.REGEXP` tokens it's the regular expression that this token represents.
		For other token types this method returns just a default empty `RegExp` object.
	 **/
	getRegExpValue()
	{	const {type, text} = this;
		if (type != TokenType.REGEXP)
		{	return DEFAULT_REGEXP;
		}
		const pos = text.lastIndexOf('/');
		return new RegExp(text.slice(1, pos), text.slice(pos+1));
	}
}

function pad(str: string, width: number)
{	return str + PADDER.substring(0, width-str.length);
}

/**	Returns iterator over JavaScript tokens found in source code.
	`nLine` and `nColumn` - will start counting lines from these initial values.
 **/
export function *jstok(source: string, tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|undefined>
{	let regExpExpected = true;
	const structure: Structure[] = [];
	let level = 0;
	let lastIndex = 0;

	// Shebang?
	if (source.charCodeAt(0)==C_HASH && source.charCodeAt(1)==C_EXCL)
	{	const pos = source.match(RE_LINE)?.index ?? source.length;
		lastIndex = pos;
		yield new Token(source.slice(0, pos), TokenType.COMMENT, nLine, nColumn, level);
	}

	let m;
	while (true)
	{	let re = RE_TOKENIZER;
		const c = source.charCodeAt(lastIndex);

		switch (c)
		{	case C_PAREN_OPEN:
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token('(', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = '(' + more;
						continue;
					}
				}
				yield new Token('(', TokenType.OTHER, nLine, nColumn, level);
				structure[level++] = Structure.PAREN;
				regExpExpected = true;
				nColumn++;
				continue;

			case C_SQUARE_OPEN:
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token('[', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = '[' + more;
						continue;
					}
				}
				yield new Token('[', TokenType.OTHER, nLine, nColumn, level);
				structure[level++] = Structure.SQUARE;
				regExpExpected = true;
				nColumn++;
				continue;

			case C_BRACE_OPEN:
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token('{', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = '{' + more;
						continue;
					}
				}
				yield new Token('{', TokenType.OTHER, nLine, nColumn, level);
				structure[level++] = Structure.BRACE;
				regExpExpected = true;
				nColumn++;
				continue;

			case C_PAREN_CLOSE:
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token(')', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = ')' + more;
						continue;
					}
				}
				if (structure[--level] == Structure.PAREN)
				{	yield new Token(')', TokenType.OTHER, nLine, nColumn, level);
				}
				else
				{	level++;
					yield new Token(')', TokenType.ERROR, nLine, nColumn, level);
				}
				regExpExpected = false;
				nColumn++;
				continue;

			case C_SQUARE_CLOSE:
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token(']', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = ']' + more;
						continue;
					}
				}
				if (structure[--level] == Structure.SQUARE)
				{	yield new Token(']', TokenType.OTHER, nLine, nColumn, level);
				}
				else
				{	level++;
					yield new Token(']', TokenType.ERROR, nLine, nColumn, level);
				}
				regExpExpected = false;
				nColumn++;
				continue;

			case C_BRACE_CLOSE:
			{	const s = structure[level - 1];
				if (s == Structure.STRING_TEMPLATE)
				{	re = RE_STRING_TEMPLATE;
					break;
				}
				// MORE_REQUEST?
				if (++lastIndex == source.length)
				{	const more = yield new Token('}', TokenType.MORE_REQUEST, nLine, nColumn, level);
					if (typeof(more)=='string' && more.length)
					{	lastIndex = 0;
						source = '}' + more;
						continue;
					}
				}
				if (s == Structure.BRACE)
				{	level--;
					yield new Token('}', TokenType.OTHER, nLine, nColumn, level);
				}
				else
				{	yield new Token('}', TokenType.ERROR, nLine, nColumn, level);
				}
				regExpExpected = false;
				nColumn++;
				continue;
			}
		}

		re.lastIndex = lastIndex;
		if (!(m = re.exec(source)))
		{	break;
		}
		lastIndex = re.lastIndex;
		let [text, isSpace, isIdent, isNumber] = m;

		// MORE_REQUEST?
		if (lastIndex == source.length)
		{	const more = yield new Token(text, TokenType.MORE_REQUEST, nLine, nColumn, level);
			if (typeof(more)=='string' && more.length)
			{	lastIndex = 0;
				source = text + more;
				continue;
			}
		}

		// number?
		if (isNumber)
		{	yield new Token(text, TokenType.NUMBER, nLine, nColumn, level);
			regExpExpected = false;
			// advance nColumn and nLine
			nColumn += text.length;
			continue;
		}

		// ident?
		if (isIdent)
		{	yield new Token(text, c==C_AT ? TokenType.ATTRIBUTE : TokenType.IDENT, nLine, nColumn, level);
			regExpExpected = text=='return' || text=='yield';
			// advance nColumn and nLine
			nColumn += text.length;
			continue;
		}

		// space?
		if (isSpace)
		{	yield new Token(text, TokenType.WHITESPACE, nLine, nColumn, level);
		}
		else
		{	switch (c)
			{	case C_PLUS:
				case C_MINUS:
				{	yield new Token(text, TokenType.OTHER, nLine, nColumn, level);
					if (text.length!=2 || text.charCodeAt(1)!=c) // unary postfix operators don't affect "regExpExpected", and prefix operators are not expected before regexp literal
					{	regExpExpected = true;
					}
					nColumn += text.length;
					continue;
				}

				case C_APOS:
				case C_QUOT:
				{	// ' or " string?
					if (text.length == 1)
					{	// ' or " char, that doesn't comprise string
						yield new Token(text, TokenType.ERROR, nLine, nColumn, level);
						nColumn++;
						continue;
					}
					else
					{	yield new Token(text, TokenType.STRING, nLine, nColumn, level);
						regExpExpected = false;
					}
					break;
				}

				case C_BACKTICK:
				{	if (text.charCodeAt(text.length-1) == C_BACKTICK)
					{	// complete `string` without embedded parameters
						yield new Token(text, TokenType.STRING_TEMPLATE, nLine, nColumn, level);
						regExpExpected = false;
					}
					else if (lastIndex == source.length)
					{	// ` string not terminated
						yield new Token(text, TokenType.ERROR, nLine, nColumn, level);
					}
					else
					{	yield new Token(text, TokenType.STRING_TEMPLATE_BEGIN, nLine, nColumn, level);
						structure[level++] = Structure.STRING_TEMPLATE;
						regExpExpected = true;
					}
					break;
				}

				case C_BRACE_CLOSE:
				{	// assume: structure[level - 1] == Structure.STRING_TEMPLATE
					level--;
					if (text.charCodeAt(text.length-1) == C_BACKTICK)
					{	yield new Token(text, TokenType.STRING_TEMPLATE_END, nLine, nColumn, level);
						regExpExpected = false;
					}
					else if (lastIndex == source.length)
					{	// ` string not terminated
						yield new Token(text, TokenType.ERROR, nLine, nColumn, level);
					}
					else
					{	yield new Token(text, TokenType.STRING_TEMPLATE_MID, nLine, nColumn, level);
						level++; // reenter Structure.STRING_TEMPLATE
						regExpExpected = true;
					}
					break;
				}

				case C_SLASH:
				{	let c1;
					if (text.length>1 && (c1 = text.charCodeAt(1))!=C_EQ)
					{	// comment
						if (c1!=C_TIMES || text.charCodeAt(text.length-2)==C_TIMES && text.charCodeAt(text.length-1)==C_SLASH)
						{	yield new Token(text, TokenType.COMMENT, nLine, nColumn, level);
						}
						else
						{	yield new Token(text, TokenType.ERROR, nLine, nColumn, level);
						}
					}
					// regexp or TokenType.OTHER that starts with slash
					else if (regExpExpected)
					{	// regexp?
						let i = lastIndex;
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
							}
						}

						// MORE_REQUEST?
						if (i == iEnd)
						{	const remaining = source.slice(lastIndex - text.length);
							const more = yield new Token(remaining, TokenType.MORE_REQUEST, nLine, nColumn, level);
							if (typeof(more)=='string' && more.length)
							{	source = remaining + more;
								lastIndex = 0;
								continue;
							}
						}

						if (regExpFound)
						{	text = source.slice(lastIndex - text.length, i); // token includes / at the beginning, and / at the end
							lastIndex = i; // skip the terminating /
							yield new Token(text, TokenType.REGEXP, nLine, nColumn, level);
							regExpExpected = false;
						}
						else
						{	yield new Token(text, TokenType.OTHER, nLine, nColumn, level);
							regExpExpected = true;
							nColumn += text.length;
							continue;
						}
					}
					else
					{	// just slash
						yield new Token(text, TokenType.OTHER, nLine, nColumn, level);
						regExpExpected = true;
						nColumn += text.length;
						continue;
					}
					break;
				}

				default:
				{	if (c<0x20 || c>=0x7F)
					{	yield new Token(text, TokenType.ERROR, nLine, nColumn, level);
					}
					else
					{	yield new Token(text, TokenType.OTHER, nLine, nColumn, level);
					}
					regExpExpected = true;
					nColumn += text.length;
					continue;
				}
			}
		}

		// advance nColumn and nLine
		for (let i=0, iEnd=text.length; i<iEnd; i++)
		{	const c = text.charCodeAt(i);
			if (c == C_CR)
			{	nLine++;
				nColumn = 1;
				if (text.charCodeAt(i+1) == C_LF)
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
	{	yield new Token('', TokenType.ERROR, nLine, nColumn, level);
	}
}
