import { apiFetchJson } from './client';
import type { OnboardingFields } from '@/store/onboardingStore';

// Maps the onboarding quiz's local shape onto the API's flatter one — the
// 'custom' split value on its own is meaningless server-side, so the typed
// label is sent as the split string instead of being dropped.
export async function syncOnboardingAnswers(fields: OnboardingFields): Promise<void> {
  await apiFetchJson('/api/onboarding-answers', {
    method: 'PUT',
    body: JSON.stringify({
      strengthExp: fields.strengthExp,
      runningExp: fields.includeRunning ? fields.runningExp : null,
      strengthGoal: fields.strengthGoal,
      equipment: fields.equipment,
      focus: fields.focus,
      split: fields.split === 'custom' ? fields.customSplitLabel : fields.split,
      runningGoal: fields.includeRunning ? fields.runningGoal : null,
      includeRunning: fields.includeRunning,
      schedule: fields.schedule,
      planTier: fields.planTier,
    }),
  });
}
