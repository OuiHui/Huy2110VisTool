<template>
  <div class="input-section">
    <div class="input-group">
      <div class="input-label">
        <label for="numberInput">
          Binary Input
          <div class="bias-info-container">
            <button 
              class="help-btn bias-info-btn" 
              type="button"
            >
              ?
            </button>
            <div class="bias-popup">
              <div class="help-section">
                <h5>Binary Numbers</h5>
                <ul>
                  <li><code>101</code> - Integer binary (5 in decimal)</li>
                  <li><code>101.11</code> - Binary with fractional part (5.75 in decimal)</li>
                  <li><code>1100011000000</code> - Long binary integer</li>
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
        </label>
        <input
          id="numberInput"
          type="text"
          :value="modelValue"
          placeholder="e.g., 100.001, inf, -inf, nan"
          @input="onInput"
          @keypress="$emit('keypress', $event)"
        />
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
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'set-sign', 'keypress', 'input'])

const onInput = (e) => {
  const v = e.target.value
  emit('update:modelValue', v)
  emit('input', e)
}
</script>

