<template>
  <div class="ieee-root">
    <div class="container">
      <h1>IEEE 754 Floating Point Visualizer</h1>
    
    <IeeeControls
      v-model="inputValue"
      @set-sign="setSign"
      @input="updateVisualization"
      @keypress="handleKeypress"
    />

      <IeeeVisualization :html="visualizationHtml" />
    </div>
  </div>
</template>

<style src="./style.css"></style>

<script setup>
import { useIEEE } from './App/useIEEE'
import IeeeControls from './App/IeeeControls.vue'
import IeeeVisualization from './App/IeeeVisualization.vue'

const {
  inputValue,
  visualizationHtml,
  updateVisualization,
  handleKeypress,
  handleInput,
  setSign
} = useIEEE()
</script>
