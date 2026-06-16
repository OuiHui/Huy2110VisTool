<script setup lang="ts">
import type { CallingConventionExample } from '../types';

defineProps<{
  selectedExample: CallingConventionExample;
  stepIndex: number;
  returnAddr: string;
}>();
</script>

<template>
  <Card>
    <template #title>Stack Frame</template>
    <template #content>
      <div class="stack-diagram font-mono text-[12px] shadow-sm flex flex-col">
        <!-- Top ellipsis -->
        <div class="transition-all duration-300 ease-in-out flex items-center border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400">&nbsp;</div>
          <div class="flex-1 py-1 text-center border-l border-surface-300 dark:border-surface-600 font-bold text-lg leading-none">&#8942;</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500"></div>
        </div>

        <!-- Saved registers (step 8+ shifted) -->
        <template v-for="(regName, i) in [...selectedExample.usedRegs].reverse()" :key="'saved-reg-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 8 || stepIndex === 10 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-50 dark:bg-surface-900']">
            <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="(stepIndex === 8 || stepIndex === 9) && i === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">{{ regName }} Saved</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 8 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 8 ? `Old ${regName}` : '????' }}</div>
          </div>
        </template>

        <!-- Locals (step 7+ shifted) -->
        <template v-for="(localName, i) in [...selectedExample.localNames].reverse()" :key="'local-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 7 ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-surface-200 dark:bg-surface-700']">
            <div class="w-14 pr-2 py-1 text-right font-bold flex flex-col justify-center items-end gap-1">
              <span v-if="i === 0" class="text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 7 || stepIndex === 10 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</span>
              <span v-if="i === selectedExample.numLocals - 1" class="text-emerald-600 dark:text-emerald-400 transition-all duration-300 ease-in-out" :class="stepIndex >= 6 && stepIndex <= 11 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'">R5 &rarr;</span>
            </div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Local: {{ localName }}</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500">????</div>
          </div>
        </template>

        <!-- Old R5 (step 5+ shifted) -->
        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 5 || stepIndex === 12 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 5 || stepIndex === 6 || stepIndex === 11 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Old R5</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 5 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 5 ? 'xFE10' : '????' }}</div>
        </div>

        <!-- Return Address / Old R7 (step 4+ shifted) -->
        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 4 || stepIndex === 13 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 4 || stepIndex === 12 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Address (old R7)</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 4 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 4 ? returnAddr : '????' }}</div>
        </div>

        <!-- Return Value slot (step 3+ shifted) -->
        <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 3 || stepIndex === 15 || stepIndex === 9 ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 z-10' : 'bg-surface-50 dark:bg-surface-900']">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 3 || stepIndex === 13 || stepIndex === 14 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Return Value</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 9 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 9 ? selectedExample.returnValue : '????' }}</div>
        </div>

        <!-- Args (step 1+ shifted) -->
        <template v-for="(argName, i) in selectedExample.argNames" :key="'arg-'+i">
          <div :class="['transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600', stepIndex === 1 || stepIndex === 16 ? 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-500 z-10' : 'bg-yellow-50 dark:bg-yellow-900/20']">
            <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="i === 0 && (stepIndex === 1 || stepIndex === 2 || stepIndex === 15) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center border-l border-surface-300 dark:border-surface-600">Arg: {{ argName }}</div>
            <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono" :class="stepIndex >= 1 ? 'text-surface-900 dark:text-surface-50' : 'text-surface-300 dark:text-surface-600'">{{ stepIndex >= 1 ? (selectedExample.argValues[i] || 'N/A') : '????' }}</div>
          </div>
        </template>

        <!-- Bottom ellipsis — R6 points here at step 0 and step 16 -->
        <div class="transition-all duration-300 ease-in-out flex items-center border-x border-b border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800">
          <div class="w-14 pr-2 py-2 text-right font-bold text-orange-600 dark:text-orange-400 transition-all duration-300 ease-in-out" :class="stepIndex === 0 || stepIndex === 16 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 py-1 text-center border-l border-surface-300 dark:border-surface-600 font-bold text-lg leading-none">&#8942;</div>
          <div class="w-20 p-2 text-center border-l border-surface-300 dark:border-surface-600 font-mono text-surface-500"></div>
        </div>
      </div>
    </template>
  </Card>
</template>
