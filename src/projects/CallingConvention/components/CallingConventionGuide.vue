<script setup lang="ts">
import type { CallingConventionExample } from '../types';

defineProps<{
  selectedExample: CallingConventionExample;
  stepIndex: number;
}>();
</script>

<template>
  <Card>
    <template #title>Calling Convention Steps</template>
    <template #content>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
        <div>
          <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Buildup</h3>
          <div class="mt-2 font-semibold">Caller:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1">
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 0 }]">Pushes arguments right-to-left</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 1 }]">JSR/JSRR to subroutine</li>
          </ol>
          <div class="mt-3 font-semibold">Then, Callee:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="3">
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 2 }]">Save space for return value</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 3 }]">Save return address (R7)</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 4 }]">Save old frame pointer (R5)</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 5 }]">Set R5 &amp; Allocate locals</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 6 }]">Saves Registers</li>
          </ol>
        </div>
        <div>
          <h3 class="font-bold mb-1 border-b border-surface-200 dark:border-surface-700 pb-1">Teardown</h3>
          <div class="mt-2 font-semibold">Callee:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="8">
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 7 }]">Execute Body / Stores result</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 8 }]">Restores Registers</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 9 }]">Pops all local variables</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 10 }]">Restores R5</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 11 }]">Restores R7</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 12 }]">RET</li>
          </ol>
          <div class="mt-3 font-semibold">Then, Caller:</div>
          <ol class="list-decimal list-inside ml-1 space-y-1" start="14">
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 13 }]">Loads return value</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 14 }]">Pops return value and arguments</li>
            <li :class="['transition-colors', { 'font-bold text-primary dark:text-primary-400': stepIndex === 15 }]">Continue</li>
          </ol>
        </div>
      </div>

      <div class="stack-diagram w-full font-mono text-[13px] sm:text-sm shadow-sm flex flex-col mx-auto max-w-sm mt-4">
        <div class="transition-all duration-300 ease-in-out flex items-center border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400">&nbsp;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">R0-R4</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500"></div>
        </div>

        <template v-for="(regName, i) in [...selectedExample.usedRegs].reverse()" :key="'saved-reg-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 6 || stepIndex === 8 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-50 dark:bg-surface-900']">
            <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 6 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">{{ regName }} Saved</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 6 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 6 && stepIndex <= 8 ? `Old ${regName}` : '????' }}</div>
          </div>
        </template>

        <template v-for="(localName, i) in [...selectedExample.localNames].reverse()" :key="'local-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 5 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-200 dark:bg-surface-700']">
            <div class="w-14 pr-2 py-1 text-right font-bold flex flex-col justify-center items-end gap-1">
              <span v-if="i === 0" class="text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 5 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</span>
              <span v-if="i === selectedExample.numLocals - 1" class="text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-in-out" :class="stepIndex >= 5 && stepIndex <= 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'">R5 &rarr;</span>
            </div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Local: {{ localName }}</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500">????</div>
          </div>
        </template>

        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 4 || stepIndex === 10 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="(stepIndex >= 4 && stepIndex <= 5) || stepIndex === 9 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Old R5</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 4 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 4 ? 'xFE10' : '????' }}</div>
        </div>

        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 3 || stepIndex === 11 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 3 || stepIndex === 10 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Address (old R7)</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 3 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 3 ? 'x3001' : '????' }}</div>
        </div>

        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 2 || stepIndex === 13 || stepIndex === 7 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 2 || stepIndex === 11 || stepIndex === 12 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Value</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 7 && stepIndex <= 13 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 7 ? selectedExample.returnValue : '????' }}</div>
        </div>

        <template v-for="(argName, i) in selectedExample.argNames" :key="'arg-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 0 || stepIndex === 14 ? 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 z-10' : 'bg-yellow-50 dark:bg-yellow-900/20']">
            <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="(i === 0 && (stepIndex === 1 || stepIndex === 0 || stepIndex === 13)) || (stepIndex >= 14 && i === selectedExample.numParams - 1) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Arg: {{ argName }}</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 0 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 0 ? (selectedExample.argValues[i] || 'N/A') : '????' }}</div>
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>