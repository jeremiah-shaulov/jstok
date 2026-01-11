# `function` jstokStreamArray

[Documentation Index](../README.md)

```ts
import {jstokStreamArray} from "https://deno.land/x/jstok@v3.0.0/mod.ts"
```

`function` jstokStreamArray(source: ReadableStream\<Uint8Array> | [Reader](../private.type.Reader/README.md), tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=new TextDecoder, buffer: `number` | ArrayBuffer=BUFFER\_SIZE): AsyncGenerator\<[Token](../class.Token/README.md)\[], `void`, `any`>

Like `jstokStream()`, but buffers tokens in array, and yields this array periodically.
This is to avoid creating and awaiting Promises for each Token in the code.

