# `function` jstokStream

[Documentation Index](../README.md)

```ts
import {jstokStream} from "https://deno.land/x/jstok@v3.0.0/mod.ts"
```

`function` jstokStream(source: ReadableStream\<Uint8Array> | [Reader](../private.type.Reader/README.md), tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=new TextDecoder, buffer: `number` | ArrayBuffer=BUFFER\_SIZE): AsyncGenerator\<[Token](../class.Token/README.md), `void`, `any`>

Returns async iterator over JavaScript tokens found in source code.
This function doesn't generate `TokenType.MORE_REQUEST` tokens.
`nLine` and `nColumn` - will start counting lines from these initial values.

