import {jstok, TokenType} from '../../mod.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.14';

// Test unicode identifiers and edge cases
Deno.test
(	'Unicode identifiers',
	() =>
	{	const source = 'café $мир _中文 Ελληνικά x😀';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals
		(	tokens.map(v => ({type: v.type, text: v.text})),
			[	{type: TokenType.IDENT, text: "café"},
				{type: TokenType.WHITESPACE, text: " "},
				{type: TokenType.IDENT, text: "$мир"},
				{type: TokenType.WHITESPACE, text: " "},
				{type: TokenType.IDENT, text: "_中文"},
				{type: TokenType.WHITESPACE, text: " "},
				{type: TokenType.IDENT, text: "Ελληνικά"},
				{type: TokenType.WHITESPACE, text: " "},
				{type: TokenType.IDENT, text: "x"},
				{type: TokenType.ERROR, text: "😀"},
			]
		);
	}
);

// Test edge cases with numbers - incomplete numbers are still parsed as numbers
Deno.test
(	'Number edge cases',
	() =>
	{	// These incomplete number tokens are identified as numbers by the tokenizer
		const source = '0b; 0x; 0o; 0.;';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.OTHER);
		const numTokens = tokens.filter(t => t.type === TokenType.NUMBER);
		assertEquals(numTokens.length, 4);
		assertEquals(numTokens[0].text, "0");
		assertEquals(numTokens[1].text, "0");
		assertEquals(numTokens[2].text, "0");
		assertEquals(numTokens[3].text, "0.");

		// Scientific notation
		const source2 = '0e1 0E1 0.e1 .1e1 1e1 1.e1 9_9_9n 0xFFFFFFFFFFFFFFFFn';
		const tokens2 = [...jstok(source2)].filter(t => t.type === TokenType.NUMBER);
		assertEquals(tokens2[0].getNumberValue(), 0); // 0e1
		assertEquals(tokens2[1].getNumberValue(), 0); // 0E1
		assertEquals(tokens2[2].getNumberValue(), 0); // 0.e1
		assertEquals(tokens2[3].getNumberValue(), 1); // .1e1
		assertEquals(tokens2[4].getNumberValue(), 10); // 1e1
		assertEquals(tokens2[5].getNumberValue(), 10); // 1.e1
		assertEquals(tokens2[6].getNumberValue(), 999n); // 9_9_9n
		assertEquals(tokens2[7].getNumberValue(), 0xFFFFFFFFFFFFFFFFn); // 0xFFFFFFFFFFFFFFFFn
	}
);

// Test escape sequences in strings
Deno.test
(	'String escape sequences',
	() =>
	{	// Test all escape sequences
		const token1 = [...jstok("'\\0'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token1.getValue(), '\0');

		const token2 = [...jstok("'\\00'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token2.getValue(), '\0');

		const token3 = [...jstok("'\\000'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token3.getValue(), '\0');

		const token4 = [...jstok("'\\377'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token4.getValue(), '\xFF');

		const token5 = [...jstok("'\\400'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token5.getValue(), ' 0'); // \40 = space, followed by 0

		const token6 = [...jstok("'\\x00'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token6.getValue(), '\x00');

		const token7 = [...jstok("'\\xFF'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token7.getValue(), '\xFF');

		const token8 = [...jstok("'\\u0000'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token8.getValue(), '\u0000');

		const token9 = [...jstok("'\\uFFFF'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token9.getValue(), '\uFFFF');

		const token10 = [...jstok("'\\u{0}'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token10.getValue(), '\u{0}');

		const token11 = [...jstok("'\\u{10FFFF}'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token11.getValue(), '\u{10FFFF}');

		const token12 = [...jstok("'\\u{1F600}'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token12.getValue(), '😀');

		// Line continuation
		const token13 = [...jstok("'a\\\nb'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token13.getValue(), 'ab');

		const token14 = [...jstok("'a\\\rb'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token14.getValue(), 'ab');

		const token15 = [...jstok("'a\\\r\nb'")].filter(t => t.type !== TokenType.MORE_REQUEST)[0];
		assertEquals(token15.getValue(), 'ab');
	}
);

// Test empty strings
Deno.test
(	'Empty strings',
	() =>
	{	const source = `'' "" \`\``;
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[0].getValue(), '');
		assertEquals(tokens[1].getValue(), '');
		assertEquals(tokens[2].getValue(), '');
	}
);

// Test unterminated strings
Deno.test
(	'Unterminated strings',
	() =>
	{	let source = "'hello";
		let tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		// Unterminated string
		assertEquals(tokens[0].type, TokenType.STRING);
		assertEquals(tokens[0].text, "'hello");

		source = '"hello';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].type, TokenType.STRING);
		assertEquals(tokens[0].text, '"hello');

		source = "`hello";
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].type, TokenType.ERROR);
		assertEquals(tokens[0].text, '`hello');
	}
);

// Test deeply nested structures
Deno.test
(	'Deeply nested structures',
	() =>
	{	const source = '((((((((((a))))))))))';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		let maxLevel = 0;
		for (const token of tokens)
		{	if (token.level > maxLevel)
			{	maxLevel = token.level;
			}
		}
		assertEquals(maxLevel, 10);
		assertEquals(tokens.filter(t => t.level === 10 && t.type === TokenType.IDENT).length, 1);
	}
);

// Test deeply nested string templates
Deno.test
(	'Deeply nested string templates',
	() =>
	{	const source = '`${`${`${a}`}`}`';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		let maxLevel = 0;
		for (const token of tokens)
		{	if (token.level > maxLevel)
			{	maxLevel = token.level;
			}
		}
		assertEquals(maxLevel, 3);
		const identToken = tokens.find(t => t.type === TokenType.IDENT);
		assertEquals(identToken?.level, 3);
	}
);

// Test regexp flags
Deno.test
(	'RegExp flags',
	() =>
	{	const source = '/test/; /test/g; /test/i; /test/m; /test/s; /test/u; /test/y; /test/gimsuyd; /test/gim';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.REGEXP);
		assertEquals(tokens[0].text, '/test/');
		assertEquals(tokens[1].text, '/test/g');
		assertEquals(tokens[2].text, '/test/i');
		assertEquals(tokens[3].text, '/test/m');
		assertEquals(tokens[4].text, '/test/s');
		assertEquals(tokens[5].text, '/test/u');
		assertEquals(tokens[6].text, '/test/y');
		assertEquals(tokens[7].text, '/test/gimsuyd');
		assertEquals(tokens[8].text, '/test/gim');

		// Test RegExp values
		assertEquals(tokens[0].getRegExpValue().source, 'test');
		assertEquals(tokens[1].getRegExpValue().global, true);
		assertEquals(tokens[2].getRegExpValue().ignoreCase, true);
		assertEquals(tokens[3].getRegExpValue().multiline, true);
		assertEquals(tokens[4].getRegExpValue().dotAll, true);
		assertEquals(tokens[5].getRegExpValue().unicode, true);
		assertEquals(tokens[6].getRegExpValue().sticky, true);
	}
);

// Test regexp character classes
Deno.test
(	'RegExp character classes',
	() =>
	{	const source = '/[abc]/; /[^abc]/; /[a-z]/; /[a-zA-Z0-9_]/; /[\\]]/; /[\\[]/; /[\\-]/; /[\\\\]/; /[\\]]]/';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.REGEXP);
		assertEquals(tokens.length, 9);
		assertEquals(tokens[0].text, '/[abc]/');
		assertEquals(tokens[1].text, '/[^abc]/');
		assertEquals(tokens[2].text, '/[a-z]/');
		assertEquals(tokens[3].text, '/[a-zA-Z0-9_]/');
		assertEquals(tokens[4].text, '/[\\]]/');
		assertEquals(tokens[5].text, '/[\\[]/');
		assertEquals(tokens[6].text, '/[\\-]/');
		assertEquals(tokens[7].text, '/[\\\\]/');
		assertEquals(tokens[8].text, '/[\\]]]/');
	}
);

// Test regexp with division operator
Deno.test
(	'RegExp vs division operator',
	() =>
	{	// After identifier - division
		let source = 'a / b';
		let tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[1].type, TokenType.OTHER);
		assertEquals(tokens[1].text, '/');

		// After return - regexp
		source = 'return /test/';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[1].type, TokenType.REGEXP);

		// After yield - regexp
		source = 'yield /test/';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[1].type, TokenType.REGEXP);

		// After = - regexp
		source = 'a = /test/';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[2].type, TokenType.REGEXP);

		// After ( - regexp
		source = '(/test/)';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[1].type, TokenType.REGEXP);

		// After ++ or -- - not regexp
		source = 'a++ / b';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[1].type, TokenType.OTHER); // /
	}
);

// Test multi-character operators
Deno.test
(	'Multi-character operators',
	() =>
	{	const source = '=== !== == != <= >= << >> >>> && || ?? ?. ?.( ) ?.[ ] !. => **= += -= *= /= %= <<= >>= >>>= &= |= ^= &&= ||= ??=';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		const expectedTexts = ['===', '!==', '==', '!=', '<=', '>=', '<<', '>>', '>>>', '&&', '||', '??', '?.', '?.(', ')', '?.[', ']', '!', '.', '=>', '**=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??='];
		assertEquals(tokens.map(t => t.text), expectedTexts);
	}
);

// Test optional chaining with bracket notation
Deno.test
(	'Optional chaining bracket notation',
	() =>
	{	const source = 'base?.[idx]';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens.length, 4);
		assertEquals(tokens[0].type, TokenType.IDENT);
		assertEquals(tokens[0].text, 'base');
		assertEquals(tokens[0].level, 0);
		assertEquals(tokens[1].type, TokenType.OTHER);
		assertEquals(tokens[1].text, '?.[');
		assertEquals(tokens[1].level, 0);
		assertEquals(tokens[2].type, TokenType.IDENT);
		assertEquals(tokens[2].text, 'idx');
		assertEquals(tokens[2].level, 1);
		assertEquals(tokens[3].type, TokenType.OTHER);
		assertEquals(tokens[3].text, ']');
		assertEquals(tokens[3].level, 0);

		// Also test that it reconstructs correctly
		assertEquals(tokens.map(t => t.text).join(''), source);
	}
);

// Test optional chaining with multiple variations
Deno.test
(	'Optional chaining variations',
	() =>
	{	const source = 'a?.b a?.[c] a?.(d) obj?.prop?.method?.()';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		const expectedTexts = ['a', '?.', 'b', 'a', '?.[', 'c', ']', 'a', '?.(', 'd', ')', 'obj', '?.', 'prop', '?.', 'method', '?.(', ')'];
		assertEquals(tokens.map(t => t.text), expectedTexts);
	}
);

// Test whitespace variations
Deno.test
(	'Whitespace variations',
	() =>
	{	const source = 'a \t\r\n\v\f b';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].type, TokenType.IDENT);
		assertEquals(tokens[1].type, TokenType.WHITESPACE);
		assertEquals(tokens[1].text, ' \t\r\n\v\f ');
		assertEquals(tokens[2].type, TokenType.IDENT);
	}
);

// Test comments
Deno.test
(	'Comment variations',
	() =>
	{	// Unterminated multiline comment
		let source = '/* hello';
		let tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].type, TokenType.ERROR);
		assertEquals(tokens[0].text, '/* hello');

		// Nested-looking multiline comments
		source = '/* hello /* world */ still comment */ a';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[0].type, TokenType.COMMENT);
		assertEquals(tokens[0].text, '/* hello /* world */');
		assertEquals(tokens[1].type, TokenType.IDENT);
		assertEquals(tokens[1].text, 'still');

		// Empty comment
		source = '/**/ //\n a';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens[0].type, TokenType.COMMENT);
		assertEquals(tokens[0].getValue(), '');
		assertEquals(tokens[1].type, TokenType.COMMENT);
		assertEquals(tokens[1].getValue(), '');
		assertEquals(tokens[2].type, TokenType.IDENT);
	}
);

// Test attributes
Deno.test
(	'Attributes',
	() =>
	{	const source = '@Component @decorator @_private @$special';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens.every(t => t.type === TokenType.ATTRIBUTE), true);
		assertEquals(tokens.map(t => t.text), ['@Component', '@decorator', '@_private', '@$special']);
	}
);

// Test private properties
Deno.test
(	'Private properties',
	() =>
	{	const source = '#private #_field #$var';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens.every(t => t.type === TokenType.IDENT), true);
		assertEquals(tokens.map(t => t.text), ['#private', '#_field', '#$var']);
	}
);

// Test mixed brackets
Deno.test
(	'Mixed bracket errors',
	() =>
	{	let source = '(]';
		let tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[1].type, TokenType.ERROR);

		source = '([)]';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[2].type, TokenType.ERROR);

		source = '{)';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[1].type, TokenType.ERROR);

		source = '[}';
		tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[1].type, TokenType.ERROR);
	}
);

// Test empty source
Deno.test
(	'Empty source',
	() =>
	{	const tokens = [...jstok('')];
		assertEquals(tokens.length, 0);
	}
);

// Test MORE_REQUEST functionality
Deno.test
(	'MORE_REQUEST continuation',
	() =>
	{	const it = jstok('hel');
		const token1 = it.next().value;
		assertEquals(token1?.type, TokenType.MORE_REQUEST);
		assertEquals(token1?.text, 'hel');

		const token2 = it.next('lo').value;
		assertEquals(token2?.type, TokenType.MORE_REQUEST);
		assertEquals(token2?.text, 'hello');

		const token3 = it.next().value;
		assertEquals(token3?.type, TokenType.IDENT);
		assertEquals(token3?.text, 'hello');

		const token4 = it.next().value;
		assertEquals(token4, undefined);
	}
);

// Test MORE_REQUEST with string continuation
Deno.test
(	'MORE_REQUEST string continuation',
	() =>
	{	const it = jstok('"hel');
		const token1 = it.next().value;
		assertEquals(token1?.type, TokenType.MORE_REQUEST);

		const token2 = it.next('lo"').value;
		assertEquals(token2?.type, TokenType.MORE_REQUEST);
		assertEquals(token2?.text, '"hello"');

		const token3 = it.next().value;
		assertEquals(token3?.type, TokenType.STRING);
		assertEquals(token3?.text, '"hello"');
		assertEquals(token3?.getValue(), 'hello');
	}
);

// Test MORE_REQUEST with template string
Deno.test
(	'MORE_REQUEST template string',
	() =>
	{	const it = jstok('`hel');
		const token1 = it.next().value;
		assertEquals(token1?.type, TokenType.MORE_REQUEST);

		const token2 = it.next('lo`').value;
		assertEquals(token2?.type, TokenType.MORE_REQUEST);
		assertEquals(token2?.text, '`hello`');

		const token3 = it.next().value;
		assertEquals(token3?.type, TokenType.STRING_TEMPLATE);
		assertEquals(token3?.text, '`hello`');
		assertEquals(token3?.getValue(), 'hello');
	}
);

// Test MORE_REQUEST with regexp
Deno.test
(	'MORE_REQUEST regexp',
	() =>
	{	const it = jstok('/hel');
		const token1 = it.next().value;
		assertEquals(token1?.type, TokenType.MORE_REQUEST);

		const token2 = it.next('lo/').value;
		assertEquals(token2?.type, TokenType.MORE_REQUEST);
		assertEquals(token2?.text, '/hello/');

		const token3 = it.next().value;
		assertEquals(token3?.type, TokenType.REGEXP);
		assertEquals(token3?.text, '/hello/');
	}
);

// Test column counting with tabs
Deno.test
(	'Column counting with tabs',
	() =>
	{	// Tab width 4 (default)
		let source = '\ta\t\tb';
		let tokens = [...jstok(source, 4)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].nColumn, 1); // tab at column 1
		assertEquals(tokens[1].nColumn, 5); // 'a' at column 5 (tab takes 4 columns)
		assertEquals(tokens[2].nColumn, 6); // tabs at column 6
		assertEquals(tokens[3].nColumn, 13); // 'b' at column 13

		// Tab width 8
		source = '\ta\t\tb';
		tokens = [...jstok(source, 8)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].nColumn, 1); // tab at column 1
		assertEquals(tokens[1].nColumn, 9); // 'a' at column 9
		assertEquals(tokens[2].nColumn, 10); // tabs at column 10
		assertEquals(tokens[3].nColumn, 25); // 'b' at column 25

		// Tab width 1
		source = '\ta';
		tokens = [...jstok(source, 1)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].nColumn, 1);
		assertEquals(tokens[1].nColumn, 2);
	}
);

// Test starting from custom line/column
Deno.test
(	'Custom start line and column',
	() =>
	{	const source = 'a\nb';
		const tokens = [...jstok(source, 4, 10, 5)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].nLine, 10);
		assertEquals(tokens[0].nColumn, 5);
		assertEquals(tokens[1].nLine, 10);
		assertEquals(tokens[1].nColumn, 6);
		assertEquals(tokens[2].nLine, 11);
		assertEquals(tokens[2].nColumn, 1);
	}
);

// Test token debug output
Deno.test
(	'Token debug output',
	() =>
	{	const token = [...jstok('hello')][0];
		const debugStr = token.debug();
		assertEquals(debugStr.includes('nLine:'), true);
		assertEquals(debugStr.includes('nColumn:'), true);
		assertEquals(debugStr.includes('level:'), true);
		assertEquals(debugStr.includes('type:'), true);
		assertEquals(debugStr.includes('text:'), true);
		assertEquals(debugStr.includes('"hello"'), true);
	}
);

// Test token toString
Deno.test
(	'Token toString',
	() =>
	{	const tokens = [...jstok('hello world')];
		assertEquals(tokens.filter(t => t.type === TokenType.IDENT).map(t => t.toString()), ['hello', 'world']);
		assertEquals(tokens.filter(t => t.type === TokenType.MORE_REQUEST).map(t => t.toString()), ['']);
	}
);

// Test bigint edge cases
Deno.test
(	'BigInt edge cases',
	() =>
	{	const source = '0n 1n 999999999999999999999999999999n 0b1111n 0o777n 0xFFFFn';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.NUMBER);
		assertEquals(tokens[0].getNumberValue(), 0n);
		assertEquals(tokens[1].getNumberValue(), 1n);
		assertEquals(tokens[2].getNumberValue(), 999999999999999999999999999999n);
		assertEquals(tokens[3].getNumberValue(), 0b1111n);
		assertEquals(tokens[4].getNumberValue(), 0o777n);
		assertEquals(tokens[5].getNumberValue(), 0xFFFFn);
	}
);

// Test arrow functions
Deno.test
(	'Arrow functions',
	() =>
	{	const source = '() => {} (a) => a a => a (a, b) => a + b';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.OTHER && t.text === '=>');
		assertEquals(tokens.length, 4);
	}
);

// Test optional chaining
Deno.test
(	'Optional chaining',
	() =>
	{	const source = 'a?.b a?.(b) a?.[b]';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens.map(t => t.text), ['a', '?.', 'b', 'a', '?.(', 'b', ')', 'a', '?.[', 'b', ']']);
	}
);

// Test nullish coalescing
Deno.test
(	'Nullish coalescing',
	() =>
	{	const source = 'a ?? b ?? c ??= d';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		assertEquals(tokens.filter(t => t.text.includes('??')).map(t => t.text), ['??', '??', '??=']);
	}
);

// Test logical assignment
Deno.test
(	'Logical assignment',
	() =>
	{	const source = 'a &&= b ||= c ??= d';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.OTHER);
		assertEquals(tokens.map(t => t.text), ['&&=', '||=', '??=']);
	}
);

// Test surrogate pairs in strings
Deno.test
(	'Surrogate pairs',
	() =>
	{	// Emoji with surrogate pair
		const source = '"😀" "🎉" "👨‍👩‍👧‍👦"';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.STRING);
		assertEquals(tokens[0].getValue(), '😀');
		assertEquals(tokens[1].getValue(), '🎉');
		assertEquals(tokens[2].getValue(), '👨‍👩‍👧‍👦');
	}
);

// Test template string with multiple parameters
Deno.test
(	'Template string with multiple parameters',
	() =>
	{	const source = '`a${1}b${2}c${3}d`';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens[0].type, TokenType.STRING_TEMPLATE_BEGIN);
		assertEquals(tokens[0].text, '`a${');
		assertEquals(tokens[2].type, TokenType.STRING_TEMPLATE_MID);
		assertEquals(tokens[2].text, '}b${');
		assertEquals(tokens[4].type, TokenType.STRING_TEMPLATE_MID);
		assertEquals(tokens[4].text, '}c${');
		assertEquals(tokens[6].type, TokenType.STRING_TEMPLATE_END);
		assertEquals(tokens[6].text, '}d`');
	}
);

// Test complex regexp patterns
Deno.test
(	'Complex RegExp patterns',
	() =>
	{	const source = '/(?:a|b)/; /(?=a)/; /(?!a)/; /(?<=a)/; /(?<!a)/; /a+?/; /a*?/; /a??/';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.REGEXP);
		assertEquals(tokens.length, 8);
		assertEquals(tokens[0].text, '/(?:a|b)/');
		assertEquals(tokens[1].text, '/(?=a)/');
		assertEquals(tokens[2].text, '/(?!a)/');
		assertEquals(tokens[3].text, '/(?<=a)/');
		assertEquals(tokens[4].text, '/(?<!a)/');
		assertEquals(tokens[5].text, '/a+?/');
		assertEquals(tokens[6].text, '/a*?/');
		assertEquals(tokens[7].text, '/a??/');
	}
);

// Test edge case with consecutive template strings
Deno.test
(	'Consecutive template strings',
	() =>
	{	const source = '`a` `b` `c`';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.STRING_TEMPLATE);
		assertEquals(tokens.length, 3);
		assertEquals(tokens[0].getValue(), 'a');
		assertEquals(tokens[1].getValue(), 'b');
		assertEquals(tokens[2].getValue(), 'c');
	}
);

// Test control characters in source
Deno.test
(	'Control characters',
	() =>
	{	const source = 'a\x00b\x01c\x1Fd';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		// Control characters should be treated as errors or part of identifiers
		assertEquals(tokens.some(t => t.type === TokenType.ERROR || t.type === TokenType.IDENT), true);
	}
);

// Test number underscore positions
Deno.test
(	'Number underscores',
	() =>
	{	const source = '1_000 1_000_000 0b1_0_1 0o7_7_7 0xF_F_F 1.1_1 1e1_0';
		const tokens = [...jstok(source)].filter(t => t.type === TokenType.NUMBER);
		assertEquals(tokens[0].getNumberValue(), 1000);
		assertEquals(tokens[1].getNumberValue(), 1000000);
		assertEquals(tokens[2].getNumberValue(), 0b101);
		assertEquals(tokens[3].getNumberValue(), 0o777);
		assertEquals(tokens[4].getNumberValue(), 0xFFF);
		assertEquals(tokens[5].getNumberValue(), 1.11);
		assertEquals(tokens[6].getNumberValue(), 1e10);
	}
);

// Test ending with open brackets
Deno.test
(	'Unclosed brackets at end',
	() =>
	{	const sources = ['(', '[', '{', '((', '[[', '{{'];
		for (const source of sources)
		{	const tokens = [...jstok(source)];
			assertEquals(tokens[tokens.length - 1].type, TokenType.ERROR);
		}
	}
);

// Test mixed newlines
Deno.test
(	'Mixed newline types',
	() =>
	{	const source = 'a\nb\rc\r\nd';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		const idents = tokens.filter(t => t.type === TokenType.IDENT);
		assertEquals(idents.length, 4);
		assertEquals(idents[0].nLine, 1);
		assertEquals(idents[1].nLine, 2);
		assertEquals(idents[2].nLine, 3);
		assertEquals(idents[3].nLine, 4);
	}
);

// Test regexp after various operators
Deno.test
(	'RegExp context detection',
	() =>
	{	const tests = [
			{ source: '= /a/', isRegexp: true },
			{ source: '+ /a/', isRegexp: true },
			{ source: '- /a/', isRegexp: true },
			{ source: '* /a/', isRegexp: true },
			{ source: '/ /a/', isRegexp: false }, // `/ /a` (regexp), `/` (not regexp)
			{ source: '% /a/', isRegexp: true },
			{ source: '== /a/', isRegexp: true },
			{ source: '!= /a/', isRegexp: true },
			{ source: '=== /a/', isRegexp: true },
			{ source: '!== /a/', isRegexp: true },
			{ source: '< /a/', isRegexp: true },
			{ source: '> /a/', isRegexp: true },
			{ source: '<= /a/', isRegexp: true },
			{ source: '>= /a/', isRegexp: true },
			{ source: '&& /a/', isRegexp: true },
			{ source: '|| /a/', isRegexp: true },
			{ source: '?? /a/', isRegexp: true },
			{ source: '? /a/', isRegexp: true },
			{ source: ': /a/', isRegexp: true },
			{ source: ', /a/', isRegexp: true },
			{ source: '( /a/', isRegexp: true },
			{ source: '[ /a/', isRegexp: true },
			{ source: '{ /a/', isRegexp: true },
		];

		for (const { source, isRegexp } of tests)
		{	const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
			const lastToken = tokens[1];
			if (isRegexp)
			{	assertEquals(lastToken.type, TokenType.REGEXP, `Expected regexp in: ${source}`);
			}
			else
			{	assertEquals(lastToken.type === TokenType.REGEXP, false, `Expected not regexp in: ${source}`);
			}
		}
	}
);

// Test very long identifiers
Deno.test
(	'Very long identifiers',
	() =>
	{	const longIdent = 'a'.repeat(10000);
		const source = longIdent;
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens.length, 1);
		assertEquals(tokens[0].type, TokenType.IDENT);
		assertEquals(tokens[0].text.length, 10000);
	}
);

// Test very long numbers
Deno.test
(	'Very long numbers',
	() =>
	{	const longNumber = '9'.repeat(1000);
		const source = longNumber;
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		assertEquals(tokens.length, 1);
		assertEquals(tokens[0].type, TokenType.NUMBER);
		assertEquals(tokens[0].text.length, 1000);
	}
);

// Test empty template string parameters
Deno.test
(	'Empty template parameters',
	() =>
	{	const source = '`${}` `${}${}` `a${}b`';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST && t.type !== TokenType.WHITESPACE);
		// First: `${}`
		assertEquals(tokens[0].type, TokenType.STRING_TEMPLATE_BEGIN);
		assertEquals(tokens[0].text, '`${');
		assertEquals(tokens[1].type, TokenType.STRING_TEMPLATE_END);
		assertEquals(tokens[1].text, '}`');
		// Second: `${}{}`
		assertEquals(tokens[2].type, TokenType.STRING_TEMPLATE_BEGIN);
		assertEquals(tokens[3].type, TokenType.STRING_TEMPLATE_MID);
		assertEquals(tokens[4].type, TokenType.STRING_TEMPLATE_END);
		// Third: `a${}b`
		assertEquals(tokens[5].type, TokenType.STRING_TEMPLATE_BEGIN);
		assertEquals(tokens[6].type, TokenType.STRING_TEMPLATE_END);
	}
);

// Test token level tracking accuracy
Deno.test
(	'Level tracking accuracy',
	() =>
	{	const source = '(a[b{c`${d}e`f}g]h)i';
		const tokens = [...jstok(source)].filter(t => t.type !== TokenType.MORE_REQUEST);
		const levels = tokens.map(t => ({text: t.text, level: t.level}));
		assertEquals(levels[0], {text: '(', level: 0});
		assertEquals(levels[1], {text: 'a', level: 1});
		assertEquals(levels[2], {text: '[', level: 1});
		assertEquals(levels[3], {text: 'b', level: 2});
		assertEquals(levels[4], {text: '{', level: 2});
		assertEquals(levels[5], {text: 'c', level: 3});
		assertEquals(levels[6], {text: '`${', level: 3});
		assertEquals(levels[7], {text: 'd', level: 4});
		assertEquals(levels[8], {text: '}e`', level: 3});
		assertEquals(levels[9], {text: 'f', level: 3});
		assertEquals(levels[10], {text: '}', level: 2});
		assertEquals(levels[11], {text: 'g', level: 2});
		assertEquals(levels[12], {text: ']', level: 1});
		assertEquals(levels[13], {text: 'h', level: 1});
		assertEquals(levels[14], {text: ')', level: 0});
		assertEquals(levels[15], {text: 'i', level: 0});
	}
);

// Test getNumberValue for non-number tokens
Deno.test
(	'getNumberValue for non-numbers',
	() =>
	{	const tokens = [...jstok('hello "world" /test/')];
		for (const token of tokens)
		{	if (token.type !== TokenType.NUMBER)
			{	assertEquals(Number.isNaN(token.getNumberValue()), true);
			}
		}
	}
);

// Test getRegExpValue for non-regexp tokens
Deno.test
(	'getRegExpValue for non-regexps',
	() =>
	{	const tokens = [...jstok('hello 123 "world"')];
		for (const token of tokens)
		{	if (token.type !== TokenType.REGEXP)
			{	const re = token.getRegExpValue();
				assertEquals(re.source, '(?:)');
			}
		}
	}
);
