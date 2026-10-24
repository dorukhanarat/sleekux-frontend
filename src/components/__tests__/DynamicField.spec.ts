import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DynamicField from '../DynamicField.vue';
import type { TransformationParameterDef } from '../../types/transformation';

const makeParam = (overrides: Partial<TransformationParameterDef> = {}): TransformationParameterDef => ({
    name: 'target',
    label: 'Target',
    type: 'text',
    required: false,
    defaultValue: '',
    placeholder: '',
    ...overrides,
});

const mountField = (param: TransformationParameterDef, modelValue: string | number | boolean) =>
    mount(DynamicField, { props: { param, modelValue } });

describe('DynamicField', () => {
    describe('label', () => {
        it('shows the label', () => {
            const wrapper = mountField(makeParam({ label: 'Search For' }), '');
            expect(wrapper.find('.field-label').text()).toContain('Search For');
        });

        it('falls back to the parameter name when there is no label', () => {
            const wrapper = mountField(makeParam({ name: 'pattern', label: '' }), '');
            expect(wrapper.find('.field-label').text()).toContain('pattern');
        });

        it('marks required parameters with an asterisk', () => {
            const wrapper = mountField(makeParam({ required: true }), '');
            expect(wrapper.find('.required').exists()).toBe(true);
        });

        it('does not mark optional parameters', () => {
            const wrapper = mountField(makeParam({ required: false }), '');
            expect(wrapper.find('.required').exists()).toBe(false);
        });
    });

    describe('text input', () => {
        it('renders a text input with the current value and placeholder', () => {
            const wrapper = mountField(makeParam({ placeholder: 'e.g. foo' }), 'hello');
            const input = wrapper.find<HTMLInputElement>('input[type="text"]');

            expect(input.element.value).toBe('hello');
            expect(input.attributes('placeholder')).toBe('e.g. foo');
        });

        it('is used for regex and unknown types', () => {
            expect(mountField(makeParam({ type: 'regex' }), '').find('input[type="text"]').exists()).toBe(true);
            expect(mountField(makeParam({ type: 'something-else' }), '').find('input[type="text"]').exists()).toBe(true);
        });

        it('emits update:modelValue with the typed string', async () => {
            const wrapper = mountField(makeParam(), '');
            await wrapper.find('input[type="text"]').setValue('world');

            expect(wrapper.emitted('update:modelValue')).toEqual([['world']]);
        });

        it('sets the required attribute for required parameters', () => {
            const wrapper = mountField(makeParam({ required: true }), '');
            expect(wrapper.find('input[type="text"]').attributes()).toHaveProperty('required');
        });
    });

    describe('number input', () => {
        const numberParam = makeParam({ name: 'count', type: 'number' });

        it('renders a number input', () => {
            const wrapper = mountField(numberParam, 3);
            const input = wrapper.find<HTMLInputElement>('input[type="number"]');

            expect(input.exists()).toBe(true);
            expect(input.element.value).toBe('3');
        });

        it('emits the value as a number', async () => {
            const wrapper = mountField(numberParam, 0);
            await wrapper.find('input[type="number"]').setValue('42');

            expect(wrapper.emitted('update:modelValue')).toEqual([[42]]);
        });

        it('emits an empty string instead of 0 when the field is cleared', async () => {
            const wrapper = mountField(numberParam, 5);
            await wrapper.find('input[type="number"]').setValue('');

            expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
        });
    });

    describe('boolean input', () => {
        const boolParam = makeParam({ name: 'caseSensitive', type: 'boolean', placeholder: 'Match case' });

        it('renders a checkbox reflecting the current value', () => {
            const wrapper = mountField(boolParam, true);
            const checkbox = wrapper.find<HTMLInputElement>('input[type="checkbox"]');

            expect(checkbox.element.checked).toBe(true);
        });

        it('shows the placeholder as a hint', () => {
            const wrapper = mountField(boolParam, false);
            expect(wrapper.find('.hint').text()).toBe('Match case');
        });

        it('emits the checked state', async () => {
            const wrapper = mountField(boolParam, false);
            await wrapper.find('input[type="checkbox"]').setValue(true);

            expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
        });
    });

    // Regression: the component used to emit 'update:ModelValue', which v-model never receives
    describe('v-model binding', () => {
        it('updates the parent value through onUpdate:modelValue', async () => {
            let parentValue: string | number | boolean = 'initial';
            const wrapper = mount(DynamicField, {
                props: {
                    param: makeParam(),
                    modelValue: parentValue,
                    'onUpdate:modelValue': (val: string | number | boolean) => {
                        parentValue = val;
                    },
                },
            });

            await wrapper.find('input[type="text"]').setValue('changed');

            expect(parentValue).toBe('changed');
        });
    });
});
