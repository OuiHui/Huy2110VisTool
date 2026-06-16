<script setup lang="ts">
defineProps<{
  stepIndex: number;
}>();
</script>

<template>
  <Card>
    <template #title>Calling Convention Steps</template>
    <template #content>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Buildup</h3>
          <div class="mt-2 font-semibold">Caller:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1">
            <li :class="['transition-colors', { 'font-bold text-blue-600 dark:text-blue-400': stepIndex === 1 }]">Pushes arguments right-to-left</li>
            <li :class="['transition-colors', { 'font-bold text-blue-600 dark:text-blue-400': stepIndex === 2 }]">JSR/JSRR to subroutine</li>
          </ol>
          <div class="mt-3 font-semibold">Then, Callee:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="3">
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 3 }]">Save space for return value</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 4 }]">Save return address (R7)</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 5 }]">Save old frame pointer (R5)</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 6 }]">Set R5</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 7 }]">Allocate locals</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 8 }]">Save Registers</li>
          </ol>
        </div>
        <div>
          <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Teardown</h3>
          <div class="mt-2 font-semibold">Callee:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="9">
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 9 }]">Execute Body / Stores result</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 10 }]">Restores Registers</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 11 }]">Pops all local variables</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 12 }]">Restores R5</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 13 }]">Restores R7</li>
            <li :class="['transition-colors', { 'font-bold text-green-600 dark:text-green-400': stepIndex === 14 }]">RET</li>
          </ol>
          <div class="mt-3 font-semibold">Then, Caller:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="15">
            <li :class="['transition-colors', { 'font-bold text-blue-600 dark:text-blue-400': stepIndex === 15 }]">Loads return value</li>
            <li :class="['transition-colors', { 'font-bold text-blue-600 dark:text-blue-400': stepIndex === 16 }]">Pops return value and arguments</li>
          </ol>
        </div>
      </div>
    </template>
  </Card>
</template>