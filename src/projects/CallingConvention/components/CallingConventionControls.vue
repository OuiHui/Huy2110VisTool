<script setup lang="ts">
import { computed } from 'vue';
import { splitAsmComment } from '../useCallingConvention';
import type { CallingConventionExample, StepActor, StepDefinition } from '../types';

const props = defineProps<{
  examples: CallingConventionExample[];
  selectedExampleId: string;
  selectedExample: CallingConventionExample;
  stepIndex: number;
  steps: ReadonlyArray<StepDefinition>;
  stepAsmLines: string[];
  currentActor: StepActor;
}>();

const emit = defineEmits<{
  'update:selectedExampleId': [value: string];
  'update:stepIndex': [value: number];
  prev: [];
  next: [];
  reset: [];
}>();

const selectedExampleIdModel = computed({
  get: () => props.selectedExampleId,
  set: (value: string) => emit('update:selectedExampleId', value)
});

const stepIndexModel = computed({
  get: () => props.stepIndex,
  set: (value: number) => emit('update:stepIndex', value)
});
</script>

<template>
  <Card>
    <template #title>Controls</template>
    <template #content>
      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-surface-700 dark:text-surface-200">Select C Example</span>
          <Select v-model="selectedExampleIdModel" :options="examples" optionLabel="name" optionValue="id" class="w-full text-left" />
        </label>

        <div class="cc-input font-mono cc-readonly text-xs overflow-x-auto whitespace-pre bg-surface-50 dark:bg-surface-900/50">
{{ selectedExample.cCode }}
        </div>

        <Divider />

        <div class="flex items-center gap-2">
          <Button @click="$emit('prev')" :disabled="stepIndex === 0">Prev</Button>
          <Button @click="$emit('next')" :disabled="stepIndex === steps.length - 1">Next</Button>
          <Button severity="secondary" @click="$emit('reset')">Reset</Button>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-baseline justify-between">
            <div class="text-sm font-semibold text-surface-700 dark:text-surface-200 shrink-0 whitespace-nowrap">Step {{ stepIndex + 1 }} / {{ steps.length }}</div>
            <div class="text-xs text-surface-500 font-mono text-right">
              <div v-for="(l, i) in stepAsmLines" :key="i" class="asm-mini-line">
                <template v-if="l.trim().length">
                  <span class="asm-code">{{ splitAsmComment(l).code }}</span>
                  <span v-if="splitAsmComment(l).comment" class="asm-comment"> {{ splitAsmComment(l).comment }}</span>
                </template>
                <template v-else>
                  <span class="asm-blank">&nbsp;</span>
                </template>
              </div>
            </div>
          </div>
          <Slider v-model="stepIndexModel" :min="0" :max="steps.length - 1" :step="1" />
        </div>

        <div class="mt-2 flex flex-col gap-2 pt-2 border-t border-surface-200 dark:border-surface-800">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-semibold text-surface-800 dark:text-surface-100">{{ steps[stepIndex].title }}</span>
            <span class="actor-chip" :class="currentActor">{{ currentActor }}</span>
          </div>
          <p class="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
            {{ steps[stepIndex].detail }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>