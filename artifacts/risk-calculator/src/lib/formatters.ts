export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  } else if (Math.abs(value) >= 1000) {
    return `₹${(value / 1000).toFixed(2)}K`;
  }
  return `₹${value.toFixed(2)}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export function handleWheel(e: React.WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}
