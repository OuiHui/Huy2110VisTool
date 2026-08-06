<script setup lang="ts">
import type { FeedbackPayload } from '../utils/googleFormConfig';

defineProps<{
  form: FeedbackPayload;
  submitMode: 'google_form' | 'local_backup';
  isConfigured: boolean;
}>();

const emit = defineEmits<{
  (e: 'reset'): void;
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="success-container">
    <div class="success-icon">🎉</div>
    <h3 class="success-title">Thank You for Your Feedback!</h3>
    <p class="success-text">
      <template v-if="submitMode === 'google_form'">
        Your feedback has been successfully submitted to Google Forms.
      </template>
      <template v-else>
        Your feedback has been saved!
        <span v-if="!isConfigured" class="notice-badge">
          (Saved locally. Google Form URL can be linked in the Setup gear menu).
        </span>
      </template>
    </p>

    <div class="summary-box">
      <div class="summary-item"><strong>Category:</strong> {{ form.category }}</div>
      <div class="summary-item"><strong>Feedback:</strong> {{ form.message }}</div>
    </div>

    <div class="success-actions">
      <button type="button" class="btn-secondary" @click="emit('reset')">
        Submit Another
      </button>
      <button type="button" class="btn-primary" @click="emit('close')">
        Done
      </button>
    </div>
  </div>
</template>
