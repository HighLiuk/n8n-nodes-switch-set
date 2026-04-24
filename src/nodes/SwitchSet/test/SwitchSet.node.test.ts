import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { SwitchSet } from '../SwitchSet.node';

/**
 * Helper: builds a mock IExecuteFunctions that returns the given assignments
 * and resolves getNodeParameter calls to the right values based on path.
 */
function buildMock(
	inputItems: INodeExecutionData[],
	assignments: Record<string, any>[],
	options: Record<string, any> = {},
) {
	const executeFunctions = mock<IExecuteFunctions>();
	executeFunctions.getInputData.mockReturnValue(inputItems);
	executeFunctions.continueOnFail.mockReturnValue(false);

	executeFunctions.getNodeParameter.mockImplementation(
		(paramName: string, _itemIndex: number, fallback?: any) => {
			// Options
			if (paramName === 'options') return { ignoreCase: true, looseTypeValidation: true, ...options };

			// Assignments array
			if (paramName === 'assignments.values') return assignments;

			// Parse paths like assignments.values[0].targetField
			const match = paramName.match(
				/^assignments\.values\[(\d+)\]\.(.+)$/,
			);
			if (match) {
				const idx = parseInt(match[1]);
				const rest = match[2];
				const assignment = assignments[idx];
				if (!assignment) return fallback;

				// targetField
				if (rest === 'targetField') return assignment.targetField;

				// defaultType
				if (rest === 'defaultType') return assignment.defaultType ?? 'none';

				// default values
				if (rest.startsWith('default')) return assignment[rest] ?? fallback;

				// rules.values
				if (rest === 'rules.values') return assignment.rules ?? [];

				// rules.values[j].conditions (with extractValue)
				const ruleMatch = rest.match(
					/^rules\.values\[(\d+)\]\.(.+)$/,
				);
				if (ruleMatch) {
					const ruleIdx = parseInt(ruleMatch[1]);
					const ruleProp = ruleMatch[2];
					const rule = (assignment.rules ?? [])[ruleIdx];
					if (!rule) return fallback;

					if (ruleProp === 'conditions') return rule._conditionResult ?? fallback;
					if (ruleProp === 'type') return rule.type ?? 'stringValue';
					return rule[ruleProp] ?? fallback;
				}
			}

			return fallback;
		},
	);

	return executeFunctions;
}

describe('SwitchSet Node', () => {
	let node: SwitchSet;

	beforeEach(() => {
		node = new SwitchSet();
	});

	describe('description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.displayName).toBe('Switch Set');
			expect(node.description.name).toBe('switchSet');
			expect(node.description.version).toBe(1);
		});
	});

	describe('execute', () => {
		it('should assign a single field when condition matches', async () => {
			const ef = buildMock(
				[{ json: { name: 'Alice' } }],
				[
					{
						targetField: 'greeting',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'Hello Alice',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ greeting: 'Hello Alice' });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should handle multiple assignments', async () => {
			const ef = buildMock(
				[{ json: { brand: 'VW' } }],
				[
					{
						targetField: 'code',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'vw_parts',
							},
						],
					},
					{
						targetField: 'active',
						rules: [
							{
								_conditionResult: true,
								type: 'booleanValue',
								booleanValue: 'true',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({
				code: 'vw_parts',
				active: true,
			});
		});

		it('should use first matching rule (first match wins)', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'label',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'first',
							},
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'second',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ label: 'first' });
		});

		it('should use default value when no rule matches', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'status',
						rules: [
							{
								_conditionResult: false,
								type: 'stringValue',
								stringValue: 'matched',
							},
						],
						defaultType: 'stringValue',
						defaultStringValue: 'unknown',
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ status: 'unknown' });
		});

		it('should not create field when no match and no default', async () => {
			const ef = buildMock(
				[{ json: { x: 1 } }],
				[
					{
						targetField: 'missing',
						rules: [
							{
								_conditionResult: false,
								type: 'stringValue',
								stringValue: 'nope',
							},
						],
						defaultType: 'none',
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({});
		});

		it('should support dot-notation for nested fields', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'data.person.name',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'Alice',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({
				data: { person: { name: 'Alice' } },
			});
		});

		it('should cast number values correctly', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'count',
						rules: [
							{
								_conditionResult: true,
								type: 'numberValue',
								numberValue: '42',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ count: 42 });
			expect(typeof result[0][0].json.count).toBe('number');
		});

		it('should cast boolean values correctly', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'flag',
						rules: [
							{
								_conditionResult: true,
								type: 'booleanValue',
								booleanValue: 'false',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ flag: false });
			expect(typeof result[0][0].json.flag).toBe('boolean');
		});

		it('should parse array values correctly', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'tags',
						rules: [
							{
								_conditionResult: true,
								type: 'arrayValue',
								arrayValue: '["a","b","c"]',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ tags: ['a', 'b', 'c'] });
		});

		it('should parse object values correctly', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'meta',
						rules: [
							{
								_conditionResult: true,
								type: 'objectValue',
								objectValue: '{"key":"val"}',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ meta: { key: 'val' } });
		});

		it('should output only assigned fields (no passthrough)', async () => {
			const ef = buildMock(
				[{ json: { original: 'data', extra: 123, nested: { a: 1 } } }],
				[
					{
						targetField: 'result',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'only this',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ result: 'only this' });
			expect(result[0][0].json).not.toHaveProperty('original');
			expect(result[0][0].json).not.toHaveProperty('extra');
			expect(result[0][0].json).not.toHaveProperty('nested');
		});

		it('should process multiple input items (1:1 mapping)', async () => {
			const ef = buildMock(
				[{ json: { v: 1 } }, { json: { v: 2 } }, { json: { v: 3 } }],
				[
					{
						targetField: 'out',
						rules: [
							{
								_conditionResult: true,
								type: 'stringValue',
								stringValue: 'yes',
							},
						],
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0]).toHaveLength(3);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
			expect(result[0][2].pairedItem).toEqual({ item: 2 });
		});

		it('should output empty object when no assignments match and no defaults', async () => {
			const ef = buildMock(
				[{ json: { x: 1 } }],
				[
					{
						targetField: 'a',
						rules: [{ _conditionResult: false, type: 'stringValue', stringValue: 'x' }],
						defaultType: 'none',
					},
					{
						targetField: 'b',
						rules: [{ _conditionResult: false, type: 'stringValue', stringValue: 'y' }],
						defaultType: 'none',
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({});
		});

		it('should use default number value correctly', async () => {
			const ef = buildMock(
				[{ json: {} }],
				[
					{
						targetField: 'priority',
						rules: [
							{
								_conditionResult: false,
								type: 'numberValue',
								numberValue: '99',
							},
						],
						defaultType: 'numberValue',
						defaultNumberValue: '0',
					},
				],
			);

			const result = await node.execute.call(ef);
			expect(result[0][0].json).toEqual({ priority: 0 });
			expect(typeof result[0][0].json.priority).toBe('number');
		});
	});
});
