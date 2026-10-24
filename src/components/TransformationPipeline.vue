<!-- src/components/TransformationPipeline.vue -->
<script setup lang ="ts">
    import { ref, onMounted, watch } from 'vue';
    import { isAxiosError } from 'axios';
    import { executeTransformations, getTransformations } from '../api/transformationApi';
    import type { TransformResponse,  ConfiguredStep, TransformationDefinition } from '../types/transformation';
    import DynamicField from './DynamicField.vue';

    // Reactive States
    const definitions = ref<TransformationDefinition[]>([]);
    const selectedKey = ref<string>('');
    const inputText = ref<string>('');
    const steps = ref<ConfiguredStep[]>([]);
    const result = ref<TransformResponse | null>(null)

    const isLoading = ref<boolean>(false);
    const isExecuting = ref<boolean>(false);
    const errorMessage = ref<string | null>(null);
    // Kept apart from errorMessage so a failed run doesn't hide the form
    const runError = ref<string | null>(null);

    // Prefer the backend's "message" field over axios's generic status text
    const getErrorMessage = (err: unknown, fallback: string): string => {
        if (isAxiosError(err) && typeof err.response?.data?.message === 'string') {
            return err.response.data.message;
        }
        return err instanceof Error ? err.message : fallback;
    };

    // Fetch available transformations
    const loadTransformations = async () => {
        isLoading.value = true;
        errorMessage.value = null;

        try {
            const data = await getTransformations();
            definitions.value = data;
        } catch ( err: unknown) {
            errorMessage.value = getErrorMessage(err, 'Failed to load transformations');
        } finally {
            isLoading.value = false;
        }
    }

    // Step Management
    const addStep = () => {
        if(!selectedKey.value) return;

        const def = definitions.value.find((d) => d.key === selectedKey.value);
        if(!def) return;

        const defaultParams: Record<string, string | number | boolean> = {};
        def.parameters.forEach((param) => {
            defaultParams[param.name] = param.defaultValue;
        });

        steps.value.push({
            id: crypto.randomUUID(),
            transformationKey: def.key,
            displayName: def.displayName,
            parameters: defaultParams,
        });

        selectedKey.value = '';
    };

    const removeStep = (id: string) => {
        steps.value = steps.value.filter((step) => step.id !== id);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= steps.value.length) return;

        const [movedItem] = steps.value.splice(index, 1);
        steps.value.splice(targetIndex, 0, movedItem);
    };

    const getParamDefinitions = (transforrmationKey: string) => {
        const def = definitions.value.find((d) => d.key === transforrmationKey);
        return def ? def.parameters : [];
    }

    // Fill in cleared optional numbers with their default and collect missing required values
    const buildStepParameters = (step: ConfiguredStep, index: number, problems: string[]) => {
        const parameters = { ...step.parameters };

        getParamDefinitions(step.transformationKey).forEach((param) => {
            const value = parameters[param.name];
            if (value !== '' && value !== undefined && value !== null) return;

            if (param.required) {
                problems.push(`Step ${index + 1} (${step.displayName}): ${param.label || param.name} is required.`);
            } else if (param.type === 'number') {
                parameters[param.name] = param.defaultValue;
            }
        });

        return parameters;
    };

    // Execute Pipeline
    const runPipeline = async () => {
        if (!inputText.value) return;

        runError.value = null;

        const problems: string[] = [];
        const payloadSteps = steps.value.map((s, index) => ({
            transformationKey: s.transformationKey,
            parameters: buildStepParameters(s, index, problems),
        }));

        if (problems.length > 0) {
            runError.value = problems.join('\n');
            return;
        }

        isExecuting.value = true;

        try {
            result.value = await executeTransformations({
                text: inputText.value,
                steps: payloadSteps,
            });
        } catch (err: unknown) {
            result.value = null;
            runError.value = getErrorMessage(err, 'Failed to execute transformations.');
        } finally {
            isExecuting.value = false;
        }
    };

    // An old run error no longer applies once the pipeline is edited
    watch([inputText, steps], () => {
        runError.value = null;
    }, { deep: true });

    onMounted(() => {
        loadTransformations();
    });
</script>

<template>
    <div class = "pipeline-container">
        <h2>Transformation Pipeline</h2>

        <!-- Loading State -->
        <div v-if="isLoading" class="status-msg">
            Loading available transformations from server...
        </div>

        <!-- Error State  -->
        <div v-else-if="errorMessage" class="error-box">
            <p>Error: {{ errorMessage }}</p>
            <button @click="loadTransformations">Retry</button>
        </div>

         <!-- Ready State -->
        <div v-else class="form-section">
            <label for="input-text">Input Text:</label>
            <textarea
                id="input-text"
                rows="3"
                v-model="inputText"
                placeholder="Enter text to transform"
                class="text-input"
            ></textarea>
            <label for="transformation-select">Choose a Transformation:</label>
            <div class="select-row">
                <select id="transformation-select" v-model="selectedKey">
                <option value="" disabled>-- Select an operation --</option>
                <option
                    v-for="item in definitions"
                    :key="item.key"
                    :value="item.key"
                >
                    {{ item.displayName }}
                </option>
                </select>

                <button :disabled="!selectedKey" @click="addStep">
                + Add Step
                </button>
            </div>
            <!-- Configured Steps List -->
            <div class="steps-container">
                <h3>Pipeline Steps ({{ steps.length }})</h3>
                <div v-if="steps.length === 0" class="empty-state">
                No steps added yet. Select a transformation above and click <strong>+ Add Step</strong>.
                </div>
                <ul v-else class="step-list">
                    <li v-for="(step, index) in steps" :key="step.id" class="step-item">
                        <div class="step-header">
                        <span class="step-order">{{ index + 1 }}</span>
                        <span class="step-name">{{ step.displayName }}</span>
                        <code class="step-key">{{ step.transformationKey }}</code>

                        <!-- Action buttons for reordering and deleting -->
                        <div class="step-actions">
                            <button
                            type="button"
                            class="action-btn"
                            title="Move Up"
                            :disabled="index === 0"
                            @click="moveStep(index, 'up')"
                            >
                            ↑
                            </button>
                            <button
                            type="button"
                            class="action-btn"
                            title="Move Down"
                            :disabled="index === steps.length - 1"
                            @click="moveStep(index, 'down')"
                            >
                            ↓
                            </button>
                            <button
                            type="button"
                            class="action-btn delete-btn"
                            title="Delete"
                            @click="removeStep(step.id)"
                            >
                            ✕
                            </button>
                        </div>
                        </div>
                        <!--Dynamic Form Fields-->
                        <div v-if="getParamDefinitions(step.transformationKey).length > 0" class="params-grid">
                        <DynamicField
                            v-for="param in getParamDefinitions(step.transformationKey)"
                            :key="param.name"
                            :param="param"
                            v-model="step.parameters[param.name]"
                        />
                        </div>
                        <div v-else class="no-params-msg">
                        No additional configuration required.
                        </div>
                    </li>
                </ul>
            </div>

            <!--Pipeline button -->
            <div style="margin-top: 1rem;">
                <button
                    type="button"
                    :disabled="isExecuting || steps.length === 0 || !inputText" 
                    @click="runPipeline"
                    >
                    {{ isExecuting ? 'Running' : 'Run Pipeline' }}
                </button>
            </div>

            <!-- Run Error: shown under the button, the steps stay editable -->
            <div v-if="runError" class="error-box run-error" role="alert">
                {{ runError }}
            </div>

            <!-- Results & Snapshot Display -->
            <div v-if="result" style="margin-top: 1.5rem; border-top: 1px solid #cbd5e1; padding-top: 1rem;">
                <h3>Result</h3>
                <p><strong>Original:</strong> <code class="text-value">{{ result.originalText }}</code></p>
                <p><strong>Final Output:</strong> <code class="text-value" style="color: #15803d; font-weight: bold;">{{ result.finalResult }}</code></p>

                <h4>Step Snapshots</h4>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #cbd5e1;">
                                    <th style="padding: 6px;">#</th>
                                    <th style="padding: 6px;">Step</th>
                                    <th style="padding: 6px;">Input</th>
                                    <th style="padding: 6px;">Output</th>
                                    <th style="padding: 6px;">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in result.history"
                        :key="item.stepIndex"
                        style="border-bottom: 1px solid #e2e8f0;"
                        >
                            <td style="padding: 6px;">{{ item.stepIndex }}</td>
                            <td style="padding: 6px;">{{ item.transformationName }}</td>
                            <td style="padding: 6px;"><code class="text-value">{{ item.inputSnapshot }}</code></td>
                            <td style="padding: 6px;"><code class="text-value">{{ item.outputSnapshot }}</code></td>
                            <td style="padding: 6px;">{{ item.executionTime }} ms</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Keeping previous styles, with additions for the form grid */
.pipeline-container {
  max-width: 650px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: sans-serif;
  background-color: #ffffff;
}

.status-msg {
  color: #64748b;
  font-style: italic;
}

.error-box {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
}

.run-error {
  white-space: pre-line;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.select-row {
  display: flex;
  gap: 0.5rem;
}

.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.text-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}

select {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background-color: #2563eb;
  color: white;
  font-weight: 500;
  cursor: pointer;
}

button:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.steps-container {
  border-top: 1px solid #f1f5f9;
  padding-top: 1rem;
}

.steps-container h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  color: #1e293b;
}

.empty-state {
  padding: 1.5rem;
  text-align: center;
  color: #64748b;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
}

.step-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.step-item {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  background-color: #f8fafc;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.step-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: bold;
  color: #334155;
}

.step-name {
  font-weight: 600;
  color: #0f172a;
}

.step-key {
  font-size: 0.8rem;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.step-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.action-btn {
  background-color: transparent;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 2px 8px;
  border-radius: 4px;
}

.action-btn:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.delete-btn {
  color: #ef4444;
  border-color: #fca5a5;
}

.delete-btn:hover:not(:disabled) {
  background-color: #fee2e2;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Keep leading/trailing and repeated whitespace visible, so changes like trim show up */
.text-value {
  white-space: pre-wrap;
  word-break: break-word;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 1px 2px;
}

.no-params-msg {
  font-size: 0.85rem;
  color: #64748b;
  font-style: italic;
  padding-top: 0.25rem;
}
</style>