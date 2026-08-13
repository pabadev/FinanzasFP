const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  MXN: "$",
  COP: "$",
  ARS: "$",
  GTQ: "Q",
};

export function formatMoney(cents: number, currency = "USD"): string {
  const value = (cents / 100).toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${value}`;
}
