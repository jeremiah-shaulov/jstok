# `const` `enum` TokenType

[Documentation Index](../README.md)

```ts
import {TokenType} from "https://deno.land/x/jstok@v3.0.0/mod.ts"
```

#### WHITESPACE = <mark>0</mark>

> Any number of any whitespace characters. Multiple such token types are not generated in sequence.



#### COMMENT = <mark>1</mark>

> One single-line or multiline comment, or hashbang.



#### ATTRIBUTE = <mark>2</mark>

> Like `@Component`.



#### IDENT = <mark>3</mark>

> Can contain unicode letters. Private property names like `#flags` are also considered `IDENT`s.



#### NUMBER = <mark>4</mark>

> Number.



#### STRING = <mark>5</mark>

> String.



#### STRING\_TEMPLATE = <mark>6</mark>

> Whole backtick-string, if it has no parameters.



#### STRING\_TEMPLATE\_BEGIN = <mark>7</mark>

> First part of a backtick-string, till it's first parameter.
> The contents of parameters will be tokenized separately, and returned as corresponding token types.



#### STRING\_TEMPLATE\_MID = <mark>8</mark>

> Part of backtick-string between two parameters.



#### STRING\_TEMPLATE\_END = <mark>9</mark>

> Last part of backtick-string.



#### REGEXP = <mark>10</mark>

> Regular expression literal.



#### OTHER = <mark>11</mark>

> Other tokens, like `+`, `++`, `?.`, etc.



#### MORE\_REQUEST = <mark>12</mark>

> Before returning the last token found in the source string, [jstok()](../function.jstok/README.md) generate this meta-token.
> If then you call `it.next(more)` with a nonempty string argument that contains source code continuation,
> this code will be appended to the contents of this `MORE_REQUEST` token, and the tokenization process will continue.



#### ERROR = <mark>13</mark>

> This token type is returned in 2 situations:
> 1. Invalid character occured
> 2. Unbalanced bracket occured



