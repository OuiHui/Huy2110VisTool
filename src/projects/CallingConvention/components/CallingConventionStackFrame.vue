<script setup lang="ts">
import type { CallingConventionExample } from '../types';

defineProps<{
  selectedExample: CallingConventionExample;
  blockIndex: number;
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

        <!-- Saved registers (block 8+ shifted) -->
        <template v-for="(regName, i) in [...selectedExample.usedRegs].reverse()" :key="'saved-reg-'+i">
          <div :class="['stack-item', 'saved-reg', { 'active-step': blockIndex === 8 || blockIndex === 10 }]">
            <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="(blockIndex === 8 || blockIndex === 9) && i === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center">{{ regName }} Saved</div>
            <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': blockIndex >= 8 }">{{ blockIndex >= 8 ? `Old ${regName}` : '????' }}</div>
          </div>
        </template>

        <!-- Locals (block 7+ shifted) -->
        <template v-for="(localName, i) in [...selectedExample.localNames].reverse()" :key="'local-'+i">
          <div :class="['stack-item', 'local', { 'active-step': blockIndex === 7 }]">
            <div class="w-14 pr-2 py-1 text-right font-bold flex flex-col justify-center items-end gap-1">
              <span v-if="i === 0" class="stack-ptr-r6 transition-all duration-300 ease-in-out" :class="blockIndex === 7 || blockIndex === 10 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</span>
              <span v-if="i === selectedExample.numLocals - 1" class="stack-ptr-r5 transition-all duration-300 ease-in-out" :class="blockIndex >= 6 && blockIndex <= 11 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'">R5 &rarr;</span>
            </div>
            <div class="flex-1 p-2 text-center">Local: {{ localName }}</div>
            <div class="w-20 p-2 text-center font-mono">????</div>
          </div>
        </template>

        <!-- Old R5 (block 5+ shifted) -->
        <div :class="['stack-item', 'old-r5', { 'active-step': blockIndex === 5 || blockIndex === 12 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="blockIndex === 5 || blockIndex === 6 || blockIndex === 11 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Old R5</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': blockIndex >= 5 }">{{ blockIndex >= 5 ? 'xFE10' : '????' }}</div>
        </div>

        <!-- Return Address / Old R7 (block 4+ shifted) -->
        <div :class="['stack-item', 'return-addr', { 'active-step': blockIndex === 4 || blockIndex === 13 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="blockIndex === 4 || blockIndex === 12 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Return Address (old R7)</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': blockIndex >= 4 }">{{ blockIndex >= 4 ? returnAddr : '????' }}</div>
        </div>

        <!-- Return Value slot (block 3+ shifted) -->
        <div :class="['stack-item', 'return-value', { 'active-step': blockIndex === 3 || blockIndex === 15 || blockIndex === 9 }]">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="blockIndex === 3 || blockIndex === 13 || blockIndex === 14 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 p-2 text-center">Return Value</div>
          <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': blockIndex >= 9 }">{{ blockIndex >= 9 ? selectedExample.returnValue : '????' }}</div>
        </div>

        <!-- Args (block 1+ shifted) -->
        <template v-for="(argName, i) in selectedExample.argNames" :key="'arg-'+i">
          <div :class="['stack-item', 'arg', { 'active-step': blockIndex === 1 || blockIndex === 16 }]">
            <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="i === 0 && (blockIndex === 1 || blockIndex === 2 || blockIndex === 15) ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
            <div class="flex-1 p-2 text-center">Arg: {{ argName }}</div>
            <div class="w-20 p-2 text-center font-mono" :class="{ 'value-resolved': blockIndex >= 1 }">{{ blockIndex >= 1 ? (selectedExample.argValues[i] || 'N/A') : '????' }}</div>
          </div>
        </template>

        <!-- Bottom ellipsis — R6 points here at block 0 and block 16 -->
        <div class="stack-item ellipsis">
          <div class="w-14 pr-2 py-2 text-right font-bold stack-ptr-r6 transition-all duration-300 ease-in-out" :class="blockIndex === 0 || blockIndex === 16 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'">R6 &rarr;</div>
          <div class="flex-1 py-1 text-center font-bold text-lg leading-none">&#8942;</div>
          <div class="w-20 p-2 text-center font-mono"></div>
        </div>
      </div>
    </template>
  </Card>
</template>

