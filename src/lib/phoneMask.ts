function nationalDigitsFromRaw(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = digits.slice(1);
  if (digits.startsWith("7")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatFromNationalDigits(digits: string): string {
  if (digits.length === 0) return "+7 ";

  let out = "+7";
  if (digits.length > 0) out += ` (${digits.slice(0, 3)}`;
  if (digits.length >= 3) out += ")";
  if (digits.length > 3) out += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) out += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) out += `-${digits.slice(8, 10)}`;
  return out;
}

export function formatRuPhoneInput(raw: string): string {
  return formatFromNationalDigits(nationalDigitsFromRaw(raw));
}

export function applyRuPhoneInputChange(prev: string, next: string): string {
  const prevD = nationalDigitsFromRaw(prev);
  let nextD = nationalDigitsFromRaw(next);
  if (next.length < prev.length && nextD.length === prevD.length && prevD.length > 0) {
    nextD = prevD.slice(0, -1);
  }
  return formatFromNationalDigits(nextD);
}

export function ruPhoneToApi(formatted: string): string {
  const digits = nationalDigitsFromRaw(formatted);
  return `+7${digits}`;
}

export function isRuPhoneComplete(formatted: string): boolean {
  return nationalDigitsFromRaw(formatted).length === 10;
}
