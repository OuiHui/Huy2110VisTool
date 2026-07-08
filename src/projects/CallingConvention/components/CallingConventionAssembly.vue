<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type { AsmLine, StepActor } from '../types';
import { splitAsmComment } from '../useCallingConvention';

const props = defineProps<{
  blockIndex: number;
  activeLineAddr: string | undefined;
  currentActor: StepActor;
  callerAsm: AsmLine[];
  calleeAsm: AsmLine[];
}>();

type AsmGroup =
  | { kind: 'block'; step: number; lines: AsmLine[] }
  | { kind: 'spacer' };

function groupLines(lines: AsmLine[]): AsmGroup[] {
  const groups: AsmGroup[] = [];
  let current: { step: number; lines: AsmLine[] } | null = null;

  for (const line of lines) {
    if (line.step < 0) {
      if (current) { groups.push({ kind: 'block', ...current }); current = null; }
      groups.push({ kind: 'spacer' });
    } else if (current && current.step === line.step) {
      current.lines.push(line);
    } else {
      if (current) groups.push({ kind: 'block', ...current });
      current = { step: line.step, lines: [line] };
    }
  }
  if (current) groups.push({ kind: 'block', ...current });
  return groups;
}

const groupedCallerAsm = computed(() => groupLines(props.callerAsm));
const groupedCalleeAsm = computed(() => groupLines(props.calleeAsm));

const callerContainer = ref<HTMLElement | null>(null);
const calleeContainer = ref<HTMLElement | null>(null);

function scrollBlockIntoView(container: HTMLElement | null) {
  if (!container) return;
  const block = container.querySelector('.asm-block.current') as HTMLElement | null;
  if (block) block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

watch(() => props.blockIndex, async () => {
  await nextTick();
  scrollBlockIntoView(callerContainer.value);
  scrollBlockIntoView(calleeContainer.value);
});
</script>

<template>
  <Card>
    <template #title>LC-3 Assembly</template>
    <template #content>
      <div class="asm">
        <div class="asm-col">
          <div class="asm-head caller">Caller</div>
          <div ref="callerContainer" class="asm-pre" role="list" aria-label="Caller assembly">
            <template v-for="(group, gi) in groupedCallerAsm" :key="gi">
              <div v-if="group.kind === 'spacer'" class="asm-spacer" aria-hidden="true" />
              <div
                v-else
                :class="['asm-block', 'caller', { current: blockIndex === group.step }]"
                role="group"
              >
                <div
                  v-for="(line, li) in group.lines"
                  :key="li"
                  :class="['asm-line', 'caller', { 'active-instr': activeLineAddr !== undefined && activeLineAddr === line.addr }]"
                  role="listitem"
                >
                  <span v-if="line.addr" class="text-surface-400 dark:text-surface-500 mr-3 select-none inline-block w-12">{{ line.addr }}</span>
                  <span v-else class="inline-block w-12 mr-3"></span>
                  <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
        <div class="asm-col">
          <div class="asm-head callee">Callee</div>
          <div ref="calleeContainer" class="asm-pre" role="list" aria-label="Callee assembly">
            <template v-for="(group, gi) in groupedCalleeAsm" :key="gi">
              <div v-if="group.kind === 'spacer'" class="asm-spacer" aria-hidden="true" />
              <div
                v-else
                :class="['asm-block', 'callee', { current: blockIndex === group.step && currentActor === 'callee' }]"
                role="group"
              >
                <div
                  v-for="(line, li) in group.lines"
                  :key="li"
                  :class="['asm-line', 'callee', { 'active-instr': activeLineAddr !== undefined && activeLineAddr === line.addr }]"
                  role="listitem"
                >
                  <span v-if="line.addr" class="text-surface-400 dark:text-surface-500 mr-3 select-none inline-block w-12">{{ line.addr }}</span>
                  <span v-else class="inline-block w-12 mr-3"></span>
                  <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
                </div>
              </div>
            </template>

          </div>
        </div>
      </div>
    </template>
  </Card>
</template>