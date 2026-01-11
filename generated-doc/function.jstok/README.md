# `function` jstok

[Documentation Index](../README.md)

```ts
import {jstok} from "https://deno.land/x/jstok@v3.0.0/mod.ts"
```

`function` jstok(source: `string`, tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1): Generator\<[Token](../class.Token/README.md), `void`, `string`>

Returns iterator over JavaScript tokens found in source code.
`nLine` and `nColumn` - will start counting lines from these initial values.

