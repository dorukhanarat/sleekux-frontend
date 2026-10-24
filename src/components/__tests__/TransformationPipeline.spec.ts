import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import TransformationPipeline from '../TransformationPipeline.vue';
import { executeTransformations, getTransformations } from '../../api/transformationApi';
import type { TransformationDefinition, TransformResponse } from '../../types/transformation';

vi.mock('../../api/transformationApi', () => ({
    getTransformations: vi.fn(),
    executeTransformations: vi.fn(),
}));

const definitions: TransformationDefinition[] = [
    { key: 'upper', displayName: 'Uppercase', parameters: [] },
    {
        key: 'replace',
        displayName: 'Replace',
        parameters: [
            { name: 'target', label: 'Target', type: 'text', required: true, defaultValue: 'a', placeholder: '' },
            { name: 'count', label: 'Count', type: 'number', required: false, defaultValue: 1, placeholder: '' },
            { name: 'caseSensitive', label: 'Case Sensitive', type: 'boolean', required: false, defaultValue: false, placeholder: '' },
        ],
    },
];

const mountLoaded = async () => {
    const wrapper = mount(TransformationPipeline);
    await flushPromises();
    return wrapper;
};

const findButton = (wrapper: VueWrapper, text: string) => {
    const button = wrapper.findAll('button').find((b) => b.text().includes(text));
    if (!button) throw new Error(`Button "${text}" not found`);
    return button;
};

const addStep = async (wrapper: VueWrapper, key: string) => {
    await wrapper.find('select').setValue(key);
    await findButton(wrapper, '+ Add Step').trigger('click');
};

const stepNames = (wrapper: VueWrapper) => wrapper.findAll('.step-name').map((s) => s.text());

describe('TransformationPipeline', () => {
    beforeEach(() => {
        vi.mocked(getTransformations).mockReset().mockResolvedValue(definitions);
        vi.mocked(executeTransformations).mockReset();
    });

    describe('loading transformations', () => {
        it('shows a loading message while fetching', async () => {
            vi.mocked(getTransformations).mockReturnValue(new Promise(() => {}));
            const wrapper = mount(TransformationPipeline);
            await nextTick();

            expect(wrapper.find('.status-msg').exists()).toBe(true);
        });

        it('lists the available transformations in the dropdown', async () => {
            const wrapper = await mountLoaded();
            const options = wrapper.findAll('option').map((o) => o.text());

            expect(options).toContain('Uppercase');
            expect(options).toContain('Replace');
        });

        it('shows the error and retries on request', async () => {
            vi.mocked(getTransformations).mockRejectedValueOnce(new Error('Server down'));
            const wrapper = await mountLoaded();

            expect(wrapper.find('.error-box').text()).toContain('Server down');

            await findButton(wrapper, 'Retry').trigger('click');
            await flushPromises();

            expect(getTransformations).toHaveBeenCalledTimes(2);
            expect(wrapper.find('.error-box').exists()).toBe(false);
        });

        it('shows a generic message for non-Error failures', async () => {
            vi.mocked(getTransformations).mockRejectedValueOnce('boom');
            const wrapper = await mountLoaded();

            expect(wrapper.find('.error-box').text()).toContain('Failed to load transformations');
        });
    });

    describe('managing steps', () => {
        it('starts with no steps and the Add button disabled', async () => {
            const wrapper = await mountLoaded();

            expect(wrapper.find('.empty-state').exists()).toBe(true);
            expect(findButton(wrapper, '+ Add Step').attributes()).toHaveProperty('disabled');
        });

        it('adds a step and resets the dropdown', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'upper');

            expect(stepNames(wrapper)).toEqual(['Uppercase']);
            expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('');
        });

        it('shows a message for steps without parameters', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'upper');

            expect(wrapper.find('.no-params-msg').exists()).toBe(true);
        });

        it('renders parameter fields filled with default values', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'replace');

            const grid = wrapper.find('.params-grid');
            expect((grid.find('textarea').element as HTMLTextAreaElement).value).toBe('a');
            expect((grid.find('input[type="number"]').element as HTMLInputElement).value).toBe('1');
            expect((grid.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false);
        });

        it('removes a step', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'upper');
            await addStep(wrapper, 'replace');

            await wrapper.findAll('.delete-btn')[0].trigger('click');

            expect(stepNames(wrapper)).toEqual(['Replace']);
        });

        it('moves steps up and down', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'upper');
            await addStep(wrapper, 'replace');

            await wrapper.findAll('button[title="Move Up"]')[1].trigger('click');
            expect(stepNames(wrapper)).toEqual(['Replace', 'Uppercase']);

            await wrapper.findAll('button[title="Move Down"]')[0].trigger('click');
            expect(stepNames(wrapper)).toEqual(['Uppercase', 'Replace']);
        });

        it('disables Move Up on the first step and Move Down on the last', async () => {
            const wrapper = await mountLoaded();
            await addStep(wrapper, 'upper');
            await addStep(wrapper, 'replace');

            expect(wrapper.findAll('button[title="Move Up"]')[0].attributes()).toHaveProperty('disabled');
            expect(wrapper.findAll('button[title="Move Down"]')[1].attributes()).toHaveProperty('disabled');
        });
    });

    describe('running the pipeline', () => {
        const response: TransformResponse = {
            originalText: 'banana',
            finalResult: 'BXNXNX',
            history: [
                {
                    stepIndex: 1,
                    transformationKey: 'replace',
                    transformationName: 'Replace',
                    parameters: {},
                    inputSnapshot: 'banana',
                    outputSnapshot: 'bxnxnx',
                    executionTime: 2,
                },
            ],
        };

        it('is disabled until there is input text and at least one step', async () => {
            const wrapper = await mountLoaded();
            expect(findButton(wrapper, 'Run Pipeline').attributes()).toHaveProperty('disabled');

            await wrapper.find('#input-text').setValue('banana');
            expect(findButton(wrapper, 'Run Pipeline').attributes()).toHaveProperty('disabled');

            await addStep(wrapper, 'upper');
            expect(findButton(wrapper, 'Run Pipeline').attributes()).not.toHaveProperty('disabled');
        });

        // Regression: edited parameters used to be ignored and defaults were sent instead
        it('sends edited parameter values in the payload', async () => {
            vi.mocked(executeTransformations).mockResolvedValue(response);
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'replace');
            await addStep(wrapper, 'upper');

            const grid = wrapper.find('.params-grid');
            await grid.find('textarea').setValue('x');
            await grid.find('input[type="number"]').setValue('3');
            await grid.find('input[type="checkbox"]').setValue(true);

            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(executeTransformations).toHaveBeenCalledWith({
                text: 'banana',
                steps: [
                    { transformationKey: 'replace', parameters: { target: 'x', count: 3, caseSensitive: true } },
                    { transformationKey: 'upper', parameters: {} },
                ],
            });
        });

        it('displays the result and step snapshots', async () => {
            vi.mocked(executeTransformations).mockResolvedValue(response);
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'replace');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(wrapper.text()).toContain('BXNXNX');
            const cells = wrapper.findAll('tbody td').map((td) => td.text());
            expect(cells).toEqual(['1', 'Replace', 'banana', 'bxnxnx', '2 ms']);
        });

        it('keeps leading and trailing whitespace visible in results', async () => {
            vi.mocked(executeTransformations).mockResolvedValue({
                originalText: '  banana  ',
                finalResult: 'banana',
                history: [{ ...response.history[0], inputSnapshot: '  banana  ', outputSnapshot: 'banana' }],
            });
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('  banana  ');
            await addStep(wrapper, 'upper');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            const values = wrapper.findAll('code.text-value').map((c) => c.element.textContent);
            expect(values).toEqual(['  banana  ', 'banana', '  banana  ', 'banana']);
        });

        it('shows a run error under the button and keeps the steps visible', async () => {
            vi.mocked(executeTransformations).mockRejectedValue(new Error('Bad regex'));
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'upper');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(wrapper.find('.run-error').text()).toContain('Bad regex');
            expect(stepNames(wrapper)).toEqual(['Uppercase']);
            expect(wrapper.findAll('button').some((b) => b.text() === 'Retry')).toBe(false);
        });

        it("shows the backend's error message instead of the HTTP status text", async () => {
            const axiosError = Object.assign(new Error('Request failed with status code 400'), {
                isAxiosError: true,
                response: { data: { status: 400, error: 'Bad Request', message: 'Unclosed group near index 1' } },
            });
            vi.mocked(executeTransformations).mockRejectedValue(axiosError);
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'upper');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(wrapper.find('.run-error').text()).toBe('Unclosed group near index 1');
        });

        it('clears the run error once the pipeline is edited', async () => {
            vi.mocked(executeTransformations).mockRejectedValue(new Error('Bad regex'));
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'upper');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            await wrapper.find('#input-text').setValue('apple');
            expect(wrapper.find('.run-error').exists()).toBe(false);
        });

        it('does not call the backend when a required value is empty', async () => {
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'replace');
            await wrapper.find('.params-grid textarea').setValue('');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(executeTransformations).not.toHaveBeenCalled();
            expect(wrapper.find('.run-error').text()).toBe('Step 1 (Replace): Target is required.');
        });

        it('allows whitespace-only values in required fields', async () => {
            vi.mocked(executeTransformations).mockResolvedValue(response);
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'replace');
            await wrapper.find('.params-grid textarea').setValue(' ');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(vi.mocked(executeTransformations).mock.calls[0][0].steps[0].parameters.target).toBe(' ');
        });

        it('sends the default value for a cleared optional number field', async () => {
            vi.mocked(executeTransformations).mockResolvedValue(response);
            const wrapper = await mountLoaded();

            await wrapper.find('#input-text').setValue('banana');
            await addStep(wrapper, 'replace');
            await wrapper.find('.params-grid input[type="number"]').setValue('');
            await findButton(wrapper, 'Run Pipeline').trigger('click');
            await flushPromises();

            expect(vi.mocked(executeTransformations).mock.calls[0][0].steps[0].parameters.count).toBe(1);
        });
    });
});
