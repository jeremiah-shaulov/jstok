import {jstok, Token, TokenType} from "./jstok.ts";

const BUFFER_SIZE = 16*1024;

const EMPTY_BUFFER = new Uint8Array;
const defaultDecoder = new TextDecoder;

/**	Returns async iterator over JavaScript tokens found in source code.
	This function doesn't generate `TokenType.MORE_REQUEST` tokens.
	`nLine` and `nColumn` - will start counting lines from these initial values.
 **/
export async function *jstokStream(source: ReadableStream<Uint8Array>, tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token, void>
{	using reader = new TextReader(source, decoder);
	const it = jstok(await reader.read(), tabWidth, nLine, nColumn);
	let token;
	while ((token = it.next().value))
	{	while (token.type == TokenType.MORE_REQUEST)
		{	token = it.next(await reader.read()).value;
			if (!token)
			{	return;
			}
		}
		yield token;
	}
}

/**	Like `jstokStream()`, but buffers tokens in array, and yields this array periodically.
	This is to avoid creating and awaiting Promises for each Token in the code.
 **/
export async function *jstokStreamArray(source: ReadableStream<Uint8Array>, tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token[], void>
{	using reader = new TextReader(source, decoder);
	const it = jstok(await reader.read(), tabWidth, nLine, nColumn);
	let tokensBuffer = new Array<Token>;
	let token;
	while ((token = it.next().value))
	{	while (token.type == TokenType.MORE_REQUEST)
		{	if (tokensBuffer.length)
			{	yield tokensBuffer;
				tokensBuffer = [];
			}
			token = it.next(await reader.read()).value;
			if (!token)
			{	return;
			}
		}
		tokensBuffer[tokensBuffer.length] = token;
	}
	if (tokensBuffer.length)
	{	yield tokensBuffer;
	}
}

class TextReader
{	#reader: ReadableStreamDefaultReader<Uint8Array>|undefined;
	#readerByob: ReadableStreamBYOBReader|undefined;
	#decoder: TextDecoder;
	#buffer = EMPTY_BUFFER.buffer;

	constructor(input: ReadableStream<Uint8Array>, decoder: TextDecoder)
	{	try
		{	this.#readerByob = input.getReader({mode: 'byob'});
			this.#buffer = new ArrayBuffer(BUFFER_SIZE);
		}
		catch
		{	this.#reader = input.getReader();
		}
		this.#decoder = decoder;
	}

	async read()
	{	const readerByob = this.#readerByob;
		if (readerByob)
		{	while (true)
			{	const {value, done} = await readerByob.read(new Uint8Array(this.#buffer));
				if (done || !value)
				{	return '';
				}
				this.#buffer = value.buffer;
				const text = this.#decoder.decode(value, {stream: true});
				if (text.length)
				{	return text;
				}
			}
		}
		else
		{	const reader = this.#reader!;
			while (true)
			{	const {value, done} = await reader.read();
				if (done || !value)
				{	return '';
				}
				const text = this.#decoder.decode(value, {stream: true});
				if (text.length)
				{	return text;
				}
			}
		}
	}

	[Symbol.dispose]()
	{	this.#decoder.decode(EMPTY_BUFFER); // Clear state (deno requires it)
		this.#reader?.releaseLock();
		this.#readerByob?.releaseLock();
	}
}
