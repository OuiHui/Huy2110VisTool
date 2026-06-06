<script setup lang="ts">
import CallingConventionAssembly from './components/CallingConventionAssembly.vue';
import CallingConventionControls from './components/CallingConventionControls.vue';
import CallingConventionGuide from './components/CallingConventionGuide.vue';
import { useCallingConvention } from './useCallingConvention.ts';
import './style.css';

const {
  examples,
  steps,
  selectedExampleId,
  selectedExample,
  stepIndex,
  stepAsmLines,
  currentActor,
  callerAsm,
  calleeAsm,
  nextStep,
  prevStep,
  reset
} = useCallingConvention();
</script>

<template>
  <div class="px-4 py-3 max-w-400 w-full mx-auto overflow-x-hidden">
    <header class="mb-3">
      <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
        LC-3 Calling Convention Visualizer
      </h1>
      <p class="mt-1 text-sm md:text-base text-surface-700 dark:text-surface-200 max-w-[90ch]">
        Step through the stack-frame lifecycle (caller → callee → caller) using the exact sequence you provided.
        In this view, addresses decrease upward so pushes visually build upward (R6 still decrements).
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] gap-4">
      <div class="flex flex-col gap-3 cc-sticky">
        <CallingConventionControls
          :examples="examples"
          :selectedExampleId="selectedExampleId"
          :selectedExample="selectedExample"
          :stepIndex="stepIndex"
          :steps="steps"
          :stepAsmLines="stepAsmLines"
          :currentActor="currentActor"
          @update:selectedExampleId="selectedExampleId = $event"
          @update:stepIndex="stepIndex = $event"
          @prev="prevStep"
          @next="nextStep"
          @reset="reset"
        />
      </div>

      <div class="cc-right">
        <div class="flex flex-col gap-3">
          <CallingConventionGuide :selectedExample="selectedExample" :stepIndex="stepIndex" />
        </div>

        <CallingConventionAssembly
          :selectedExample="selectedExample"
          :stepIndex="stepIndex"
          :currentActor="currentActor"
          :callerAsm="callerAsm"
          :calleeAsm="calleeAsm"
        />
      </div>
    </div>
  </div>
</template>