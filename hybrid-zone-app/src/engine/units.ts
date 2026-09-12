// Units system — pure port of nocturne-fitness-app.html's UNITS helpers.
// All underlying data (session weights, run distances, etc.) is stored in
// metric internally (kg, km) — these are display-time-only conversions, so
// stored data, comparisons, and formulas never need to care which unit
// system the viewer picked.

export type UnitSystem = 'metric' | 'imperial';

export function fmtDistance(km: number, unitSystem: UnitSystem, decimals = 1): string {
  if (unitSystem === 'imperial') return `${(km * 0.621371).toFixed(decimals)} mi`;
  return `${km.toFixed(decimals)} km`;
}

export function distanceUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'mi' : 'km';
}

export function distanceValueOnly(km: number, unitSystem: UnitSystem, decimals = 1): string {
  return unitSystem === 'imperial' ? (km * 0.621371).toFixed(decimals) : km.toFixed(decimals);
}

export function fmtWeight(kg: number, unitSystem: UnitSystem, decimals = 0): string {
  if (unitSystem === 'imperial') return `${(kg * 2.20462).toFixed(decimals)} lb`;
  return `${kg.toFixed(decimals)} kg`;
}

export function weightUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'lb' : 'kg';
}

export function weightValueOnly(kg: number, unitSystem: UnitSystem, decimals = 0): string {
  return unitSystem === 'imperial' ? (kg * 2.20462).toFixed(decimals) : kg.toFixed(decimals);
}

// secPerKm is always the underlying metric pace; converts + formats as `M'SS"`.
export function fmtPaceFromSecPerKm(secPerKm: number, unitSystem: UnitSystem): string {
  const secPerUnit = unitSystem === 'imperial' ? secPerKm * 1.60934 : secPerKm;
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

// Converts a value the user typed in the *current display unit* back to the
// canonical metric value stores expect — the inverse of weightValueOnly/
// distanceValueOnly, used when persisting a manually-entered weight/distance.
export function weightToKg(value: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? value / 2.20462 : value;
}

export function distanceToKm(value: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? value / 0.621371 : value;
}

// Wraps a metric tile's static {value, unit} with unit conversion for the
// km/kg/kg-per-month cases (including the "8.2k" thousands-suffix case used
// by Volume) — every other unit (min, %, days, etc.) passes through
// unchanged. Mirrors the source's getMetricDisplayValue(m).
export function metricDisplayValue(rawValue: string | null, unit: string, unitSystem: UnitSystem): { value: string | null; unit: string } {
  if (rawValue === null) return { value: null, unit };
  if (unit === 'km') {
    return { value: distanceValueOnly(parseFloat(rawValue), unitSystem), unit: distanceUnitLabel(unitSystem) };
  }
  if (unit === 'kg' || unit === 'kg/mo') {
    const isThousands = /k$/i.test(rawValue);
    const numKg = parseFloat(rawValue) * (isThousands ? 1000 : 1);
    const numOut = unitSystem === 'imperial' ? numKg * 2.20462 : numKg;
    const outUnit = unit === 'kg/mo' ? `${weightUnitLabel(unitSystem)}/mo` : weightUnitLabel(unitSystem);
    if (isThousands) return { value: `${(numOut / 1000).toFixed(1)}k`, unit: outUnit };
    const sign = numOut > 0 ? '+' : '';
    return { value: `${sign}${Math.round(numOut)}`, unit: outUnit };
  }
  return { value: rawValue, unit };
}

// The weight stepper's increment: 2.5kg, or 5lb when in imperial (matches
// the source's incWeight/decWeight — a "nice" step in whichever unit is
// currently shown, not a fixed metric amount converted awkwardly).
export function weightStepFor(unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? 5 : 2.5;
}
