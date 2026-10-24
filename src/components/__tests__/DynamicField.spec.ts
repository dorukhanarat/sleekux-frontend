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

    describe('hint', () => {
        it.each(['text', 'number', 'regex', 'boolean'])('stays visible for %s fields that have a value', (type) => {
            const value = type === 'number' ? 3 : type === 'boolean' ? true : 'both';
            const wrapper = mountField(makeParam({ type, placeholder: 'Where to trim: start, end or both' }), value);

            expect(wrapper.find('.hint').text()).toBe('Where to trim: start, end or both');
        });

        it('is not rendered when the parameter has no placeholder', () => {
            const wrapper = mountField(makeParam({ placeholder: '' }), 'x');
            expect(wrapper.find('.hint').exists()).toBe(false);
        });
    });

    describe('text field', () => {
        it('renders a text area with the current value', () => {
            const wrapper = mountField(makeParam(), 'hello');
            const textarea = wrapper.find<HTMLTextAreaElement>('textarea');

            expect(textarea.element.value).toBe('hello');
        });

        it('is used for unknown types', () => {
            const wrapper = mountField(makeParam({ type: 'something-else' }), '');
            expect(wrapper.find('textarea').exists()).toBe(true);
        });

        it('keeps line breaks in the value and grows to fit them', () => {
            const wrapper = mountField(makeParam(), 'a\nb\nc');
            const textarea = wrapper.find<HTMLTextAreaElement>('textarea');

            expect(textarea.element.value).toBe('a\nb\nc');
            expect(textarea.attributes('rows')).toBe('3');
        });

        it('emits update:modelValue with the typed string, including line breaks', async () => {
            const wrapper = mountField(makeParam(), '');
            await wrapper.find('textarea').setValue('one\ntwo');

            expect(wrapper.emitted('update:modelValue')).toEqual([['one\ntwo']]);
        });

        it('sets the required attribute for required parameters', () => {
            const wrapper = mountField(makeParam({ required: true }), '');
            expect(wrapper.find('textarea').attributes()).toHaveProperty('required');
        });
    });

    describe('regex field', () => {
        it('renders a single-line monospace input', async () => {
            const wrapper = mountField(makeParam({ type: 'regex' }), '\\d+');
            const input = wrapper.find<HTMLInputElement>('input[type="text"]');

            expect(input.element.value).toBe('\\d+');
            expect(input.classes()).toContain('mono');

            await input.setValue('\\s+');
            expect(wrapper.emitted('update:modelValue')).toEqual([['\\s+']]);
        });
    });

    describe('whitespace preview', () => {
        it.each([
            [' ', '·'],
            [', ', ',·'],
            ['\n', '↵'],
            ['\t-', '→-'],
        ])('spells out the whitespace in %j', (value, preview) => {
            const wrapper = mountField(makeParam(), value);
            expect(wrapper.find('.whitespace-preview code').text()).toBe(preview);
        });

        it('is hidden for values without edge whitespace or line breaks', () => {
            const wrapper = mountField(makeParam(), 'a b');
            expect(wrapper.find('.whitespace-preview').exists()).toBe(false);
        });

        it('is hidden for number fields', () => {
            const wrapper = mountField(makeParam({ type: 'number' }), 5);
            expect(wrapper.find('.whitespace-preview').exists()).toBe(false);
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

            await wrapper.find('textarea').setValue('changed');

            expect(parentValue).toBe('changed');
        });
    });
});
