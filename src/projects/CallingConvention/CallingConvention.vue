<script setup lang="ts">
import CallingConventionAssembly from './components/CallingConventionAssembly.vue';
import CallingConventionControls from './components/CallingConventionControls.vue';
import CallingConventionGuide from './components/CallingConventionGuide.vue';
import CallingConventionStackFrame from './components/CallingConventionStackFrame.vue';
import { useCallingConvention } from './useCallingConvention.ts';
import './style.css';

const {
  examples,
  steps,
  selectedExampleId,
  selectedExample,
  instrIndex,
  blockIndex,
  totalInstrs,
  activeLineAddr,
  currentActor,
  callerAsm,
  calleeAsm,
  returnAddr,
  current,
  instrNext,
  instrPrev,
  blockNext,
  blockPrev,
  reset
} = useCallingConvention();
</script>

<template>
  <div class="cc-page-shell">
    <div class="cc-page-inner">
      <header class="cc-page-header">
        <h1 class="text-2xl font-bold tracking-tight text-center cc-page-title">
          LC-3 Calling Convention Visualizer
        </h1>
      </header>

      <div class="cc-main-layout">
        <!-- LEFT: Controls + Stack Frame below -->
        <div class="cc-sidebar">
          <CallingConventionControls
            :examples="examples"
            :selectedExampleId="selectedExampleId"
            :selectedExample="selectedExample"
            :instrIndex="instrIndex"
            :blockIndex="blockIndex"
            :totalInstrs="totalInstrs"
            :activeLineAddr="activeLineAddr"
            :steps="steps"
            :currentActor="currentActor"
            @update:selectedExampleId="selectedExampleId = $event"
            @update:instrIndex="instrIndex = $event"
            @instrPrev="instrPrev"
            @instrNext="instrNext"
            @blockPrev="blockPrev"
            @blockNext="blockNext"
            @reset="reset"
          />
          <CallingConventionStackFrame
            :selectedExample="selectedExample"
            :blockIndex="blockIndex"
            :returnAddr="returnAddr"
            :current="current"
          />
        </div>

        <!-- RIGHT: Guide steps (compact, shrink-0) + Assembly (fills) -->
        <div class="cc-right-col">
          <div class="cc-guide-row">
            <CallingConventionGuide :blockIndex="blockIndex" />
          </div>
          <div class="cc-asm-row">
            <CallingConventionAssembly
              :blockIndex="blockIndex"
              :activeLineAddr="activeLineAddr"
              :currentActor="currentActor"
              :callerAsm="callerAsm"
              :calleeAsm="calleeAsm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>