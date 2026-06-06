<script setup lang="ts">
import type { AsmLine, StepActor } from '../types';
import { splitAsmComment } from '../useCallingConvention';

defineProps<{
  stepIndex: number;
  currentActor: StepActor;
  callerAsm: AsmLine[];
  calleeAsm: AsmLine[];
}>();
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
                <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
              </template>
              <template v-else>
                <span class="asm-blank">&nbsp;</span>
              </template>
            </div>
          </div>
        </div>
        <div class="asm-col">
          <div class="asm-head callee">Callee</div>
          <div class="asm-pre" role="list" aria-label="Callee assembly">
            <div v-for="(line, idx) in calleeAsm" :key="idx" :class="['asm-line', 'callee', { current: stepIndex === line.step && currentActor === 'callee' }]" role="listitem">
              <template v-if="line.text.trim().length">
                <span class="asm-code">{{ splitAsmComment(line.text).code }}</span><span v-if="splitAsmComment(line.text).comment" class="asm-comment"> {{ splitAsmComment(line.text).comment }}</span>
              </template>
              <template v-else>
                <span class="asm-blank">&nbsp;</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>