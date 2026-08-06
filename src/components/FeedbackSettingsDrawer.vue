<script setup lang="ts">
import type { GoogleFormConfig } from '../utils/googleFormConfig';

const props = defineProps<{
  config: GoogleFormConfig;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
}>();
</script>

<template>
  <div class="settings-drawer">
    <div class="drawer-header">
      <h3>Google Form Setup</h3>
      <p>Link your Google Form to receive feedback submissions directly.</p>
    </div>
    <div class="drawer-body">
      <div class="form-group">
        <label>Google Form ID or View URL</label>
        <input
          v-model="props.config.formId"
          type="text"
          placeholder="e.g. 1FAIpQLSc..."
          class="input-field"
        />
        <span class="field-hint">From your Google Form share/edit link.</span>
      </div>

      <div class="entries-grid">
        <h4 class="grid-title">Entry Field IDs (e.g. entry.123456789)</h4>
        <div class="grid-pair">
          <label>Category Entry ID</label>
          <input v-model="props.config.entries.category" type="text" placeholder="entry.1000001" class="input-field" />
        </div>
        <div class="grid-pair">
          <label>Feedback Message Entry ID</label>
          <input v-model="props.config.entries.message" type="text" placeholder="entry.1000002" class="input-field" />
        </div>
      </div>
    </div>
    <div class="drawer-footer">
      <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
      <button type="button" class="btn-primary" @click="emit('save')">Save Setup</button>
    </div>
  </div>
</template>
