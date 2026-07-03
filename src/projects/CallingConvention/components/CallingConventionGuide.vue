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
          <div class="mt-2 font-semibold"><span class="cc-caller-text">Caller</span>:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1">
            <li :class="['transition-colors', { 'cc-caller-active': stepIndex === 1 }]">Pushes arguments right-to-left</li>
            <li :class="['transition-colors', { 'cc-caller-active': stepIndex === 2 }]">JSR/JSRR to subroutine</li>
          </ol>
          <div class="mt-3 font-semibold">Then, <span class="cc-callee-text">Callee</span>:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="3">
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 3 }]">Save space for return value</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 4 }]">Save return address (R7)</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 5 }]">Save old frame pointer (R5)</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 6 }]">Set R5</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 7 }]">Allocate locals</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 8 }]">Save Registers</li>
          </ol>
        </div>
        <div>
          <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Teardown</h3>
          <div class="mt-2 font-semibold"><span class="cc-callee-text">Callee</span>:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="9">
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 9 }]">Execute Body / Stores result</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 10 }]">Restores Registers</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 11 }]">Pops all local variables</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 12 }]">Restores R5</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 13 }]">Restores R7</li>
            <li :class="['transition-colors', { 'cc-callee-active': stepIndex === 14 }]">RET</li>
          </ol>
          <div class="mt-3 font-semibold">Then, <span class="cc-caller-text">Caller</span>:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="15">
            <li :class="['transition-colors', { 'cc-caller-active': stepIndex === 15 }]">Loads return value</li>
            <li :class="['transition-colors', { 'cc-caller-active': stepIndex === 16 }]">Pops return value and arguments</li>
          </ol>
        </div>
      </div>
    </template>
  </Card>
</template>