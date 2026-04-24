import set from 'lodash/set';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class SwitchSet implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Switch Set',
		name: 'switchSet',
		icon: 'fa:exchange-alt',
		iconColor: 'orange',
		group: ['transform'],
		version: 1,
		description: 'Assign field values based on conditions',
		defaults: {
			name: 'Switch Set',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Assignments',
				name: 'assignments',
				placeholder: 'Add Assignment',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {
					values: [
						{
							targetField: '',
							rules: {
								values: [
									{
										conditions: {
											options: {
												caseSensitive: true,
												leftValue: '',
												typeValidation: 'strict',
											},
											conditions: [
												{
													leftValue: '',
													rightValue: '',
													operator: {
														type: 'string',
														operation: 'equals',
													},
												},
											],
											combinator: 'and',
										},
										type: 'stringValue',
										stringValue: '',
									},
								],
							},
							defaultType: 'none',
						},
					],
				},
				options: [
					{
						name: 'values',
						displayName: 'Assignment',
						values: [
							{
								displayName: 'Target Field',
								name: 'targetField',
								type: 'string',
								default: '',
								placeholder: 'e.g. fieldName',
								description:
									'Name of the field to set. Supports dot-notation (e.g. data.person.name).',
								requiresDataPath: 'single',
							},
							{
								displayName: 'Rules',
								name: 'rules',
								placeholder: 'Add Rule',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								default: {
									values: [
										{
											conditions: {
												options: {
													caseSensitive: true,
													leftValue: '',
													typeValidation: 'strict',
												},
												conditions: [
													{
														leftValue: '',
														rightValue: '',
														operator: {
															type: 'string',
															operation: 'equals',
														},
													},
												],
												combinator: 'and',
											},
											type: 'stringValue',
											stringValue: '',
										},
									],
								},
								options: [
									{
										name: 'values',
										displayName: 'Rule',
										values: [
											{
												displayName: 'Conditions',
												name: 'conditions',
												placeholder: 'Add Condition',
												type: 'filter',
												default: {},
												typeOptions: {
													filter: {
														caseSensitive: '={{!$parameter.options.ignoreCase}}',
														typeValidation:
															'={{$parameter.options.looseTypeValidation ? "loose" : "strict"}}',
														version: 2,
													},
												},
											},
											{
												displayName: 'Value Type',
												name: 'type',
												type: 'options',
												options: [
													{
														name: 'String',
														value: 'stringValue',
													},
													{
														name: 'Number',
														value: 'numberValue',
													},
													{
														name: 'Boolean',
														value: 'booleanValue',
													},
													{
														name: 'Array',
														value: 'arrayValue',
													},
													{
														name: 'Object',
														value: 'objectValue',
													},
												],
												default: 'stringValue',
											},
											{
												displayName: 'Value',
												name: 'stringValue',
												type: 'string',
												default: '',
												placeholder: 'value',
												displayOptions: {
													show: {
														type: ['stringValue'],
													},
												},
												validateType: 'string',
												ignoreValidationDuringExecution: true,
											},
											{
												displayName: 'Value',
												name: 'numberValue',
												type: 'string',
												default: '',
												placeholder: 'value',
												displayOptions: {
													show: {
														type: ['numberValue'],
													},
												},
												validateType: 'number',
												ignoreValidationDuringExecution: true,
											},
											{
												displayName: 'Value',
												name: 'booleanValue',
												type: 'options',
												default: 'true',
												options: [
													{
														name: 'True',
														value: 'true',
													},
													{
														name: 'False',
														value: 'false',
													},
												],
												displayOptions: {
													show: {
														type: ['booleanValue'],
													},
												},
												validateType: 'boolean',
												ignoreValidationDuringExecution: true,
											},
											{
												displayName: 'Value',
												name: 'arrayValue',
												type: 'string',
												default: '',
												placeholder: 'value',
												displayOptions: {
													show: {
														type: ['arrayValue'],
													},
												},
												validateType: 'array',
												ignoreValidationDuringExecution: true,
											},
											{
												displayName: 'Value',
												name: 'objectValue',
												type: 'json',
												default: '',
												placeholder: 'value',
												typeOptions: {
													rows: 2,
												},
												displayOptions: {
													show: {
														type: ['objectValue'],
													},
												},
												validateType: 'object',
												ignoreValidationDuringExecution: true,
											},
										],
									},
								],
							},
							// Default value type selector
							{
								displayName: 'Default Value Type',
								name: 'defaultType',
								type: 'options',
								options: [
									{
										name: 'None',
										value: 'none',
									},
									{
										name: 'String',
										value: 'stringValue',
									},
									{
										name: 'Number',
										value: 'numberValue',
									},
									{
										name: 'Boolean',
										value: 'booleanValue',
									},
									{
										name: 'Array',
										value: 'arrayValue',
									},
									{
										name: 'Object',
										value: 'objectValue',
									},
								],
								default: 'none',
								description:
									'Value to use when no rule matches. Set to None to skip the field entirely.',
							},
							{
								displayName: 'Default Value',
								name: 'defaultStringValue',
								type: 'string',
								default: '',
								placeholder: 'value',
								displayOptions: {
									show: {
										defaultType: ['stringValue'],
									},
								},
							},
							{
								displayName: 'Default Value',
								name: 'defaultNumberValue',
								type: 'string',
								default: '',
								placeholder: 'value',
								displayOptions: {
									show: {
										defaultType: ['numberValue'],
									},
								},
								validateType: 'number',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Default Value',
								name: 'defaultBooleanValue',
								type: 'options',
								default: 'true',
								options: [
									{
										name: 'True',
										value: 'true',
									},
									{
										name: 'False',
										value: 'false',
									},
								],
								displayOptions: {
									show: {
										defaultType: ['booleanValue'],
									},
								},
							},
							{
								displayName: 'Default Value',
								name: 'defaultArrayValue',
								type: 'string',
								default: '',
								placeholder: 'value',
								displayOptions: {
									show: {
										defaultType: ['arrayValue'],
									},
								},
								validateType: 'array',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Default Value',
								name: 'defaultObjectValue',
								type: 'json',
								default: '',
								placeholder: 'value',
								typeOptions: {
									rows: 2,
								},
								displayOptions: {
									show: {
										defaultType: ['objectValue'],
									},
								},
								validateType: 'object',
								ignoreValidationDuringExecution: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Ignore Case',
						name: 'ignoreCase',
						type: 'boolean',
						default: true,
						description: 'Whether to ignore letter case when evaluating conditions',
					},
					{
						displayName: 'Loose Type Validation',
						name: 'looseTypeValidation',
						type: 'boolean',
						default: true,
						description:
							'Whether to try casting value types automatically when evaluating conditions',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const newJson: IDataObject = {};
				const assignments = this.getNodeParameter(
					'assignments.values',
					itemIndex,
					[],
				) as IDataObject[];

				for (let i = 0; i < assignments.length; i++) {
					const targetField = this.getNodeParameter(
						`assignments.values[${i}].targetField`,
						itemIndex,
					) as string;

					const rules = this.getNodeParameter(
						`assignments.values[${i}].rules.values`,
						itemIndex,
						[],
					) as IDataObject[];

					let matched = false;

					for (let j = 0; j < rules.length; j++) {
						let conditionPass: boolean;
						try {
							conditionPass = this.getNodeParameter(
								`assignments.values[${i}].rules.values[${j}].conditions`,
								itemIndex,
								false,
								{ extractValue: true },
							) as boolean;
						} catch (error) {
							throw new NodeOperationError(this.getNode(), error as Error, {
								itemIndex,
								description: `Error evaluating conditions for field "${targetField}", rule ${j + 1}`,
							});
						}

						if (conditionPass) {
							const type = this.getNodeParameter(
								`assignments.values[${i}].rules.values[${j}].type`,
								itemIndex,
							) as string;
							const value = this.getNodeParameter(
								`assignments.values[${i}].rules.values[${j}].${type}`,
								itemIndex,
							);
							set(newJson, targetField, castValue(type, value));
							matched = true;
							break;
						}
					}

					if (!matched) {
						const defaultType = this.getNodeParameter(
							`assignments.values[${i}].defaultType`,
							itemIndex,
							'none',
						) as string;

						if (defaultType !== 'none') {
							const defaultFieldName = `default${defaultType.charAt(0).toUpperCase()}${defaultType.slice(1)}`;
							const defaultValue = this.getNodeParameter(
								`assignments.values[${i}].${defaultFieldName}`,
								itemIndex,
							);
							set(newJson, targetField, castValue(defaultType, defaultValue));
						}
					}
				}

				returnData.push({ json: newJson, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}

function castValue(type: string, value: any): any {
	switch (type) {
		case 'numberValue':
			return Number(value);
		case 'booleanValue':
			return value === 'true' || value === true;
		case 'arrayValue':
			return typeof value === 'string' ? JSON.parse(value) : value;
		case 'objectValue':
			return typeof value === 'string' ? JSON.parse(value) : value;
		default:
			return value;
	}
}
