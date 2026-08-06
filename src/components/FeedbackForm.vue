<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import {
  submitFeedbackToGoogleForm,
  getStoredConfig,
  saveStoredConfig,
} from '../utils/googleFormConfig';
import type { GoogleFormConfig, FeedbackPayload } from '../utils/googleFormConfig';
import FeedbackSettingsDrawer from './FeedbackSettingsDrawer.vue';
import FeedbackSuccessView from './FeedbackSuccessView.vue';
import './feedbackForm.css';

const isOpen = ref(false);
const showSettings = ref(false);
const isSubmitting = ref(false);
const isSubmitted = ref(false);
const submitMode = ref<'google_form' | 'local_backup'>('google_form');
const errorMessage = ref('');

const categories = [
  { id: 'General', label: 'General', icon: '💬' },
  { id: 'Bug Report', label: 'Bug Report', icon: '🐛' },
  { id: 'Feature Request', label: 'Feature Request', icon: '💡' },
  { id: 'Course Feedback', label: 'Course Feedback', icon: '🎓' },
];

const form = reactive<FeedbackPayload>({
  category: 'General',
  message: '',
});

const configState = reactive<GoogleFormConfig>({
  formId: '',
  actionUrl: '',
  entries: {
    category: '',
    message: '',
  },
});

onMounted(() => {
  const loaded = getStoredConfig();
  Object.assign(configState, loaded);
});

const isConfigured = computed(() => {
  return Boolean(configState.actionUrl.trim() || configState.formId.trim());
});

const canSubmit = computed(() => {
  return form.message.trim().length >= 3 && !isSubmitting.value;
});

function openModal() {
  isOpen.value = true;
  errorMessage.value = '';
}

defineExpose({ openModal });

function closeModal() {
  isOpen.value = false;
  showSettings.value = false;
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const res = await submitFeedbackToGoogleForm({
      category: form.category,
      message: form.message.trim(),
    });

    submitMode.value = res.mode;
    isSubmitted.value = true;
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to submit feedback.';
  } finally {
    isSubmitting.value = false;
  }
}

function resetForm() {
  form.message = '';
  form.category = 'General';
  isSubmitted.value = false;
  errorMessage.value = '';
}

function handleSaveSettings() {
  saveStoredConfig({
    formId: configState.formId.trim(),
    actionUrl: configState.actionUrl.trim(),
    entries: {
      category: configState.entries.category.trim(),
      message: configState.entries.message.trim(),
    },
  });
  showSettings.value = false;
}
</script>

<template>
  <div class="feedback-widget-root">
    <!-- Floating Trigger Button -->
    <button
      type="button"
      class="floating-feedback-trigger"
      @click="openModal"
      aria-label="Open Feedback Modal"
    >
      <span class="trigger-icon">💬</span>
      <span class="trigger-text">Feedback</span>
    </button>

    <!-- Modal Backdrop & Dialog -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="isOpen"
          class="feedback-modal-backdrop"
          @click.self="closeModal"
        >
          <div class="feedback-modal-card" role="dialog" aria-modal="true">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="header-left">
                <span class="header-badge">CS 2110 VisTool</span>
                <h3 class="modal-title">Submit Feedback</h3>
              </div>
              <div class="header-right">
                <button
                  type="button"
                  class="settings-icon-btn"
                  @click="showSettings = !showSettings"
                  title="Google Form Settings"
                  aria-label="Google Form Settings"
                >
                  ⚙️
                </button>
                <button
                  type="button"
                  class="close-modal-btn"
                  @click="closeModal"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Settings Drawer -->
            <transition name="fade">
              <FeedbackSettingsDrawer
                v-if="showSettings"
                :config="configState"
                @close="showSettings = false"
                @save="handleSaveSettings"
              />
            </transition>

            <!-- Success State -->
            <FeedbackSuccessView
              v-if="isSubmitted"
              :form="form"
              :submit-mode="submitMode"
              :is-configured="isConfigured"
              @reset="resetForm"
              @close="closeModal"
            />

            <!-- Main Form -->
            <form v-else class="modal-form-body" @submit.prevent="handleSubmit">
              <!-- Category Selector -->
              <div class="form-group">
                <label class="group-label">Category</label>
                <div class="pill-group">
                  <button
                    v-for="cat in categories"
                    :key="cat.id"
                    type="button"
                    :class="['pill-btn', { active: form.category === cat.id }]"
                    @click="form.category = cat.id"
                  >
                    <span class="pill-icon">{{ cat.icon }}</span>
                    <span>{{ cat.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Feedback Text Area -->
              <div class="form-group">
                <div class="label-row">
                  <label for="feedback-text-input" class="group-label">Your Feedback</label>
                  <span class="char-counter">{{ form.message.length }} / 1000</span>
                </div>
                <textarea
                  id="feedback-text-input"
                  v-model="form.message"
                  rows="4"
                  maxlength="1000"
                  placeholder="Tell us what's working well, bugs you found, or ideas for improvement..."
                  class="textarea-field"
                  required
                ></textarea>
              </div>

              <div v-if="errorMessage" class="error-banner">
                ⚠️ {{ errorMessage }}
              </div>

              <!-- Footer Actions -->
              <div class="modal-footer">
                <button type="button" class="btn-secondary" @click="closeModal">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="submit-btn"
                  :disabled="!canSubmit"
                >
                  <span v-if="isSubmitting" class="spinner"></span>
                  <span>{{ isSubmitting ? 'Sending...' : 'Send Feedback' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>
