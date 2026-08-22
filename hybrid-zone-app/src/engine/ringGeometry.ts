// Ring-cluster geometry — pure port of rcPolar/rcArcPath/rcCenterRing/rcCurvedLine.
// Returns geometry data (path strings, viewBox) rather than SVG markup, since RN
// renders these through react-native-svg <Path>/<Circle> components, not raw HTML.

interface Point {
  x: number;
  y: number;
}

function rcPolar(cx: number, cy: number, r: number, angleDeg: number): Point {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function rcArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = rcPolar(cx, cy, r, startDeg);
  const end = rcPolar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export interface CenterRingGeometry {
  radius: number;
  cx: number;
  cy: number;
  strokeWidth: number;
  circumference: number;
  dashoffset: number;
}

export function rcCenterRing(pct: number, size: number): CenterRingGeometry {
  const fillPct = Math.min(1, Math.max(0, pct)); // clamp visual fill; caller may pass >1 (e.g. volume trend above 100%)
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const sw = 9;
  const c = 2 * Math.PI * r;
  return { radius: r, cx, cy, strokeWidth: sw, circumference: c, dashoffset: c * (1 - fillPct) };
}

export interface CurvedLineGeometry {
  trackPath: string;
  progPath: string;
  strokeWidth: number;
  viewBox: { x: number; y: number; w: number; h: number };
}

// Short curved-line side accent (~110deg arc), tightly cropped to its own bounding box.
export function rcCurvedLine(pct: number, diameter: number, side: 'left' | 'right'): CurvedLineGeometry {
  const fillPct = Math.min(1, Math.max(0, pct)); // clamp visual fill; caller may pass >1
  const r = diameter / 2 - 5;
  const cx = diameter / 2;
  const cy = diameter / 2;
  const sw = 7;
  const halfSpan = 55;
  const centerDeg = side === 'left' ? 180 : 0;
  const start = centerDeg - halfSpan;
  const end = centerDeg + halfSpan;
  const trackPath = rcArcPath(cx, cy, r, start, end);
  const progEnd = start + (end - start) * fillPct;
  const progPath = rcArcPath(cx, cy, r, start, progEnd);
  const p0 = rcPolar(cx, cy, r, start);
  const p1 = rcPolar(cx, cy, r, end);
  const xInner = side === 'left' ? Math.max(p0.x, p1.x) : Math.min(p0.x, p1.x);
  const xOuter = side === 'left' ? cx - r : cx + r;
  const yTop = Math.min(p0.y, p1.y);
  const yBot = Math.max(p0.y, p1.y);
  const pad = sw / 2 + 1;
  const vbX = side === 'left' ? xOuter - pad : xInner - pad;
  const vbW = Math.abs(xInner - xOuter) + pad * 2;
  const vbY = yTop - pad;
  const vbH = yBot - yTop + pad * 2;
  return { trackPath, progPath, strokeWidth: sw, viewBox: { x: vbX, y: vbY, w: vbW, h: vbH } };
}
