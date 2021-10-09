import {jstok, TokenType} from './mod.ts';

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
