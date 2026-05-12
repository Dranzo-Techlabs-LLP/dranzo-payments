export function fmtMoney(minor: number | string, currency = 'INR'): string {
  const n = typeof minor === 'string' ? parseInt(minor, 10) : minor;
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${(n / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function toMinor(rupees: number | string): number {
  const n = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  return Math.round(n * 100);
}
