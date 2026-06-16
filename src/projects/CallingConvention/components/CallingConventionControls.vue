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
      <div class="flex flex-col gap-2.5">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">Example</span>
          <Select v-model="selectedExampleIdModel" :options="examples" optionLabel="name" optionValue="id" class="w-full text-left" />
        </label>

        <div class="cc-input font-mono cc-readonly text-xs overflow-x-auto whitespace-pre bg-surface-50 dark:bg-surface-900/50 min-h-[9.5rem]">
{{ selectedExample.cCode }}
        </div>

        <Divider class="!my-0" />

        <div class="flex items-center gap-2">
          <Button size="small" @click="$emit('prev')" :disabled="stepIndex === 0">Prev</Button>
          <Button size="small" @click="$emit('next')" :disabled="stepIndex === steps.length - 1">Next</Button>
          <Button size="small" severity="secondary" @click="$emit('reset')">Reset</Button>
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-semibold text-surface-700 dark:text-surface-200 tabular-nums whitespace-nowrap pt-0.5">Step {{ stepIndex + 1 }} / {{ steps.length }}</span>
            <div class="text-[11px] text-surface-400 dark:text-surface-500 font-mono text-right min-h-[2.4rem] leading-[1.35]">
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

        <div class="flex flex-col gap-1.5 pt-2 border-t border-surface-200 dark:border-surface-800">
          <div class="flex items-start justify-between gap-2 min-h-[2.5rem]">
            <span class="text-base font-semibold text-surface-800 dark:text-surface-100 leading-snug">{{ steps[stepIndex].title }}</span>
            <span class="actor-chip shrink-0 mt-1" :class="currentActor">{{ currentActor }}</span>
          </div>
          <p class="text-sm text-surface-600 dark:text-surface-300 leading-relaxed min-h-[6rem]">
            {{ steps[stepIndex].detail }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>