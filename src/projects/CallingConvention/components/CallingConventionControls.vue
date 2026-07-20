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
  <Card>
    <template #title>Controls</template>
    <template #content>
      <div class="flex flex-col gap-2.5">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-slate-300 uppercase tracking-wide opacity-90">Example</span>
          <Select v-model="selectedExampleIdModel" :options="examples" optionLabel="name" optionValue="id" class="w-full text-left" overlayClass="cc-select-overlay" />
        </label>

        <div class="cc-input font-mono cc-readonly bg-slate-900/50 min-h-[9.5rem]">
{{ selectedExample.cCode }}
        </div>

        <Divider class="!my-0" />

        <div class="flex flex-col gap-2">
          <!-- Instruction-level step buttons -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-300 w-16 shrink-0 opacity-80">Instruction</span>
            <Button size="small" aria-label="Previous Instruction" v-tooltip.top="'Prev Instruction'" @click="$emit('instrPrev')" :disabled="atStart">
              <mdi-chevron-left />
            </Button>
            <Button size="small" aria-label="Next Instruction" v-tooltip.top="'Next Instruction'" @click="$emit('instrNext')" :disabled="atEnd">
              <mdi-chevron-right />
            </Button>
            <Button size="small" severity="secondary" @click="$emit('reset')">Reset</Button>
          </div>

          <!-- Block-level step buttons -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-300 w-16 shrink-0 opacity-80">Block</span>
            <Button size="small" aria-label="Previous Block" v-tooltip.top="'Prev Block'" @click="$emit('blockPrev')" :disabled="blockIndex <= 0">
              <mdi-chevron-double-left />
            </Button>
            <Button size="small" aria-label="Next Block" v-tooltip.top="'Next Block'" @click="$emit('blockNext')" :disabled="blockIndex >= steps.length - 1">
              <mdi-chevron-double-right />
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Slider
            v-model="instrIndexModel"
            :min="0"
            :max="Math.max(0, totalInstrs - 1)"
            :step="1"
          />
        </div>

        <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-700/60">
          <div class="flex items-start justify-between gap-2 min-h-[2.5rem]">
            <div class="flex flex-col gap-0.5">
              <span class="text-xs text-slate-300 font-mono tabular-nums opacity-80">
                Block {{ blockIndex }} / {{ steps.length - 1 }}
                <template v-if="activeLineAddr"> — @{{ activeLineAddr }}</template>
              </span>
              <span class="text-base font-semibold text-slate-100 leading-snug">{{ steps[blockIndex]?.title }}</span>
            </div>
            <span class="actor-chip shrink-0 mt-1" :class="currentActor">{{ currentActor }}</span>
          </div>
          <p class="text-sm text-slate-200 leading-relaxed min-h-[6rem]">
            {{ steps[blockIndex]?.detail }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>
