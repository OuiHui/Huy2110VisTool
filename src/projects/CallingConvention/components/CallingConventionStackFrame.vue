<script setup lang="ts">
import { computed } from 'vue';
import type { CallingConventionExample, MachineState } from '../types';

interface StackItem {
  address: number;
  label: string;
  kind: 'initial-sp' | 'arg' | 'return-value' | 'return-addr' | 'old-r5' | 'local' | 'saved-reg';
  name?: string;
}

const props = defineProps<{
  selectedExample: CallingConventionExample;
  blockIndex: number;
  returnAddr: string;
  current: MachineState;
}>();

const stackItems = computed<StackItem[]>(() => {
  const items: StackItem[] = [];
  const { numParams, numLocals, argNames, localNames, usedRegs } = props.selectedExample;

  // 1. Saved registers (lowest address first in the top-to-bottom layout, so we iterate in reverse)
  for (let i = usedRegs.length - 1; i >= 0; i--) {
    const addr = 0xFE00 - numParams - 4 - numLocals - i;
    items.push({
      address: addr,
      label: `${usedRegs[i]} Saved`,
      kind: 'saved-reg',
      name: usedRegs[i]
    });
  }

  // 2. Locals (iterate in reverse to show localNames[numLocals-1] at the top / lowest address)
  for (let i = numLocals - 1; i >= 0; i--) {
    const addr = 0xFE00 - numParams - 4 - i;
    items.push({
      address: addr,
      label: `Local: ${localNames[i]}`,
      kind: 'local',
      name: localNames[i]
    });
  }

  // 3. Old R5
  const oldR5Addr = 0xFE00 - numParams - 3;
  items.push({
    address: oldR5Addr,
    label: 'Old R5',
    kind: 'old-r5'
  });

  // 4. Return Address
  const retAddrAddr = 0xFE00 - numParams - 2;
  items.push({
    address: retAddrAddr,
    label: 'Return Address (old R7)',
    kind: 'return-addr'
  });

  // 5. Return Value
  const retValAddr = 0xFE00 - numParams - 1;
  items.push({
    address: retValAddr,
    label: 'Return Value',
    kind: 'return-value'
  });

  // 6. Args (iterate 0 to numParams-1)
  for (let i = 0; i < numParams; i++) {
    const addr = 0xFE00 - numParams + i;
    items.push({
      address: addr,
      label: `Arg: ${argNames[i]}`,
      kind: 'arg',
      name: argNames[i]
    });
  }

  // 7. Initial SP / Bottom Ellipsis
  items.push({
    address: 0xFE00,
    label: '⋮',
    kind: 'initial-sp'
  });

  return items;
});

function getDisplayValue(item: StackItem): string {
  if (item.kind === 'initial-sp') return '';
  const cell = props.current.memory.get(item.address);
  if (cell && cell.value !== '') {
    return cell.value;
  }
  return '????';
}
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

        <template v-for="item in stackItems" :key="item.address">
          <!-- Initial SP / Bottom Ellipsis -->
          <div v-if="item.kind === 'initial-sp'" class="stack-item ellipsis">
            <div class="w-14 pr-2 text-right font-mono font-bold flex flex-col justify-center items-end text-[10px] leading-tight select-none">
              <span
                class="stack-ptr-r6 transition-all duration-300 ease-in-out"
                :class="current.R6 === item.address ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 w-0 overflow-hidden pointer-events-none'"
              >
                R6&nbsp;&rarr;
              </span>
              <span
                class="stack-ptr-r5 transition-all duration-300 ease-in-out"
                :class="current.R5 === item.address ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 w-0 overflow-hidden pointer-events-none'"
              >
                R5&nbsp;&rarr;
              </span>
            </div>
            <div class="flex-1 py-1 text-center font-bold text-lg leading-none">&#8942;</div>
            <div class="w-20 p-2 text-center font-mono"></div>
          </div>

          <!-- Normal Stack Item -->
          <div
            v-else
            :class="[
              'stack-item',
              item.kind,
              { 'active-step': current.highlightAddrs.has(item.address) }
            ]"
          >
            <div class="w-14 pr-2 text-right font-mono font-bold flex flex-col justify-center items-end text-[10px] leading-tight select-none">
              <span
                class="stack-ptr-r6 transition-all duration-300 ease-in-out"
                :class="current.R6 === item.address ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 w-0 overflow-hidden pointer-events-none'"
              >
                R6&nbsp;&rarr;
              </span>
              <span
                class="stack-ptr-r5 transition-all duration-300 ease-in-out"
                :class="current.R5 === item.address ? 'opacity-100 translate-y-0' : 'opacity-0 h-0 w-0 overflow-hidden pointer-events-none'"
              >
                R5&nbsp;&rarr;
              </span>
            </div>
            <div class="flex-1 p-2 text-center">{{ item.label }}</div>
            <div
              class="w-20 p-2 text-center font-mono"
              :class="{ 'value-resolved': getDisplayValue(item) !== '????' }"
            >
              {{ getDisplayValue(item) }}
            </div>
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>

