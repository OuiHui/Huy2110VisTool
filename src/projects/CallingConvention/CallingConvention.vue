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
  <div class="cc-page-shell">
    <header class="cc-page-header">
      <h1 class="text-xl font-bold tracking-tight text-center text-surface-900 dark:text-surface-50">
        LC-3 Calling Convention Visualizer
      </h1>
    </header>

    <div class="cc-main-layout">
      <!-- LEFT: Controls sidebar -->
      <div class="cc-sidebar">
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

      <!-- RIGHT: Guide on top, Assembly below -->
      <div class="cc-right-col">
        <div class="cc-guide-row">
          <CallingConventionGuide :selectedExample="selectedExample" :stepIndex="stepIndex" />
        </div>
        <div class="cc-asm-row">
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
  </div>
</template>