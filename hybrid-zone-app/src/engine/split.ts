// Training-split recommendation engine — ported verbatim from Onboarding.html
// lines 412-471 (STRUCTURE_TABLE / FOCUS_BUCKET / compressStructureLabel / getRecommendation).

export type FocusOption = 'only_upper' | 'mainly_upper' | 'balanced' | 'mainly_lower' | 'only_lower';
export type FocusBucket = 'upper' | 'balanced' | 'lower';
export type SplitPreset = 'full_body' | 'upper_lower' | 'ppl';

const STRUCTURE_TABLE: Record<number, Record<FocusBucket, string[]>> = {
  1: { upper: ['Full body'], balanced: ['Full body'], lower: ['Full body'] },
  2: { upper: ['Upper', 'Full body'], balanced: ['Full body', 'Full body'], lower: ['Lower', 'Full body'] },
  3: {
    upper: ['Upper', 'Lower', 'Upper'],
    balanced: ['Upper', 'Lower', 'Full body'],
    lower: ['Lower', 'Upper', 'Lower'],
  },
  4: {
    upper: ['Push', 'Pull', 'Legs', 'Upper'],
    balanced: ['Upper', 'Lower', 'Upper', 'Lower'],
    lower: ['Lower', 'Upper', 'Lower', 'Lower'],
  },
  5: {
    upper: ['Push', 'Pull', 'Legs', 'Push', 'Pull'],
    balanced: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
    lower: ['Lower', 'Push', 'Lower', 'Pull', 'Lower'],
  },
  6: {
    upper: ['Chest+Back', 'Shoulders+Arms', 'Legs', 'Chest+Back', 'Shoulders+Arms', 'Legs'],
    balanced: ['Chest+Back', 'Shoulders+Arms', 'Legs', 'Chest+Back', 'Shoulders+Arms', 'Legs'],
    lower: ['Lower', 'Push', 'Lower', 'Pull', 'Lower', 'Upper'],
  },
};

const FOCUS_BUCKET: Record<FocusOption, FocusBucket> = {
  only_upper: 'upper',
  mainly_upper: 'upper',
  balanced: 'balanced',
  mainly_lower: 'lower',
  only_lower: 'lower',
};

interface CompressedLabel {
  preset: SplitPreset | null;
  label?: string;
}

function compressStructureLabel(tokens: string[]): CompressedLabel {
  const counts: Record<string, number> = {};
  tokens.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  const uniq = Object.keys(counts);

  // clean matches to one of the 3 standard presets
  if (uniq.length === 1 && uniq[0] === 'Full body') return { preset: 'full_body' };
  if (uniq.length === 2 && counts['Upper'] && counts['Lower']) return { preset: 'upper_lower' };
  if (uniq.length === 3 && counts['Push'] && counts['Pull'] && counts['Legs']) return { preset: 'ppl' };

  // otherwise build a compressed custom label, e.g. "PPL x Upper"
  const order: string[] = [];
  tokens.forEach((t) => {
    if (!order.includes(t)) order.push(t);
  });
  const used = new Set<string>();
  const parts: string[] = [];

  if (
    counts['Chest+Back'] &&
    counts['Shoulders+Arms'] &&
    counts['Legs'] &&
    counts['Chest+Back'] === counts['Shoulders+Arms'] &&
    counts['Shoulders+Arms'] === counts['Legs']
  ) {
    parts.push('Arnold Split' + (counts['Chest+Back'] > 1 ? ' x' + counts['Chest+Back'] : ''));
    ['Chest+Back', 'Shoulders+Arms', 'Legs'].forEach((t) => used.add(t));
  }
  if (
    !used.has('Legs') &&
    counts['Push'] &&
    counts['Pull'] &&
    counts['Legs'] &&
    counts['Push'] === counts['Pull'] &&
    counts['Pull'] === counts['Legs']
  ) {
    parts.push('PPL' + (counts['Push'] > 1 ? ' x' + counts['Push'] : ''));
    ['Push', 'Pull', 'Legs'].forEach((t) => used.add(t));
  }
  if (counts['Upper'] && counts['Lower'] && counts['Upper'] === counts['Lower'] && !used.has('Upper') && !used.has('Lower')) {
    parts.push('Upper/Lower' + (counts['Upper'] > 1 ? ' x' + counts['Upper'] : ''));
    used.add('Upper');
    used.add('Lower');
  }
  order.forEach((t) => {
    if (used.has(t)) return;
    const c = counts[t];
    parts.push((c > 1 ? c + 'x ' : '') + t);
    used.add(t);
  });
  return { preset: null, label: parts.join(' x ') };
}

export interface SplitRecommendation extends CompressedLabel {
  tokens: string[];
  bucket: FocusBucket;
}

export function getRecommendation(sN: number, focus: FocusOption | null): SplitRecommendation {
  const bucket = (focus && FOCUS_BUCKET[focus]) || 'balanced';
  const days = Math.max(1, Math.min(6, sN || 1));
  const tokens = STRUCTURE_TABLE[days][bucket];
  return { ...compressStructureLabel(tokens), tokens, bucket };
}
