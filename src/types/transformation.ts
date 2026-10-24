export type ParameterType = 'text' | 'number' | 'boolean' | 'regex' | string

export interface TransformationParameterDef {
    name: string;
    label: string;
    type: ParameterType;
    required: boolean;
    defaultValue: string | number | boolean;
    placeholder: string;
}

export interface TransformationDefinition {
    displayName: string;
    key: string;
    parameters: TransformationParameterDef[];
}