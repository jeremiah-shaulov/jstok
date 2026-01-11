# `class` Token

[Documentation Index](../README.md)

```ts
import {Token} from "https://deno.land/x/jstok@v3.0.0/mod.ts"
```

Represents a JavaScript token.

## This class has

- [constructor](#-constructortext-string-type-tokentype-nline-number1-ncolumn-number1-level-number0)
- 5 properties:
[text](#-text-string),
[type](#-type-tokentype),
[nLine](#-nline-number),
[nColumn](#-ncolumn-number),
[level](#-level-number)
- 5 methods:
[toString](#-tostring-string),
[debug](#-debug-string),
[getValue](#-getvalue-string),
[getNumberValue](#-getnumbervalue-number--bigint),
[getRegExpValue](#-getregexpvalue-regexp)


#### 🔧 `constructor`(text: `string`, type: [TokenType](../enum.TokenType/README.md), nLine: `number`=1, nColumn: `number`=1, level: `number`=0)



#### 📄 text: `string`

> Original JavaScript token text. It's copied from the source code and not modified.



#### 📄 type: [TokenType](../enum.TokenType/README.md)

> Token type.



#### 📄 nLine: `number`

> Line number where this token starts.



#### 📄 nColumn: `number`

> Column number on the line where this token starts.



#### 📄 level: `number`

> Nesting level. Entering `(`, `[` and `{` increments the level counter. Also the level is incremented when entering `${` parameters in string templates.



#### ⚙ toString(): `string`

> Returns original JavaScript token ([text](../class.Token/README.md#-text-string)), except for [TokenType.MORE\_REQUEST](../enum.TokenType/README.md#more_request--12), for which it returns empty string.



#### ⚙ debug(): `string`

> Returns string with console.log()-ready representation of this `Token` object for debug purposes.



#### ⚙ getValue(): `string`

> Converts JavaScript token to it's JavaScript value, if the value is string.
> 
> - For [TokenType.COMMENT](../enum.TokenType/README.md#comment--1) - it's the text after `//` or between `/*` and `*‎/`.
> - For [TokenType.STRING](../enum.TokenType/README.md#string--5) and all `TokenType.STRING_TEMPLATE*` types - it's the JavaScript value of the token.
> - For [TokenType.MORE\_REQUEST](../enum.TokenType/README.md#more_request--12) - empty string.
> - For others, including [TokenType.NUMBER](../enum.TokenType/README.md#number--4) - it's the original JavaScript token.



#### ⚙ getNumberValue(): `number` | `bigint`

> Returns `Number` or `BigInt` value of the token for [TokenType.NUMBER](../enum.TokenType/README.md#number--4) tokens. For others returns `NaN`.



#### ⚙ getRegExpValue(): RegExp

> Returns `RegExp` object. For [TokenType.REGEXP](../enum.TokenType/README.md#regexp--10) tokens it's the regular expression that this token represents.
> For other token types this method returns just a default empty `RegExp` object.



