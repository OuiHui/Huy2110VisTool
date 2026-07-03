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
        <div class="stack-item ellipsis">
          <div class="w-14 pr-2 py-2 text-right font-bold">&nbsp;</div>
          <div class="flex-1 py-1 text-center font-bold text-lg leading-none">&#8942;</div>
          <div class="w-20 p-2 text-center font-mono"></div>
        </div>

        <!-- Saved registers (step 8+ shifted) -->
        <template v-for="(regName, i) in [...selectedExample.usedRegs].reverse()" :key="'saved-reg-'+i">
          <div :class="['stack-item', 'saved-reg', { 'active-step': stepIndex === 8 || stepIndex === 10 }]">
            <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="(stepIndex === 8 || stepIndex === 9) && i === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center">{{ regName }} Saved</div>
            <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': stepIndex >= 8 }">{{ stepIndex >= 8 ? `Old ${regName}` : '????' }}</div>
          </div>
        </template>

        <!-- Locals (step 7+ shifted) -->
        <template v-for="(localName, i) in [...selectedExample.localNames].reverse()" :key="'local-'+i">
          <div :class="['stack-item', 'local', { 'active-step': stepIndex === 7 }]">
            <div class="w-14 pr-2 py-1 text-right font-bold flex flex-col justify-center items-end gap-1">
              <span v-if="i === 0" class="stack-ptr-r6 transition-all duration-300 ease-in-out" :class="stepIndex === 7 || stepIndex === 10 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</span>
              <span v-if="i === selectedExample.numLocals - 1" class="stack-ptr-r5 transition-all duration-300 ease-in-out" :class="stepIndex >= 6 && stepIndex <= 11 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'">R5 &rarr;</span>
            </div>
            <div class="flex-1 p-2 text-center">Local: {{ localName }}</div>
            <div class="w-20 p-2 text-center font-mono">????</div>
          </div>
        </template>

        <!-- Old R5 (step 5+ shifted) -->
        <div :class="['stack-item', 'old-r5', { 'active-step': stepIndex === 5 || stepIndex === 12 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="stepIndex === 5 || stepIndex === 6 || stepIndex === 11 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Old R5</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': stepIndex >= 5 }">{{ stepIndex >= 5 ? 'xFE10' : '????' }}</div>
        </div>

        <!-- Return Address / Old R7 (step 4+ shifted) -->
        <div :class="['stack-item', 'return-addr', { 'active-step': stepIndex === 4 || stepIndex === 13 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="stepIndex === 4 || stepIndex === 12 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Return Address (old R7)</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': stepIndex >= 4 }">{{ stepIndex >= 4 ? returnAddr : '????' }}</div>
        </div>

        <!-- Return Value slot (step 3+ shifted) -->
        <div :class="['stack-item', 'return-value', { 'active-step': stepIndex === 3 || stepIndex === 15 || stepIndex === 9 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="stepIndex === 3 || stepIndex === 13 || stepIndex === 14 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Return Value</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': stepIndex >= 9 }">{{ stepIndex >= 9 ? selectedExample.returnValue : '????' }}</div>
        </div>

        <!-- Args (step 1+ shifted) -->
        <template v-for="(argName, i) in selectedExample.argNames" :key="'arg-'+i">
          <div :class="['stack-item', 'arg', { 'active-step': stepIndex === 1 || stepIndex === 16 }]">
            <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="i === 0 && (stepIndex === 1 || stepIndex === 2 || stepIndex === 15) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center">Arg: {{ argName }}</div>
            <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': stepIndex >= 1 }">{{ stepIndex >= 1 ? (selectedExample.argValues[i] || 'N/A') : '????' }}</div>
          </div>
        </template>

        <!-- Bottom ellipsis — R6 points here at step 0 and step 16 -->
        <div class="stack-item ellipsis">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="stepIndex === 0 || stepIndex === 16 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 py-1 text-center font-bold text-lg leading-none">&#8942;</div>
          <div class="w-20 p-2 text-center font-mono"></div>
        </div>
      </div>
    </template>
  </Card>
</template>
