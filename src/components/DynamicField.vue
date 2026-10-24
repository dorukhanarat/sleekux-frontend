<script setup lang="ts">

import type { TransformationParameterDef } from '../types/transformation';


interface Props {
    param: TransformationParameterDef,
    modelValue: string | boolean | number;
}

defineProps<Props>();

const emit = defineEmits<{
    (e: 'update:ModelValue', val: string | number | boolean): void;
}>();

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
                @change="emit('update:ModelValue', ($event.target as HTMLInputElement).checked)"
            />
            <span v-if="param.placeholder" class="hint">{{ param.placeholder }}</span>
        </div>

        <!-- Number Type: Render Number Input -->
        <input
            v-else-if="param.type === 'number'"
            type="number"
            :value="modelValue"
            :placeholder="param.placeholder || ''"
            :required="param.required"
            @input="emit('update:ModelValue', Number(($event.target as HTMLInputElement).value))"
        />

        <!-- Fallback / Text / Regex: Render Text Input -->
        <input
            v-else
            type="text"
            :value="modelValue"
            :placeholder="param.placeholder || ''"
            :required="param.required"
            @input="emit('update:ModelValue', ($event.target as HTMLInputElement).value)"
        />
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

.text-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.9rem;
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