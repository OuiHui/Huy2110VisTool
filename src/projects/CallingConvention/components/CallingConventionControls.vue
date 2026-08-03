<script setup lang="ts">
import { computed } from 'vue';
import { splitAsmComment } from '../useCallingConvention';
import type { CallingConventionExample, StepDefinition } from '../types';

const props = defineProps<{
  examples: CallingConventionExample[];
  selectedExampleId: string;
  selectedExample: CallingConventionExample;
  instrIndex: number;
  blockIndex: number;
  totalInstrs: number;
  activeLineAddr: string | undefined;
  steps: ReadonlyArray<StepDefinition>;
  currentActor: 'caller' | 'callee';
}>();

const emit = defineEmits<{
  'update:selectedExampleId': [value: string];
  'update:instrIndex': [value: number];
  instrPrev: [];
  instrNext: [];
  blockPrev: [];
  blockNext: [];
  reset: [];
}>();

const selectedExampleIdModel = computed({
  get: () => props.selectedExampleId,
  set: (value: string) => emit('update:selectedExampleId', value)
});

const instrIndexModel = computed({
  get: () => Math.max(0, props.instrIndex),
  set: (value: number) => emit('update:instrIndex', value - 1)
});

const atStart = computed(() => props.instrIndex <= -1);
const atEnd = computed(() => props.instrIndex >= props.totalInstrs - 1);
</script>

<template>
  <Card class="cc-controls-card">
    <template #title>Controls</template>
    <template #content>
      <div class="flex flex-col gap-1.5">
        <label class="flex flex-col gap-0.5">
          <span class="text-[11px] font-semibold text-slate-300 uppercase tracking-wide opacity-90">Example</span>
          <Select v-model="selectedExampleIdModel" :options="examples" optionLabel="name" optionValue="id" class="w-full text-left" overlayClass="cc-select-overlay" />
        </label>

        <div class="cc-input font-mono cc-readonly bg-slate-900/50 leading-snug text-[0.82rem] !py-1.5 !px-2">
{{ selectedExample.cCode }}
        </div>

        <Divider class="!my-0.5" />

        <div class="flex items-center justify-between gap-1 flex-wrap text-xs">
          <div class="flex items-center gap-1">
            <span class="text-slate-300 opacity-80 text-[11px] mr-0.5">Instr</span>
            <Button size="small" aria-label="Previous Instruction" v-tooltip.top="'Prev Instruction'" @click="$emit('instrPrev')" :disabled="atStart" class="!p-1">
              <mdi-chevron-left />
            </Button>
            <Button size="small" aria-label="Next Instruction" v-tooltip.top="'Next Instruction'" @click="$emit('instrNext')" :disabled="atEnd" class="!p-1">
              <mdi-chevron-right />
            </Button>
          </div>

          <div class="flex items-center gap-1">
            <span class="text-slate-300 opacity-80 text-[11px] mr-0.5">Block</span>
            <Button size="small" aria-label="Previous Block" v-tooltip.top="'Prev Block'" @click="$emit('blockPrev')" :disabled="blockIndex <= 0" class="!p-1">
              <mdi-chevron-double-left />
            </Button>
            <Button size="small" aria-label="Next Block" v-tooltip.top="'Next Block'" @click="$emit('blockNext')" :disabled="blockIndex >= steps.length - 1" class="!p-1">
              <mdi-chevron-double-right />
            </Button>
          </div>

          <Button size="small" severity="secondary" @click="$emit('reset')" class="!px-2 !py-1 text-xs">Reset</Button>
        </div>

        <div class="flex flex-col gap-0.5 my-0.5">
          <Slider
            v-model="instrIndexModel"
            :min="0"
            :max="Math.max(0, totalInstrs - 1)"
            :step="1"
          />
        </div>

        <div class="flex flex-col gap-1 pt-1 border-t border-slate-700/60">
          <div class="flex items-center justify-between gap-2">
            <div class="flex flex-col gap-0">
              <span class="text-[11px] text-slate-400 font-mono tabular-nums">
                Block {{ blockIndex }} / {{ steps.length - 1 }}
                <template v-if="activeLineAddr"> — @{{ activeLineAddr }}</template>
              </span>
              <span class="text-sm font-semibold text-slate-100 leading-snug">{{ steps[blockIndex]?.title }}</span>
            </div>
            <span class="actor-chip shrink-0" :class="currentActor">{{ currentActor }}</span>
          </div>
          <p class="text-xs text-slate-300 leading-snug">
            {{ steps[blockIndex]?.detail }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>
