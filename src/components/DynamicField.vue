<script setup lang="ts">

import { computed } from 'vue';
import type { TransformationParameterDef } from '../types/transformation';

interface Props {
    param: TransformationParameterDef,
    modelValue: string | boolean | number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    (e: 'update:modelValue', val: string | number | boolean): void;
}>();

// Keep a cleared field empty instead of coercing it to 0
const onNumberInput = (event: Event) => {
    const input = event.target as HTMLInputElement;
    emit('update:modelValue', input.value === '' ? '' : input.valueAsNumber);
};

// Grow the text area with the value so line breaks stay visible
const textRows = computed(() => String(props.modelValue ?? '').split('\n').length);

// Values like " " or "\n" look empty in a field, so spell out their whitespace
const whitespacePreview = computed(() => {
    const value = props.modelValue;
    if (typeof value !== 'string' || !/^\s|\s$|[\n\t]/.test(value)) return null;
    return value.replace(/ /g, '·').replace(/\t/g, '→').replace(/\n/g, '↵');
});

</script>

<template>
    <div class="field-group">
        <label class="field-label">
            <span>{{ param.label || param.name }}</span>
            <span v-if="param.required" class="required">*</span>
        </label>


        <!-- Boolean Type: Render Checkbox -->
        <div v-if="param.type === 'boolean'" class="checkbox-row">
            <input
                type="checkbox"
                :checked="Boolean(modelValue)"
                @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
            />
            <span v-if="param.placeholder" class="hint">{{ param.placeholder }}</span>
        </div>

        <template v-else>
            <!-- Number Type: Render Number Input -->
            <input
                v-if="param.type === 'number'"
                type="number"
                class="text-input"
                :value="modelValue"
                :required="param.required"
                @input="onNumberInput"
            />

            <!-- Regex Type: Render Single-Line Input -->
            <input
                v-else-if="param.type === 'regex'"
                type="text"
                class="text-input mono"
                spellcheck="false"
                :value="modelValue"
                :required="param.required"
                @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            />

            <!-- Fallback / Text: Render Text Area, so line breaks can be entered -->
            <textarea
                v-else
                class="text-input"
                :rows="textRows"
                :value="String(modelValue ?? '')"
                :required="param.required"
                @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>

            <div
                v-if="whitespacePreview !== null"
                class="whitespace-preview"
                title="Spaces shown as ·, tabs as →, line breaks as ↵"
            >
                Value: <code>{{ whitespacePreview }}</code>
            </div>

            <span v-if="param.placeholder" class="hint">{{ param.placeholder }}</span>
        </template>
    </div>
</template>

<style scoped>
.field-group {
  display: flex;
  flex-direction: column;
  align-items: stretch; /* Prevents centering and keeps input full width */
  gap: 6px;
  width: 100%;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
  min-height: 20px;
}

.required {
  color: #ef4444;
  font-weight: bold;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
}

.hint {
  font-size: 0.8rem;
  color: #64748b;
}

.whitespace-preview {
  font-size: 0.8rem;
  color: #64748b;
}

.whitespace-preview code {
  white-space: pre;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  padding: 0 3px;
  color: #0f172a;
}

.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

textarea.text-input {
  resize: vertical;
}

.text-input.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.text-input::placeholder {
  color: #94a3b8;
}

.text-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb;
}
</style>
