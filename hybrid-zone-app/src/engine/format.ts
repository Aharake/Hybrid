// Pure formatting helpers — ported verbatim from Tracker.html (fmtWeight line 763,
// nowTime line 764, parseDurationToSeconds line 834, fmtDuration line 851, fmtPace line 856).

export function fmtWeight(w: number): string {
  return w % 1 === 0 ? String(w) : String(w).replace('.', ',');
}

export function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export function parseDurationToSeconds(str: string): number {
  if (!str) return 0;
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }
  let h = 0;
  let m = 0;
  const hMatch = str.match(/(\d+)\s*h/);
  if (hMatch) h = parseInt(hMatch[1], 10);
  const mMatch = str.match(/(\d+)\s*m/);
  if (mMatch) m = parseInt(mMatch[1], 10);
  return h * 3600 + m * 60;
}

export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function fmtPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return `--'--"`;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}
