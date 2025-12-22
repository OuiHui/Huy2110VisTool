<script setup lang="ts">
import { computed } from 'vue';
import type { InstructionFormatSegment, InstructionFormatSpec } from './instructionFormats';

const { format } = defineProps<{ format: InstructionFormatSpec }>();

function bitToColumnStart(bit: number) {
  // Column 1 is bit 15, column 16 is bit 0
  return 16 - bit;
}

const segmentsWithGrid = computed(() =>
  format.segments.map((seg: InstructionFormatSegment) => {
    const start = bitToColumnStart(seg.startBit);
    const endExclusive = bitToColumnStart(seg.endBit) + 1;
    return {
      ...seg,
      gridColumn: `${start} / ${endExclusive}`,
    };
  })
);

const bits = computed(() => Array.from({ length: 16 }, (_, i) => 15 - i));
</script>

<template>
  <div class="fmt-root">
    <div class="fmt-bitrow" aria-hidden="true">
      <div v-for="b in bits" :key="b" class="fmt-bitcell font-mono">{{ b }}</div>
    </div>

    <div class="fmt-fields" role="img" :aria-label="`${format.title} 16-bit instruction format`">
      <div
        v-for="seg in segmentsWithGrid"
        :key="`${seg.startBit}-${seg.endBit}-${seg.text}`"
        class="fmt-seg font-mono"
        :style="{ gridColumn: seg.gridColumn }"
      >
        {{ seg.text }}
      </div>
    </div>

    <div class="fmt-under" aria-hidden="true">
      <div class="fmt-opcode-wrap">
        <div class="fmt-bracket"></div>
        <div class="fmt-opcode font-mono">opcode</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@/style.css";

.fmt-root {
  @apply w-full;
}

.fmt-bitrow {
  @apply grid gap-0;
  grid-template-columns: repeat(16, minmax(0, 1fr));
}

.fmt-bitcell {
  @apply text-[11px] text-surface-500 dark:text-surface-400 text-center px-0.5;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.fmt-fields {
  @apply grid gap-0 mt-1;
  grid-template-columns: repeat(16, minmax(0, 1fr));
}

.fmt-under {
  @apply grid mt-0;
  grid-template-columns: repeat(16, minmax(0, 1fr));
}

.fmt-opcode-wrap {
  grid-column: 1 / 5; /* bits 15..12 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.fmt-bracket {
  width: 90%;
  height: 6px;
  border-left: 1.5px solid var(--p-surface-500);
  border-right: 1.5px solid var(--p-surface-500);
  border-bottom: 1.5px solid var(--p-surface-500);
  border-radius: 0 0 3px 3px;
}

.fmt-opcode {
  @apply text-[11px] text-surface-500 dark:text-surface-400 text-center mt-0.5;
}

.fmt-seg {
  @apply text-xs text-center py-2 select-none;
  @apply border border-surface-400 dark:border-surface-700;
  @apply bg-surface-100 dark:bg-surface-950;
}
</style>
