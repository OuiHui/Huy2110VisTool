<script setup lang="ts">
import { computed } from 'vue';
import type { HighlightRange, PseudocodeState } from './sequences';
    const { pseudocode, cycle, running } = defineProps<{
        pseudocode: PseudocodeState,
        cycle: number,
        running: boolean
    }>();

    const highlightRanges = computed(() => {
        let ranges: HighlightRange[] = [];

        let cursor = 0;
        for (let r of pseudocode.highlights) {
            if (cursor != r.start) {
                ranges.push({ start: cursor, end: r.start, cycle: -1 });
            }
            ranges.push(r);
            cursor = r.end;
        }
        if (cursor != pseudocode.source.length) {
            ranges.push({ start: cursor, end: pseudocode.source.length, cycle: -1 });
        }

        return ranges;
    });

    /**
     * Determines which classes should be provided in the pseudocode
     * based on the current cycle number.
     */
    function getAllEnabledClasses(cycle: number) {
        let cls = Array.from({ length: cycle }, (_, i) => `cy-done-${i}`);
        cls.push(`cy-active-${cycle}`);
        return cls;
    }
</script>

<style lang="css" scoped>
    @reference "@/style.css";

    .pseudocode-container {
        /* Preserve newlines while allowing wrapping to fit the side panel. */
        white-space: pre-wrap;
        display: block;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
        overflow-wrap: anywhere;
        font-size: 0.88rem;
        line-height: 1.45;
    }

    .cy-on-disabled {
        @apply text-surface-400 dark:text-surface-500;
    }
    .cy-done-0 .cy-on-0 {
        @apply text-red-400/90;
    }
    .cy-active-0 .cy-on-0 {
        @apply text-red-300 font-bold bg-red-500/25 px-1 rounded;
    }
    .cy-done-1 .cy-on-1 {
        @apply text-orange-400/90;
    }
    .cy-active-1 .cy-on-1 {
        @apply text-orange-300 font-bold bg-orange-500/25 px-1 rounded;
    }
    .cy-done-2 .cy-on-2 {
        @apply text-yellow-300/90;
    }
    .cy-active-2 .cy-on-2 {
        @apply text-yellow-200 font-bold bg-yellow-500/25 px-1 rounded;
    }
    .cy-done-3 .cy-on-3 {
        @apply text-green-400/90;
    }
    .cy-active-3 .cy-on-3 {
        @apply text-green-300 font-bold bg-green-500/25 px-1 rounded;
    }
    .cy-done-4 .cy-on-4 {
        @apply text-sky-400/90;
    }
    .cy-active-4 .cy-on-4 {
        @apply text-sky-300 font-bold bg-sky-500/25 px-1 rounded;
    }
    .cy-done-5 .cy-on-5 {
        @apply text-purple-300/90;
    }
    .cy-active-5 .cy-on-5 {
        @apply text-purple-200 font-bold bg-purple-500/25 px-1 rounded;
    }
    .cy-done-6 .cy-on-6 {
        @apply text-pink-400/90;
    }
    .cy-active-6 .cy-on-6 {
        @apply text-pink-300 font-bold bg-pink-500/25 px-1 rounded;
    }
</style>

<template>
    <div
        class="pseudocode-container"
        :class="getAllEnabledClasses(cycle)"
    >
        <span v-for="{start, end, cycle: c} of highlightRanges"
        class="font-mono transition-colors"
        :class="{ [`cy-on-${c}`] : typeof c != 'number' || c >= 0 }"
        style="display: inline;">
            {{ pseudocode.source.slice(start, end) }}
        </span>
    </div>
</template>