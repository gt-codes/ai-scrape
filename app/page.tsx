'use client';

export const runtime = 'edge';
export const maxDuration = 30;

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { submitForm } from './actions';
import { readStreamableValue } from 'ai/rsc';

type Field = {
	id: number;
	name: string;
	type: string;
};

export default function Component() {
	const [fields, setFields] = useState<Field[]>([{ id: 0, name: '', type: 'string' }]);
	const [generation, setGeneration] = useState<string>('');

	const handleAddRow = () => {
		setFields([...fields, { id: fields.length, name: '', type: 'string' }]);
	};

	const handleFieldChange = (id: number, field: 'name' | 'type', value: string) => {
		setFields(fields.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const { object } = await submitForm(formData);
		for await (const partialObject of readStreamableValue(object)) {
			if (partialObject) {
				setGeneration(JSON.stringify(partialObject, null, 2));
			}
		}
	};

	return (
		<form onSubmit={handleSubmit} className='space-y-4 w-full max-w-md mx-auto p-4'>
			<div className='space-y-2'>
				<Label htmlFor='url'>Enter url</Label>
				<Input id='url' name='url' placeholder='https://example.com' required />
			</div>

			<div className='space-y-2'>
				<Label>Fields</Label>
				<div id='fields' className='space-y-2'>
					{fields.map((f) => (
						<div key={f.id} className='flex space-x-2'>
							<Input
								required
								name='fieldName'
								value={f.name}
								className='flex-grow'
								placeholder='Field name'
								onChange={(e) => handleFieldChange(f.id, 'name', e.target.value)}
							/>
							<Select
								name='fieldType'
								defaultValue='string'
								value={f.type}
								onValueChange={(value) => handleFieldChange(f.id, 'type', value)}>
								<SelectTrigger className='w-[180px]'>
									<SelectValue placeholder='Select a type' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='string'>String</SelectItem>
									<SelectItem value='number'>Number</SelectItem>
									<SelectItem value='boolean'>Boolean</SelectItem>
								</SelectContent>
							</Select>
						</div>
					))}
				</div>
				<Button type='button' variant='outline' className='w-full' onClick={handleAddRow}>
					Add Row
				</Button>
			</div>
			<Button type='submit' className='w-full'>
				Submit
			</Button>

			<pre>{generation}</pre>
		</form>
	);
}
