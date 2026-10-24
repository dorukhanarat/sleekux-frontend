<!-- src/components/TransformationPipeline.vue -->
<script setup lang ="ts">
    import {ref, onMounted} from 'vue';
    import { getTransformations } from '../api/transformationApi';
    import type { TransformationDefinition } from '../types/transformation';

    const definitions = ref<TransformationDefinition[]>([]);
    const selectedKey = ref<String>('');
    const isLoading = ref<boolean>(false);
    const errorMessage = ref<string | null>(null);

    const loadTransformations = async () => {
        isLoading.value = true;
        errorMessage.value = null;

        try {
            const data = await getTransformations();
            definitions.value = data;
        } catch ( err: unknown) {
            if (err instanceof Error) {
                errorMessage.value = err.message;
            } else {
                errorMessage.value = 'Failed to load transformations';
            }
        } finally {
            isLoading.value = false;
        }

    }

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
                <label for="transformation-select">Choose a Transformation: </label>
                <div class ="select-row">
                    <!-- v-model binds the selected value directly to our selectedKey ref -->
                    <select id="transformation-select" v-model="selectedKey">
                        <option vakue="" disabled>-- Select an operation --</option>
                        <option v-for="item in definitions"
                                :key="item.key"
                                :value="item.key">
                                {{ item.displayName }}
                            </option>
                    </select>
                    <button :disabled="!selectedKey">
                        Add Step
                    </button>
                </div>

                <!-- Preview what was selected -->
                <p v:if="selectedKey" class="selection-preview">
                    Currently selected key: <code>{{ selectedKey }}</code>
                </p>
        </div>
    </div>
</template>

<style scoped>
/* 'scoped' ensures these styles apply only to this component */
.pipeline-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: sans-serif;
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

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.select-row {
  display: flex;
  gap: 0.5rem;
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

.selection-preview {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #475569;
}

code {
  background-color: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #0f172a;
}
</style>