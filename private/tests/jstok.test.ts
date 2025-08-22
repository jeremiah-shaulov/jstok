import {jstok, jstokStream, Token, TokenType} from '../../mod.ts';
import {jstokStreamArray} from '../jstok_stream.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.14/equals';

function stringReader(str: string, isByob: boolean|null=false, chunkSize=10, encoding='utf-8')
{	let data: Uint8Array;
	let pos = 0;

	if (encoding == 'utf-16le')
	{	data = encodeToUtf16(str, true);
	}
	else if (encoding == 'utf-16be')
	{	data = encodeToUtf16(str, false);
	}
	else
	{	data = new TextEncoder().encode(str);
	}

	if (isByob === null)
	{	const reader =
		{	// deno-lint-ignore require-await
			async read(p: Uint8Array): Promise<number|null>
			{	if (pos >= data.length)
				{	return null;
				}
				const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos));
				p.set(chunk, 0);
				pos += chunk.length;
				return chunk.length;
			}
		};
		return reader;
	}
	else if (!isByob)
	{	return new ReadableStream<Uint8Array>
		(	{	pull(controller)
				{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos));
					pos += chunk.length;
					controller.enqueue(chunk);
					if (pos >= data.length)
					{	controller.close();
					}
				}
			}
		);
	}
	else
	{	return new ReadableStream
		(	{	type: 'bytes',
				pull(controller)
				{	const view = controller.byobRequest?.view;
					if (!view)
					{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos));
						pos += chunk.length;
						controller.enqueue(chunk);
					}
					else
					{	const chunk = data.subarray(pos, pos+Math.min(chunkSize, data.length-pos, view.byteLength));
						pos += chunk.length;
						new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(chunk, 0);
						controller.byobRequest.respond(chunk.length);
					}
					if (pos >= data.length)
					{	controller.close();
					}
				}
			}
		);
	}
}

function encodeToUtf16(str: string, isLittleEndian=false)
{	const buffer = new ArrayBuffer(str.length * 2);
	const view = new DataView(buffer);
	for (let i=0, iEnd=str.length, j=0; i<iEnd; i++, j+=2)
	{	view.setUint16(j, str.charCodeAt(i), isLittleEndian);
	}
	return new Uint8Array(buffer);
}

const RE_NORM = /[\r\n]+([ \t]*)/g;

function normalizeIndent(str: string, newIndent='')
{	str = str.trim();
	let common: string|undefined;
	RE_NORM.lastIndex = 0;
	let m;
	while ((m = RE_NORM.exec(str)))
	{	const indent = m[1];
		if (common == undefined)
		{	common = indent;
		}
		let len = common.length;
		while (len>0 && indent.indexOf(common)==-1)
		{	common = common.slice(0, --len);
		}
	}
	if (common == undefined)
	{	common = '';
	}
	const r = str.indexOf('\r');
	const endl = r==-1 ? '\n' : str.charAt(r+1)=='\n' ? '\r\n' : '\r';
	return newIndent + str.replaceAll(endl+common, endl+newIndent);
}

Deno.test
(	'Line numbers',
	() =>
	{	const source = `/*Aф៘\n😀*/Abc\r\n123\t45\t6\t7'\t8\t9'; \`\t012\t\${'345'}6\${7\n}\`; \`\`; /\t/; "L1\\\n\tL2"; "😀";`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.COMMENT,               text: "/*Aф៘\n😀*/"},
				{nLine: 2,  nColumn: 4,  level: 0, type: TokenType.IDENT,                 text: "Abc"},
				{nLine: 2,  nColumn: 7,  level: 0, type: TokenType.WHITESPACE,            text: "\r\n"},
				{nLine: 3,  nColumn: 1,  level: 0, type: TokenType.NUMBER,                text: "123"},
				{nLine: 3,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "\t"},
				{nLine: 3,  nColumn: 5,  level: 0, type: TokenType.NUMBER,                text: "45"},
				{nLine: 3,  nColumn: 7,  level: 0, type: TokenType.WHITESPACE,            text: "\t"},
				{nLine: 3,  nColumn: 9,  level: 0, type: TokenType.NUMBER,                text: "6"},
				{nLine: 3,  nColumn: 10, level: 0, type: TokenType.WHITESPACE,            text: "\t"},
				{nLine: 3,  nColumn: 13, level: 0, type: TokenType.NUMBER,                text: "7"},
				{nLine: 3,  nColumn: 14, level: 0, type: TokenType.STRING,                text: "'\t8\t9'"},
				{nLine: 3,  nColumn: 23, level: 0, type: TokenType.OTHER,                 text: ";"},
				{nLine: 3,  nColumn: 24, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 3,  nColumn: 25, level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`\t012\t${"},
				{nLine: 3,  nColumn: 35, level: 1, type: TokenType.STRING,                text: "'345'"},
				{nLine: 3,  nColumn: 40, level: 0, type: TokenType.STRING_TEMPLATE_MID,   text: "}6${"},
				{nLine: 3,  nColumn: 44, level: 1, type: TokenType.NUMBER,                text: "7"},
				{nLine: 3,  nColumn: 45, level: 1, type: TokenType.WHITESPACE,            text: "\n"},
				{nLine: 4,  nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}`"},
				{nLine: 4,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: ";"},
				{nLine: 4,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 4,  nColumn: 5,  level: 0, type: TokenType.STRING_TEMPLATE,       text: "``"},
				{nLine: 4,  nColumn: 7,  level: 0, type: TokenType.OTHER,                 text: ";"},
				{nLine: 4,  nColumn: 8,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 4,  nColumn: 9,  level: 0, type: TokenType.REGEXP,                text: "/\t/"},
				{nLine: 4,  nColumn: 14, level: 0, type: TokenType.OTHER,                 text: ";"},
				{nLine: 4,  nColumn: 15, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 4,  nColumn: 16, level: 0, type: TokenType.STRING,                text: "\"L1\\\n\tL2\""},
				{nLine: 5,  nColumn: 8,  level: 0, type: TokenType.OTHER,                 text: ";"},
				{nLine: 5,  nColumn: 9,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 5,  nColumn: 10, level: 0, type: TokenType.STRING,                text: "\"😀\""},
				{nLine: 5,  nColumn: 13, level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 5,  nColumn: 13, level: 0, type: TokenType.OTHER,                 text: ";"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Stream',
	async () =>
	{	for (const encoding of ['utf-8', 'utf-16le', 'utf-16be', 'windows-1252'])
		{	for (let chunkSize=1; chunkSize<90; chunkSize++)
			{	for (const isArray of [false, true])
				{	for (const isByob of [null, false, true])
					{	const comment = encoding=='windows-1252' ? `/*A B\nC*/` : `/*Aф៘\n😀*/`;
						const string = encoding=='windows-1252' ? '"A"' : '"😀"';
						const source = stringReader(`${comment}Abc\r\n123\t45\t6\t7'\t8\t9'; \`\t012\t\${'345'}6\${7\n}\`; \`\`; /\t/; "L1\\\n\tL2"; ${string};`, isByob, chunkSize, encoding);
						const tokens = [];
						if (!isArray)
						{	for await (const token of jstokStream(source, 4, 1, 1, new TextDecoder(encoding)))
							{	tokens.push(token);
							}
						}
						else
						{	for await (const tt of jstokStreamArray(source, 4, 1, 1, new TextDecoder(encoding)))
							{	for (const token of tt)
								{	tokens.push(token);
								}
							}
						}
						assertEquals
						(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
							[	{nLine: 1, nColumn: 1,  level: 0, type: TokenType.COMMENT,               text: comment},
								{nLine: 2, nColumn: 4,  level: 0, type: TokenType.IDENT,                 text: "Abc"},
								{nLine: 2, nColumn: 7,  level: 0, type: TokenType.WHITESPACE,            text: "\r\n"},
								{nLine: 3, nColumn: 1,  level: 0, type: TokenType.NUMBER,                text: "123"},
								{nLine: 3, nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "\t"},
								{nLine: 3, nColumn: 5,  level: 0, type: TokenType.NUMBER,                text: "45"},
								{nLine: 3, nColumn: 7,  level: 0, type: TokenType.WHITESPACE,            text: "\t"},
								{nLine: 3, nColumn: 9,  level: 0, type: TokenType.NUMBER,                text: "6"},
								{nLine: 3, nColumn: 10, level: 0, type: TokenType.WHITESPACE,            text: "\t"},
								{nLine: 3, nColumn: 13, level: 0, type: TokenType.NUMBER,                text: "7"},
								{nLine: 3, nColumn: 14, level: 0, type: TokenType.STRING,                text: "'\t8\t9'"},
								{nLine: 3, nColumn: 23, level: 0, type: TokenType.OTHER,                 text: ";"},
								{nLine: 3, nColumn: 24, level: 0, type: TokenType.WHITESPACE,            text: " "},
								{nLine: 3, nColumn: 25, level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`\t012\t${"},
								{nLine: 3, nColumn: 35, level: 1, type: TokenType.STRING,                text: "'345'"},
								{nLine: 3, nColumn: 40, level: 0, type: TokenType.STRING_TEMPLATE_MID,   text: "}6${"},
								{nLine: 3, nColumn: 44, level: 1, type: TokenType.NUMBER,                text: "7"},
								{nLine: 3, nColumn: 45, level: 1, type: TokenType.WHITESPACE,            text: "\n"},
								{nLine: 4, nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}`"},
								{nLine: 4, nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: ";"},
								{nLine: 4, nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: " "},
								{nLine: 4, nColumn: 5,  level: 0, type: TokenType.STRING_TEMPLATE,       text: "``"},
								{nLine: 4, nColumn: 7,  level: 0, type: TokenType.OTHER,                 text: ";"},
								{nLine: 4, nColumn: 8,  level: 0, type: TokenType.WHITESPACE,            text: " "},
								{nLine: 4, nColumn: 9,  level: 0, type: TokenType.REGEXP,                text: "/\t/"},
								{nLine: 4, nColumn: 14, level: 0, type: TokenType.OTHER,                 text: ";"},
								{nLine: 4, nColumn: 15, level: 0, type: TokenType.WHITESPACE,            text: " "},
								{nLine: 4, nColumn: 16, level: 0, type: TokenType.STRING,                text: '"L1\\\n\tL2"'},
								{nLine: 5, nColumn: 8,  level: 0, type: TokenType.OTHER,                 text: ";"},
								{nLine: 5, nColumn: 9,  level: 0, type: TokenType.WHITESPACE,            text: " "},
								{nLine: 5, nColumn: 10, level: 0, type: TokenType.STRING,                text: string},
								{nLine: 5, nColumn: 13, level: 0, type: TokenType.OTHER,                 text: ";"},
							]
						);
					}
				}
			}
		}
	}
);

Deno.test
(	'Reader potential RegExp',
	async () =>
	{	for (const isByob of [null, false, true])
		{	const source = stringReader('/./;', isByob, 3);
			const tokens = [];
			for await (const token of jstokStream(source))
			{	tokens.push(token);
			}
			assertEquals
			(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
				[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.REGEXP, text: "/./"},
					{nLine: 1, nColumn: 4, level: 0, type: TokenType.OTHER,  text: ";"},
				]
			);
			assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
		}
	}
);

Deno.test
(	'Shebang',
	() =>
	{	const source = normalizeIndent
		(	`	#!cat
				// Hello
				var hello;
			`
		);
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1,  level: 0, type: TokenType.COMMENT,      text: "#!cat"},
				{nLine: 1, nColumn: 1,  level: 0, type: TokenType.WHITESPACE,   text: "\n"},
				{nLine: 2, nColumn: 1,  level: 0, type: TokenType.COMMENT,      text: "// Hello"},
				{nLine: 2, nColumn: 9,  level: 0, type: TokenType.WHITESPACE,   text: "\n"},
				{nLine: 3, nColumn: 1,  level: 0, type: TokenType.IDENT,        text: "var"},
				{nLine: 3, nColumn: 4,  level: 0, type: TokenType.WHITESPACE,   text: " "},
				{nLine: 3, nColumn: 5,  level: 0, type: TokenType.IDENT,        text: "hello"},
				{nLine: 3, nColumn: 10, level: 0, type: TokenType.MORE_REQUEST, text: ";"},
				{nLine: 3, nColumn: 10, level: 0, type: TokenType.OTHER,        text: ";"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Shebang only',
	() =>
	{	const source = `#!cat /etc/passwd`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.COMMENT, text: "#!cat /etc/passwd"}
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Identifiers',
	() =>
	{	const source = `One  two  _thr_ee  $f_o$ur$_  #$five  @_six$`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "One"},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 6,  level: 0, type: TokenType.IDENT,                 text: "two"},
				{nLine: 1,  nColumn: 9,  level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 11, level: 0, type: TokenType.IDENT,                 text: "_thr_ee"},
				{nLine: 1,  nColumn: 18, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 20, level: 0, type: TokenType.IDENT,                 text: "$f_o$ur$_"},
				{nLine: 1,  nColumn: 29, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 31, level: 0, type: TokenType.IDENT,                 text: "#$five"},
				{nLine: 1,  nColumn: 37, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 39, level: 0, type: TokenType.MORE_REQUEST,          text: "@_six$"},
				{nLine: 1,  nColumn: 39, level: 0, type: TokenType.ATTRIBUTE,             text: "@_six$"},
			]
		);
		assertEquals(tokens[tokens.length-1].nColumn - 1 + tokens[tokens.length-1].text.length, source.length);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Numbers',
	() =>
	{	const source = `0  1.1  .1  1.  123.456e9  123.456E-9  1.e3  .1e3  1.e+3  0n  0b01  0b01n  0o755  0o755n  0x2BE  0x2BEn`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.NUMBER,                text: "0"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.NUMBER,                text: "1.1"},
				{nLine: 1,  nColumn: 7,  level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 9,  level: 0, type: TokenType.NUMBER,                text: ".1"},
				{nLine: 1,  nColumn: 11, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 13, level: 0, type: TokenType.NUMBER,                text: "1."},
				{nLine: 1,  nColumn: 15, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 17, level: 0, type: TokenType.NUMBER,                text: "123.456e9"},
				{nLine: 1,  nColumn: 26, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 28, level: 0, type: TokenType.NUMBER,                text: "123.456E-9"},
				{nLine: 1,  nColumn: 38, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 40, level: 0, type: TokenType.NUMBER,                text: "1.e3"},
				{nLine: 1,  nColumn: 44, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 46, level: 0, type: TokenType.NUMBER,                text: ".1e3"},
				{nLine: 1,  nColumn: 50, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 52, level: 0, type: TokenType.NUMBER,                text: "1.e+3"},
				{nLine: 1,  nColumn: 57, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 59, level: 0, type: TokenType.NUMBER,                text: "0n"},
				{nLine: 1,  nColumn: 61, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 63, level: 0, type: TokenType.NUMBER,                text: "0b01"},
				{nLine: 1,  nColumn: 67, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 69, level: 0, type: TokenType.NUMBER,                text: "0b01n"},
				{nLine: 1,  nColumn: 74, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 76, level: 0, type: TokenType.NUMBER,                text: "0o755"},
				{nLine: 1,  nColumn: 81, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 83, level: 0, type: TokenType.NUMBER,                text: "0o755n"},
				{nLine: 1,  nColumn: 89, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 91, level: 0, type: TokenType.NUMBER,                text: "0x2BE"},
				{nLine: 1,  nColumn: 96, level: 0, type: TokenType.WHITESPACE,            text: "  "},
				{nLine: 1,  nColumn: 98, level: 0, type: TokenType.MORE_REQUEST,          text: "0x2BEn"},
				{nLine: 1,  nColumn: 98, level: 0, type: TokenType.NUMBER,                text: "0x2BEn"},
			]
		);
		assertEquals(tokens[tokens.length-1].nColumn - 1 + tokens[tokens.length-1].text.length, source.length);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Strings',
	() =>
	{	const source = normalizeIndent
		(	`	'One \\n\\xA0\\' '
				"One \\n\\xA0\\" "
				\`One \\n\\xA0\\\`
					Two\`
				\`One \${2}, \${\`Three\`} Four\`
				{
				\`One \${2}, \${\`Three \${3}\`} Four\`
				}
			`
		);
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.STRING, text: "'One \\n\\xA0\\' '"},
				{nLine: 1, nColumn: 16, level: 0, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 2, nColumn: 1, level: 0, type: TokenType.STRING, text: '"One \\n\\xA0\\" "' },
				{nLine: 2, nColumn: 16, level: 0, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 3, nColumn: 1, level: 0, type: TokenType.STRING_TEMPLATE, text: "`One \\n\\xA0\\`\n\tTwo`"},
				{nLine: 4, nColumn: 9, level: 0, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 5, nColumn: 1, level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`One ${"},
				{nLine: 5, nColumn: 8, level: 1, type: TokenType.NUMBER, text: "2"},
				{nLine: 5, nColumn: 9, level: 0, type: TokenType.STRING_TEMPLATE_MID, text: "}, ${"},
				{nLine: 5, nColumn: 14, level: 1, type: TokenType.STRING_TEMPLATE, text: "`Three`"},
				{nLine: 5, nColumn: 21, level: 0, type: TokenType.STRING_TEMPLATE_END, text: "} Four`"},
				{nLine: 5, nColumn: 28, level: 0, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 6, nColumn: 1, level: 0, type: TokenType.OTHER, text: "{"},
				{nLine: 6, nColumn: 2, level: 1, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 7, nColumn: 1, level: 1, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`One ${"},
				{nLine: 7, nColumn: 8, level: 2, type: TokenType.NUMBER, text: "2"},
				{nLine: 7, nColumn: 9, level: 1, type: TokenType.STRING_TEMPLATE_MID, text: "}, ${"},
				{nLine: 7, nColumn: 14, level: 2, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`Three ${"},
				{nLine: 7, nColumn: 23, level: 3, type: TokenType.NUMBER, text: "3"},
				{nLine: 7, nColumn: 24, level: 2, type: TokenType.STRING_TEMPLATE_END, text: "}`"},
				{nLine: 7, nColumn: 26, level: 1, type: TokenType.STRING_TEMPLATE_END, text: "} Four`"},
				{nLine: 7, nColumn: 33, level: 1, type: TokenType.WHITESPACE, text: "\n"},
				{nLine: 8, nColumn: 1, level: 1, type: TokenType.MORE_REQUEST, text: "}"},
				{nLine: 8, nColumn: 1, level: 0, type: TokenType.OTHER, text: "}"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'RegExp',
	() =>
	{	const source = `/^text$/sig + 1 /2e1/ 3 / /[a-z\\-]{3,4}\\?(?:.)\\p{Letter}\\u{A}/u`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.REGEXP,                text: "/^text$/sig"},
				{nLine: 1,  nColumn: 12, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 13, level: 0, type: TokenType.OTHER,                 text: "+"},
				{nLine: 1,  nColumn: 14, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 15, level: 0, type: TokenType.NUMBER,                text: "1"},
				{nLine: 1,  nColumn: 16, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 17, level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 18, level: 0, type: TokenType.NUMBER,                text: "2e1"},
				{nLine: 1,  nColumn: 21, level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 22, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 23, level: 0, type: TokenType.NUMBER,                text: "3"},
				{nLine: 1,  nColumn: 24, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 25, level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 26, level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 27, level: 0, type: TokenType.MORE_REQUEST,          text: "/[a-z\\-]{3,4}\\?(?:.)\\p{Letter}\\u{A}/u"},
				{nLine: 1,  nColumn: 27, level: 0, type: TokenType.REGEXP,                text: "/[a-z\\-]{3,4}\\?(?:.)\\p{Letter}\\u{A}/u"},
			]
		);
		assertEquals(tokens[tokens.length-1].nColumn - 1 + tokens[tokens.length-1].text.length, source.length);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Brackets',
	() =>
	{	const source = 'L0(L1(L2)[L2]{L2`L2${L3}L2`L2}L1)L0';
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "L0"},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "("},
				{nLine: 1,  nColumn: 4,  level: 1, type: TokenType.IDENT,                 text: "L1"},
				{nLine: 1,  nColumn: 6,  level: 1, type: TokenType.OTHER,                 text: "("},
				{nLine: 1,  nColumn: 7,  level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 9,  level: 1, type: TokenType.OTHER,                 text: ")"},
				{nLine: 1,  nColumn: 10, level: 1, type: TokenType.OTHER,                 text: "["},
				{nLine: 1,  nColumn: 11, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 13, level: 1, type: TokenType.OTHER,                 text: "]"},
				{nLine: 1,  nColumn: 14, level: 1, type: TokenType.OTHER,                 text: "{"},
				{nLine: 1,  nColumn: 15, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 17, level: 2, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`L2${"},
				{nLine: 1,  nColumn: 22, level: 3, type: TokenType.IDENT,                 text: "L3"},
				{nLine: 1,  nColumn: 24, level: 2, type: TokenType.STRING_TEMPLATE_END,   text: "}L2`"},
				{nLine: 1,  nColumn: 28, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 30, level: 1, type: TokenType.OTHER,                 text: "}"},
				{nLine: 1,  nColumn: 31, level: 1, type: TokenType.IDENT,                 text: "L1"},
				{nLine: 1,  nColumn: 33, level: 0, type: TokenType.OTHER,                 text: ")"},
				{nLine: 1,  nColumn: 34, level: 0, type: TokenType.MORE_REQUEST,          text: "L0"},
				{nLine: 1,  nColumn: 34, level: 0, type: TokenType.IDENT,                 text: "L0"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Parallel',
	() =>
	{	const source = 'L0(L1(L2)[L2]{L2`L2${L3}L2`L2}L1)L0';
		const it1 = jstok(source);
		const it2 = jstok(source);
		const tokens1: Token[] = [];
		const tokens2: Token[] = [];
		for (let done=0; done!=3;)
		{	const which = Math.random() > 0.5;
			const token = (which ? it1 : it2).next().value;
			if (!token)
			{	done |= which ? 1 : 2;
			}
			else
			{	(which ? tokens1 : tokens2).push(token);
			}
		}
		assertEquals(tokens1, tokens2);
		assertEquals(tokens1.join(''), source);
		assertEquals
		(	tokens1.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "L0"},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "("},
				{nLine: 1,  nColumn: 4,  level: 1, type: TokenType.IDENT,                 text: "L1"},
				{nLine: 1,  nColumn: 6,  level: 1, type: TokenType.OTHER,                 text: "("},
				{nLine: 1,  nColumn: 7,  level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 9,  level: 1, type: TokenType.OTHER,                 text: ")"},
				{nLine: 1,  nColumn: 10, level: 1, type: TokenType.OTHER,                 text: "["},
				{nLine: 1,  nColumn: 11, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 13, level: 1, type: TokenType.OTHER,                 text: "]"},
				{nLine: 1,  nColumn: 14, level: 1, type: TokenType.OTHER,                 text: "{"},
				{nLine: 1,  nColumn: 15, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 17, level: 2, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`L2${"},
				{nLine: 1,  nColumn: 22, level: 3, type: TokenType.IDENT,                 text: "L3"},
				{nLine: 1,  nColumn: 24, level: 2, type: TokenType.STRING_TEMPLATE_END,   text: "}L2`"},
				{nLine: 1,  nColumn: 28, level: 2, type: TokenType.IDENT,                 text: "L2"},
				{nLine: 1,  nColumn: 30, level: 1, type: TokenType.OTHER,                 text: "}"},
				{nLine: 1,  nColumn: 31, level: 1, type: TokenType.IDENT,                 text: "L1"},
				{nLine: 1,  nColumn: 33, level: 0, type: TokenType.OTHER,                 text: ")"},
				{nLine: 1,  nColumn: 34, level: 0, type: TokenType.MORE_REQUEST,          text: "L0"},
				{nLine: 1,  nColumn: 34, level: 0, type: TokenType.IDENT,                 text: "L0"},
			]
		);
	}
);

Deno.test
(	'Other tokens',
	() =>
	{	const source = `....+++---~!***a/%<<>>>>><=>====!====&&&|||^???.?+=-=*=**=/=%=<<=>>=>>>=&=&&=|=||=??=,`;
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "..."},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.OTHER,                 text: "."},
				{nLine: 1,  nColumn: 5,  level: 0, type: TokenType.OTHER,                 text: "++"},
				{nLine: 1,  nColumn: 7,  level: 0, type: TokenType.OTHER,                 text: "+"},
				{nLine: 1,  nColumn: 8,  level: 0, type: TokenType.OTHER,                 text: "--"},
				{nLine: 1,  nColumn: 10, level: 0, type: TokenType.OTHER,                 text: "-"},
				{nLine: 1,  nColumn: 11, level: 0, type: TokenType.OTHER,                 text: "~"},
				{nLine: 1,  nColumn: 12, level: 0, type: TokenType.OTHER,                 text: "!"},
				{nLine: 1,  nColumn: 13, level: 0, type: TokenType.OTHER,                 text: "**"},
				{nLine: 1,  nColumn: 15, level: 0, type: TokenType.OTHER,                 text: "*"},
				{nLine: 1,  nColumn: 16, level: 0, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 17, level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 18, level: 0, type: TokenType.OTHER,                 text: "%"},
				{nLine: 1,  nColumn: 19, level: 0, type: TokenType.OTHER,                 text: "<<"},
				{nLine: 1,  nColumn: 21, level: 0, type: TokenType.OTHER,                 text: ">>>"},
				{nLine: 1,  nColumn: 24, level: 0, type: TokenType.OTHER,                 text: ">>"},
				{nLine: 1,  nColumn: 26, level: 0, type: TokenType.OTHER,                 text: "<="},
				{nLine: 1,  nColumn: 28, level: 0, type: TokenType.OTHER,                 text: ">="},
				{nLine: 1,  nColumn: 30, level: 0, type: TokenType.OTHER,                 text: "==="},
				{nLine: 1,  nColumn: 33, level: 0, type: TokenType.OTHER,                 text: "!=="},
				{nLine: 1,  nColumn: 36, level: 0, type: TokenType.OTHER,                 text: "=="},
				{nLine: 1,  nColumn: 38, level: 0, type: TokenType.OTHER,                 text: "&&"},
				{nLine: 1,  nColumn: 40, level: 0, type: TokenType.OTHER,                 text: "&"},
				{nLine: 1,  nColumn: 41, level: 0, type: TokenType.OTHER,                 text: "||"},
				{nLine: 1,  nColumn: 43, level: 0, type: TokenType.OTHER,                 text: "|"},
				{nLine: 1,  nColumn: 44, level: 0, type: TokenType.OTHER,                 text: "^"},
				{nLine: 1,  nColumn: 45, level: 0, type: TokenType.OTHER,                 text: "??"},
				{nLine: 1,  nColumn: 47, level: 0, type: TokenType.OTHER,                 text: "?."},
				{nLine: 1,  nColumn: 49, level: 0, type: TokenType.OTHER,                 text: "?"},
				{nLine: 1,  nColumn: 50, level: 0, type: TokenType.OTHER,                 text: "+="},
				{nLine: 1,  nColumn: 52, level: 0, type: TokenType.OTHER,                 text: "-="},
				{nLine: 1,  nColumn: 54, level: 0, type: TokenType.OTHER,                 text: "*="},
				{nLine: 1,  nColumn: 56, level: 0, type: TokenType.OTHER,                 text: "**="},
				{nLine: 1,  nColumn: 59, level: 0, type: TokenType.MORE_REQUEST,          text: "/=%=<<=>>=>>>=&=&&=|=||=??=,"},
				{nLine: 1,  nColumn: 59, level: 0, type: TokenType.OTHER,                 text: "/="},
				{nLine: 1,  nColumn: 61, level: 0, type: TokenType.OTHER,                 text: "%="},
				{nLine: 1,  nColumn: 63, level: 0, type: TokenType.OTHER,                 text: "<<="},
				{nLine: 1,  nColumn: 66, level: 0, type: TokenType.OTHER,                 text: ">>="},
				{nLine: 1,  nColumn: 69, level: 0, type: TokenType.OTHER,                 text: ">>>="},
				{nLine: 1,  nColumn: 73, level: 0, type: TokenType.OTHER,                 text: "&="},
				{nLine: 1,  nColumn: 75, level: 0, type: TokenType.OTHER,                 text: "&&="},
				{nLine: 1,  nColumn: 78, level: 0, type: TokenType.OTHER,                 text: "|="},
				{nLine: 1,  nColumn: 80, level: 0, type: TokenType.OTHER,                 text: "||="},
				{nLine: 1,  nColumn: 83, level: 0, type: TokenType.OTHER,                 text: "??="},
				{nLine: 1,  nColumn: 86, level: 0, type: TokenType.MORE_REQUEST,          text: ","},
				{nLine: 1,  nColumn: 86, level: 0, type: TokenType.OTHER,                 text: ","},
			]
		);
		assertEquals(tokens[tokens.length-1].nColumn - 1 + tokens[tokens.length-1].text.length, source.length);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Syntax error',
	() =>
	{	let source = `L0(`;
		let tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.IDENT, text: "L0"},
				{nLine: 1, nColumn: 3, level: 0, type: TokenType.MORE_REQUEST, text: "("},
				{nLine: 1, nColumn: 3, level: 0, type: TokenType.OTHER, text: "("},
				{nLine: 1, nColumn: 4, level: 1, type: TokenType.ERROR, text: ""},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = `L0(L1))`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.IDENT, text: "L0"},
				{nLine: 1, nColumn: 3, level: 0, type: TokenType.OTHER, text: "("},
				{nLine: 1, nColumn: 4, level: 1, type: TokenType.IDENT, text: "L1"},
				{nLine: 1, nColumn: 6, level: 0, type: TokenType.OTHER, text: ")"},
				{nLine: 1, nColumn: 7, level: 0, type: TokenType.MORE_REQUEST, text: ")"},
				{nLine: 1, nColumn: 7, level: 0, type: TokenType.ERROR, text: ")"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = `L0(L1])`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "L0"},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "("},
				{nLine: 1,  nColumn: 4,  level: 1, type: TokenType.IDENT,                 text: "L1"},
				{nLine: 1,  nColumn: 6,  level: 1, type: TokenType.ERROR,                 text: "]"},
				{nLine: 1,  nColumn: 7,  level: 1, type: TokenType.MORE_REQUEST,          text: ")"},
				{nLine: 1,  nColumn: 7,  level: 0, type: TokenType.OTHER,                 text: ")"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = `L0(L1)}`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.IDENT, text: "L0"},
				{nLine: 1, nColumn: 3, level: 0, type: TokenType.OTHER, text: "("},
				{nLine: 1, nColumn: 4, level: 1, type: TokenType.IDENT, text: "L1"},
				{nLine: 1, nColumn: 6, level: 0, type: TokenType.OTHER, text: ")"},
				{nLine: 1, nColumn: 7, level: 0, type: TokenType.MORE_REQUEST, text: "}"},
				{nLine: 1, nColumn: 7, level: 0, type: TokenType.ERROR, text: "}"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = '-\x7F';
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.OTHER, text: "-"},
				{nLine: 1, nColumn: 2, level: 0, type: TokenType.MORE_REQUEST, text: "\x7F"},
				{nLine: 1, nColumn: 2, level: 0, type: TokenType.ERROR, text: "\x7F"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = '"\t>\n"';
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.ERROR,                 text: '"'},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.WHITESPACE,            text: "\t"},
				{nLine: 1,  nColumn: 5,  level: 0, type: TokenType.OTHER,                 text: ">"},
				{nLine: 1,  nColumn: 6,  level: 0, type: TokenType.WHITESPACE,            text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.MORE_REQUEST,          text: '"'},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.ERROR,                 text: '"'},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));

		source = '`\t>';
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.MORE_REQUEST, text: "`\t>"},
				{nLine: 1, nColumn: 1, level: 0, type: TokenType.ERROR, text: "`\t>"},
			]
		);

		source = '`${1}>';
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1, nColumn: 1, level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`${"},
				{nLine: 1, nColumn: 4, level: 1, type: TokenType.NUMBER, text: "1"},
				{nLine: 1, nColumn: 5, level: 1, type: TokenType.MORE_REQUEST, text: "}>"},
				{nLine: 1, nColumn: 5, level: 0, type: TokenType.ERROR, text: "}>"},
			]
		);
	}
);

Deno.test
(	'Invalid and exotic RegExp',
	() =>
	{	let source = `/)/;`;
		let tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.ERROR,                 text: ")"},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.OTHER,                 text: ";"},
			]
		);

		source = `/a\r/;`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.WHITESPACE,            text: "\r"},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 2,  nColumn: 2,  level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 2,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: ";"},
			]
		);

		source = `/[\r/;`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: "["},
				{nLine: 1,  nColumn: 3,  level: 1, type: TokenType.WHITESPACE,            text: "\r"},
				{nLine: 2,  nColumn: 1,  level: 1, type: TokenType.MORE_REQUEST,          text: "/;"},
				{nLine: 2,  nColumn: 1,  level: 1, type: TokenType.OTHER,                 text: "/"},
				{nLine: 2,  nColumn: 2,  level: 1, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 2,  nColumn: 2,  level: 1, type: TokenType.OTHER,                 text: ";"},
				{nLine: 2,  nColumn: 3,  level: 1, type: TokenType.ERROR,                 text: ""},
			]
		);

		source = `/[`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.MORE_REQUEST,          text: "["},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: "["},
				{nLine: 1,  nColumn: 3,  level: 1, type: TokenType.ERROR,                 text: ""},
			]
		);

		source = `/{a`;
		tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.MORE_REQUEST,          text: "/{a"},
				{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.OTHER,                 text: "/"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: "{"},
				{nLine: 1,  nColumn: 3,  level: 1, type: TokenType.MORE_REQUEST,          text: "a"},
				{nLine: 1,  nColumn: 3,  level: 1, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 4,  level: 1, type: TokenType.ERROR,                 text: ""},
			]
		);
	}
);

Deno.test
(	'Token value',
	() =>
	{	let token = [...jstok('// Line comment ')][1]; // [0] is MORE_REQUEST
		assertEquals(token.getValue(), ' Line comment ');
		assertEquals(token.getNumberValue(), NaN);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('// Line comment \r')][0];
		assertEquals(token.getValue(), ' Line comment ');
		assertEquals(token.getNumberValue(), NaN);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('/* Comment */\n')][0];
		assertEquals(token.getValue(), ' Comment ');
		assertEquals(token.getNumberValue(), NaN);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('1.2e-3\r')][0];
		assertEquals(token.getValue(), '1.2e-3');
		assertEquals(token.getNumberValue(), 1.2e-3);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('1_2.3_4e-5_6\r')][0];
		assertEquals(token.getValue(), '1_2.3_4e-5_6');
		assertEquals(token.getNumberValue(), 1_2.3_4e-5_6);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('1234567890123456789012345678901234567890n\r')][0];
		assertEquals(token.getValue(), '1234567890123456789012345678901234567890n');
		assertEquals(token.getNumberValue(), 1234567890123456789012345678901234567890n);
		assertEquals(token.getRegExpValue(), /(?:)/);

		token = [...jstok('010\r')][0];
		assertEquals(token.getValue(), '010');
		assertEquals(token.getNumberValue(), 0o10);

		token = [...jstok('018\r')][0];
		assertEquals(token.getValue(), '018');
		assertEquals(token.getNumberValue(), 18);

		token = [...jstok('0.010\r')][0];
		assertEquals(token.getValue(), '0.010');
		assertEquals(token.getNumberValue(), 0.010);

		token = [...jstok('0o10\r')][0];
		assertEquals(token.getValue(), '0o10');
		assertEquals(token.getNumberValue(), 0o10);

		token = [...jstok('0x1f\r')][0];
		assertEquals(token.getValue(), '0x1f');
		assertEquals(token.getNumberValue(), 0x1f);

		token = [...jstok('0x1fn\r')][0];
		assertEquals(token.getValue(), '0x1fn');
		assertEquals(token.getNumberValue(), 0x1fn);

		token = [...jstok('" String "\n')][0];
		assertEquals(token.getValue(), ' String ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('" String\\t\\" "\n')][0];
		assertEquals(token.getValue(), ' String\t" ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok("' String\\t\\' '\n")][0];
		assertEquals(token.getValue(), " String\t' ");
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok("' String\\\r '\n")][0];
		assertEquals(token.getValue(), " String ");
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok("' String\\\n '\n")][0];
		assertEquals(token.getValue(), " String ");
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok("' String\\\r\n \\0\\1 \\0127 \\178 \\r\\n\\v\\b\\f \\x40\\xaF\\xAf \\u12AB\\uFE34\\uabcd \\u{1}\\u{a2B}\\u{F2345}\\u{102345}'\n")][0];
		assertEquals(token.getValue(), " String \0\x01 \n7 \x0F8 \r\n\v\b\f \x40\xaF\xAf \u12AB\uFE34\uabcd \u{1}\u{a2B}\u{F2345}\u{102345}");
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('` String `\n')][0];
		assertEquals(token.getValue(), ' String ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('`${0} String `\n')][2];
		assertEquals(token.getValue(), ' String ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('`${0} String ${1}`\n')][2];
		assertEquals(token.getValue(), ' String ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('` String ${0}`\n')][0];
		assertEquals(token.getValue(), ' String ');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('` String `\n')][1]; // MORE_REQUEST
		assertEquals(token.getValue(), '');
		assertEquals(token.getNumberValue(), NaN);

		token = [...jstok('/ABC/i\n')][0];
		assertEquals(token.getValue(), '/ABC/i');
		assertEquals(token.getNumberValue(), NaN);
		assertEquals(token.getRegExpValue(), /ABC/i);
	}
);

Deno.test
(	'String templates with braces',
	() =>
	{	const source = normalizeIndent
		(	`	a =
				\`	\${{}}
				\`;
			`
		);
		const tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "="},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`\t${"},
				{nLine: 2,  nColumn: 7,  level: 1, type: TokenType.OTHER,                 text: "{"},
				{nLine: 2,  nColumn: 8,  level: 1, type: TokenType.OTHER,                 text: "}"},
				{nLine: 2,  nColumn: 9,  level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}\n`"},
				{nLine: 3,  nColumn: 2,  level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 3,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: ";"}
			]
		);
	}
);

Deno.test
(	'String templates with comments',
	() =>
	{	const source = '`${ /*hello*/ }`';
		const tokens = [...jstok(source)];
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`${"},
				{nLine: 1,  nColumn: 4,  level: 1, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 5,  level: 1, type: TokenType.COMMENT,               text: "/*hello*/"},
				{nLine: 1,  nColumn: 14, level: 1, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 15, level: 1, type: TokenType.MORE_REQUEST,          text: "}`"},
				{nLine: 1,  nColumn: 15, level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}`"},
			]
		);
		assertEquals(eval('[' + tokens.map(t => t.debug()).join(',') + ']'), tokens.map(v => Object.assign({}, v)));
	}
);

Deno.test
(	'Nested string templates',
	() =>
	{	let source = normalizeIndent
		(	`	a =
				\`	\${
						\`Hello\`
					}
				\`;
			`
		);
		let tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "="},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`\t${"},
				{nLine: 2,  nColumn: 7,  level: 1, type: TokenType.WHITESPACE,            text: "\n\t\t"},
				{nLine: 3,  nColumn: 9,  level: 1, type: TokenType.STRING_TEMPLATE,       text: "`Hello`"},
				{nLine: 3,  nColumn: 16, level: 1, type: TokenType.WHITESPACE,            text: "\n\t"},
				{nLine: 4,  nColumn: 5,  level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}\n`"},
				{nLine: 5,  nColumn: 2,  level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 5,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: ";"}
			]
		);

		source = normalizeIndent
		(	`	a =
				\`	\${
						\`Hello \${'all'}\`
					}
				\`;
			`
		);
		tokens = [...jstok(source)];
		assertEquals(tokens.join(''), source);
		assertEquals
		(	tokens.map(v => Object.assign<Record<never, never>, unknown>({}, v)),
			[	{nLine: 1,  nColumn: 1,  level: 0, type: TokenType.IDENT,                 text: "a"},
				{nLine: 1,  nColumn: 2,  level: 0, type: TokenType.WHITESPACE,            text: " "},
				{nLine: 1,  nColumn: 3,  level: 0, type: TokenType.OTHER,                 text: "="},
				{nLine: 1,  nColumn: 4,  level: 0, type: TokenType.WHITESPACE,            text: "\n"},
				{nLine: 2,  nColumn: 1,  level: 0, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`\t${"},
				{nLine: 2,  nColumn: 7,  level: 1, type: TokenType.WHITESPACE,            text: "\n\t\t"},
				{nLine: 3,  nColumn: 9,  level: 1, type: TokenType.STRING_TEMPLATE_BEGIN, text: "`Hello ${"},
				{nLine: 3,  nColumn: 18, level: 2, type: TokenType.STRING,                text: "'all'"},
				{nLine: 3,  nColumn: 23, level: 1, type: TokenType.STRING_TEMPLATE_END,   text: "}`"},
				{nLine: 3,  nColumn: 25, level: 1, type: TokenType.WHITESPACE,            text: "\n\t"},
				{nLine: 4,  nColumn: 5,  level: 0, type: TokenType.STRING_TEMPLATE_END,   text: "}\n`"},
				{nLine: 5,  nColumn: 2,  level: 0, type: TokenType.MORE_REQUEST,          text: ";"},
				{nLine: 5,  nColumn: 2,  level: 0, type: TokenType.OTHER,                 text: ";"}
			]
		);
	}
);
