<template>
  <div class="input-section">
    <div class="input-group">
      <div class="input-label">
        <label for="numberInput">
          {{ inputMode === 'binary' ? 'Binary Input' : 'Decimal Input' }}
          <button 
            class="help-btn" 
            @click="$emit('toggle-help')"
            type="button"
            title="Show input format help"
          >
            ?
          </button>
        </label>
        <input
          id="numberInput"
          type="text"
          :value="modelValue"
          :placeholder="inputMode === 'binary' ? 'e.g., 100.001, inf, -inf, nan' : 'e.g., -5.25, 123.456, inf, -inf, nan'"
          @input="onInput"
          @keypress="$emit('keypress', $event)"
        />
      </div>
      <div class="mode-toggle">
        <button 
          class="mode-btn" 
          :class="{ active: inputMode === 'binary' }"
          @click="$emit('set-input-mode', 'binary')"
        >
          Binary
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: inputMode === 'decimal' }"
          @click="$emit('set-input-mode', 'decimal')"
        >
          Decimal
        </button>
      </div>
      <div style="display:flex; gap:8px; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="margin:0;">Sign</label>
          <div style="display:flex; gap:4px;">
            <button type="button" class="format-btn" :class="{ active: !modelValue.startsWith('-') }" @click="$emit('set-sign','+')">+</button>
            <button type="button" class="format-btn" :class="{ active: modelValue.startsWith('-') }" @click="$emit('set-sign','-')">-</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showHelp" class="help-popup">
      <div class="help-header">
        <h4>Input Format Guide</h4>
        <button class="close-btn" @click="$emit('toggle-help')">×</button>
      </div>
      <div class="help-content">
        <div class="help-section">
          <h5>Binary Numbers</h5>
          <ul>
            <li><code>101</code> - Integer binary (5 in decimal)</li>
            <li><code>101.11</code> - Binary with fractional part (5.75 in decimal)</li>
            <li><code>1100011000000</code> - Long binary integer</li>
          </ul>
        </div>
        <div class="help-section">
          <h5>Decimal Numbers</h5>
          <ul>
            <li><code>5.25</code> - Positive decimal</li>
            <li><code>-5.25</code> - Negative decimal</li>
            <li><code>123.456</code> - Any decimal number</li>
          </ul>
        </div>
        <div class="help-section">
          <h5>Special IEEE 754 Values</h5>
          <ul>
            <li><code>inf</code> or <code>infinity</code> - Positive infinity</li>
            <li><code>-inf</code> or <code>-infinity</code> - Negative infinity</li>
            <li><code>nan</code> - Not a Number</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  inputMode: { type: String, default: 'binary' },
  showHelp: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'set-input-mode', 'set-sign', 'toggle-help', 'keypress', 'input'])

const onInput = (e) => {
  const v = e.target.value
  emit('update:modelValue', v)
  emit('input', e)
}
</script>
