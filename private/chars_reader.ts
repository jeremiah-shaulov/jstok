/**	Read chunks that end at character boundary, according to provided encoding.
	Last cut-in-the-middle character is buffered in this object.
 **/
export class CharsReader implements Deno.Reader
{	private tail = new Uint8Array(4);
	private tailLen = 0;
	private decoder: TextDecoder | undefined;

	/**	`encoding` - possible values are everything that `TextDecoder.encoding` can be, but i support only "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).
	 **/
	constructor(private reader: Deno.Reader, private encoding='utf-8')
	{
	}

	async read(buffer: Uint8Array)
	{	buffer.set(this.tail.subarray(0, this.tailLen)); // assuming buffer.length is >= 4
		let pos = this.tailLen;
		this.tailLen = 0;
		let end = 0;
		while (end == 0)
		{	let n = await this.reader.read(buffer.subarray(pos));
			while (n === 0)
			{	n = await this.reader.read(buffer.subarray(pos));
			}
			if (n == null)
			{	return pos==0 ? null : pos;
			}
			pos += n;
			end = gotoCharBoundary(buffer, pos, this.encoding);
		}
		this.tail.set(buffer.subarray(end, pos));
		this.tailLen = pos - end;
		return end;
	}

	/**	Like `read(buffer)`, but converts the result to string.
		Read as many chars as fit the provided buffer.
		The provided buffer will be used during text conversion, and it will not be in use after this function returns.
	 **/
	async readChars(buffer: Uint8Array)
	{	const nRead = await this.read(buffer);
		if (nRead == null)
		{	return null;
		}
		if (!this.decoder)
		{	this.decoder = new TextDecoder(this.encoding);
		}
		return this.decoder.decode(buffer.subarray(0, nRead));
	}
}

function gotoCharBoundary(buffer: Uint8Array, end: number, encoding='utf-8')
{	if (encoding == 'utf-8')
	{	if (!(end > 0))
		{	return 0;
		}
		let i = end - 1;
		while ((buffer[i] & 0xC0) == 0x80)
		{	i--;
		}
		const c = buffer[i]; // the first byte of the last char
		if ((c & 0x80) == 0)
		{	// 1-byte char
			i = end;
		}
		else if ((c & 0xE0) == 0xC0)
		{	// 2-byte char
			if (i+2 <= end)
			{	i = end; // was whole char
			}
		}
		else if ((c & 0xF0) == 0xE0)
		{	// 3-byte char
			if (i+3 <= end)
			{	i = end; // was whole char
			}
		}
		else
		{	// 4-byte char
			if (i+4 <= end)
			{	i = end; // was whole char
			}
		}
		return i;
	}
	else if (encoding == 'utf-16be')
	{	end -= end & 1;
		if (end >= 2)
		{	const c = buffer[end - 2];
			if (c>=0xD8 && c<=0xDB) // high surrogate
			{	end -= 2;
			}
		}
		return end;
	}
	else if (encoding == 'utf-16le')
	{	end -= end & 1;
		if (end >= 2)
		{	const c = buffer[end - 1];
			if (c>=0xD8 && c<=0xDB) // high surrogate
			{	end -= 2;
			}
		}
		return end;
	}
	else
	{	return end;
	}
}
