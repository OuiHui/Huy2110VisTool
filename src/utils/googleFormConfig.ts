export interface FeedbackPayload {
  category: string;
  message: string;
  targetModule?: string;
  rating?: number | null;
  name?: string;
  email?: string;
}

export interface GoogleFormConfig {
  /** The Google Form ID (e.g., 1FAIpQLSc... from https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform) */
  formId: string;
  /** Full action URL for submitting to Google Form */
  actionUrl: string;
  /** Google Form field entry mappings (e.g., 'entry.123456789') */
  entries: {
    category: string;
    message: string;
    targetModule?: string;
    rating?: string;
    name?: string;
    email?: string;
  };
}

const LOCAL_STORAGE_CONFIG_KEY = 'vistool_google_form_config';
const LOCAL_STORAGE_HISTORY_KEY = 'vistool_feedback_history';

export const defaultConfig: GoogleFormConfig = {
  formId: '',
  actionUrl: '',
  entries: {
    category: 'entry.1000001',
    message: 'entry.1000002',
    targetModule: 'entry.1000003',
    rating: 'entry.1000004',
    name: 'entry.1000005',
    email: 'entry.1000006',
  },
};

export function getStoredConfig(): GoogleFormConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read Google Form config from localStorage:', e);
  }
  return defaultConfig;
}

export function saveStoredConfig(config: Partial<GoogleFormConfig>): void {
  try {
    const current = getStoredConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Could not save Google Form config to localStorage:', e);
  }
}

export function saveFeedbackToHistory(payload: FeedbackPayload): void {
  try {
    const historyRaw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    const history: Array<FeedbackPayload & { timestamp: string }> = historyRaw ? JSON.parse(historyRaw) : [];
    history.unshift({
      ...payload,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.warn('Could not save feedback to local history:', e);
  }
}

export function getFeedbackHistory(): Array<FeedbackPayload & { timestamp: string }> {
  try {
    const historyRaw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    return historyRaw ? JSON.parse(historyRaw) : [];
  } catch (e) {
    return [];
  }
}

export async function submitFeedbackToGoogleForm(payload: FeedbackPayload): Promise<{ success: boolean; mode: 'google_form' | 'local_backup'; error?: string }> {
  saveFeedbackToHistory(payload);

  const config = getStoredConfig();
  let formUrl = config.actionUrl.trim();
  
  if (!formUrl && config.formId.trim()) {
    formUrl = `https://docs.google.com/forms/d/e/${config.formId.trim()}/formResponse`;
  }

  if (!formUrl) {
    return { success: true, mode: 'local_backup' };
  }

  try {
    const body = new URLSearchParams();
    if (config.entries.category && payload.category) {
      body.append(config.entries.category, payload.category);
    }
    if (config.entries.message && payload.message) {
      body.append(config.entries.message, payload.message);
    }
    if (config.entries.targetModule && payload.targetModule) {
      body.append(config.entries.targetModule, payload.targetModule);
    }
    if (config.entries.rating && payload.rating !== undefined && payload.rating !== null) {
      body.append(config.entries.rating, String(payload.rating));
    }
    if (config.entries.name && payload.name) {
      body.append(config.entries.name, payload.name);
    }
    if (config.entries.email && payload.email) {
      body.append(config.entries.email, payload.email);
    }

    await fetch(formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    return { success: true, mode: 'google_form' };
  } catch (err: any) {
    console.error('Error submitting feedback to Google Form:', err);
    return {
      success: true,
      mode: 'local_backup',
      error: err.message || 'Network request failed; saved to local history.',
    };
  }
}
