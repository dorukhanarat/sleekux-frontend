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

export interface ConfiguredStep {
    id: string;
    transformationKey: string;
    displayName: string;
    parameters: Record<string, string | number | boolean >
}