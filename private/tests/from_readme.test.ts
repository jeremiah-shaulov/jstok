import {storeExamplesToTmpFiles} from 'https://deno.land/x/tsa@v0.0.49/doc_test/mod.ts';

for (const {exampleName, filename} of await storeExamplesToTmpFiles(import.meta.url))
{	const func = async function()
	{	await import(filename);
	};
	Object.defineProperty(func, 'name', {value: exampleName, writable: false});
	Deno.test(func);
}
