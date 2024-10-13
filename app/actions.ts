'use server';

import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { createStreamableValue } from 'ai/rsc';

type DataType = 'string' | 'number' | 'boolean';
type Data = {
	fields: Array<{
		name: string;
		type: DataType;
	}>;
};

const BaseSchema = z.object({});
const zodBoolean = z.boolean();
const zodString = z.string();
const zodNumber = z.number();

const transformFieldToSchema = (data: Data) => {
	return data.fields.reduce((schema, field) => {
		switch (field.type) {
			case 'string':
				return schema.extend({ [field.name]: zodString });
			case 'number':
				return schema.extend({ [field.name]: zodNumber });
			case 'boolean':
				return schema.extend({ [field.name]: zodBoolean });
			default:
				return schema;
		}
	}, BaseSchema);
};

export async function submitForm(formData: FormData) {
	const url = formData.get('url') as string;
	const fieldNames = formData.getAll('fieldName') as string[];
	const fieldTypes = formData.getAll('fieldType') as DataType[];

	const fields = fieldNames.map((name, index) => ({
		name,
		type: fieldTypes[index],
	}));

	const schema = transformFieldToSchema({ fields });

	const res = await fetch(url.includes('http') ? url : `https://${url}`);
	const htmlResponse = await res.text();

	const stream = createStreamableValue();

	(async () => {
		const { partialObjectStream } = await streamObject({
			model: openai('gpt-4-turbo'),
			output: 'array',
			schema,
			system: systemInstructions,
			prompt: htmlResponse,
		});

		for await (const partialObject of partialObjectStream) {
			stream.update(partialObject);
		}

		stream.done();
	})();

	return { object: stream.value };
}

const systemInstructions = `You are an AI assistant tasked with extracting specific information from the raw HTML content of a webpage. Your job is to analyze this content and extract the requested data fields based on the provided schema.

INSTRUCTIONS:
1. Carefully examine the provided HTML content.
2. Extract the data for each field specified in the schema.
3. Look for patterns or structures that typically contain the requested information.
4. If a piece of information is not found or unclear, mark it as "Not found" or "Unclear" respectively.
5. Provide your confidence level (Low, Medium, High) for each extracted piece of information.
6. If you encounter multiple possible matches for a field, list the top 2-3 options.
7. Ensure that the extracted data matches the type specified in the schema for each field.

IMPORTANT CONSIDERATIONS:
- Webpage structures can vary. Look for common indicators like headings, metadata, or specific HTML tags that might contain the required information.
- Consider the context of the website (e.g., news site, blog, forum) to inform your search for relevant data.
- If the content appears to be dynamically loaded or not present in the initial HTML, make a note of this in your response.
- Pay close attention to the data type specified for each field in the schema and ensure your extraction matches these types.
- Be prepared to handle various field types such as numbers, strings, dates, or more complex structured data.
`;
