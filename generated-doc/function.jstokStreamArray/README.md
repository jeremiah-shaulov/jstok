# `function` jstokStreamArray

[Documentation Index](../README.md)

```ts
import {jstokStreamArray} from "https://deno.land/x/jstok@v2.0.1/mod.ts"
```

`function` jstokStreamArray(source: ReadableStream\<Uint8Array>, tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=defaultDecoder): AsyncGenerator\<[Token](../class.Token/README.md)\[], `void`, `any`>

Like `jstokStream()`, but buffers tokens in array, and yields this array periodically.
This is to avoid creating and awaiting Promises for each Token in the code.

