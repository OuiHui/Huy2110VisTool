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
     * based on the current cycle number and running state.
     */
    function getAllEnabledClasses(cycle: number, running: boolean) {
        let cls = Array.from({ length: cycle }, (_, i) => `cy-done-${i}`);
        if (running) {
            cls.push(`cy-active-${cycle}`);
        }

        return cls;
    }
</script>

<style lang="css" scoped>
    @reference "@/style.css";

    .cy-on-disabled {
        @apply text-surface-400 dark:text-surface-500;
    }
    .cy-done-0 .cy-on-0 {
        @apply text-red-500;
    }
    .cy-active-0 .cy-on-0 {
        @apply text-red-800 dark:text-red-200;
    }
    .cy-done-1 .cy-on-1 {
        @apply text-orange-500;
    }
    .cy-active-1 .cy-on-1 {
        @apply text-orange-800 dark:text-orange-200;
    }
    .cy-done-2 .cy-on-2 {
        @apply text-yellow-500;
    }
    .cy-active-2 .cy-on-2 {
        @apply text-yellow-800 dark:text-yellow-200;
    }
    .cy-done-3 .cy-on-3 {
        @apply text-green-500;
    }
    .cy-active-3 .cy-on-3 {
        @apply text-green-800 dark:text-green-200;
    }
    .cy-done-4 .cy-on-4 {
        @apply text-blue-500;
    }
    .cy-active-4 .cy-on-4 {
        @apply text-blue-800 dark:text-blue-200;
    }
    .cy-done-5 .cy-on-5 {
        @apply text-purple-500;
    }
    .cy-active-5 .cy-on-5 {
        @apply text-purple-800 dark:text-purple-200;
    }
    .cy-done-6 .cy-on-6 {
        @apply text-pink-500;
    }
    .cy-active-6 .cy-on-6 {
        @apply text-pink-800 dark:text-pink-200;
    }
</style>

<template>
    <span
        class="contents"
        :class="getAllEnabledClasses(cycle, running)"
    >
        <span v-for="{start, end, cycle: c} of highlightRanges"
        class="font-mono whitespace-pre-wrap transition-colors"
        :class="{ [`cy-on-${c}`] : typeof c != 'number' || c >= 0 }">
            {{ pseudocode.source.slice(start, end) }}
        </span>
    </span>
</template>