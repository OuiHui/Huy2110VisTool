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