<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { AsmLine, StepActor } from '../types';
import { splitAsmComment } from '../useCallingConvention';

const props = defineProps<{
  stepIndex: number;
  currentActor: StepActor;
  callerAsm: AsmLine[];
  calleeAsm: AsmLine[];
}>();

const calleeContainer = ref<HTMLElement | null>(null);

watch(() => props.stepIndex, async () => {
  await nextTick();
  if (calleeContainer.value) {
    const currentEl = calleeContainer.value.querySelector('.asm-line.callee.current');
    if (currentEl) {
      currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});
</script>

<template>
  <Card>
    <template #title>LC-3 Assembly</template>
    <template #content>
      <div class="asm">
        <div class="asm-col">
          <div class="asm-head caller">Caller</div>
          <div class="asm-pre" role="list" aria-label="Caller assembly">
            <div v-for="(line, idx) in callerAsm" :key="idx" :class="['asm-line', 'caller', { current: stepIndex === line.step }]" role="listitem">
              <template v-if="line.text.trim().length">
                <span v-if="line.addr" class="text-surface-400 dark:text-surface-500 mr-3 select-none inline-block w-12">{{ line.addr }}</span>
                <span v-else class="inline-block w-12 mr-3"></span>
                <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
              </template>
              <template v-else>
                <span class="inline-block w-12 mr-3"></span>
                <span class="asm-blank">&nbsp;</span>
              </template>
            </div>
          </div>
        </div>
        <div class="asm-col">
          <div class="asm-head callee">Callee</div>
          <div ref="calleeContainer" class="asm-pre" role="list" aria-label="Callee assembly">
            <div v-for="(line, idx) in calleeAsm" :key="idx" :class="['asm-line', 'callee', { current: stepIndex === line.step && currentActor === 'callee' }]" role="listitem">
              <template v-if="line.text.trim().length">
                <span v-if="line.addr" class="text-surface-400 dark:text-surface-500 mr-3 select-none inline-block w-12">{{ line.addr }}</span>
                <span v-else class="inline-block w-12 mr-3"></span>
                <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
              </template>
              <template v-else>
                <span class="inline-block w-12 mr-3"></span>
                <span class="asm-blank">&nbsp;</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>