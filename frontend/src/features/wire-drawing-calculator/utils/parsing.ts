export function parseInput(text: string): number[] {
  if (!text.trim()) return [];

  const cleaned = text
    .replace(/[""]/g, '')
    .replace(/[""]/g, '')
    .replace(/\t/g, ' ')
    .replace(/[,;|]/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim();

  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);

  const numbers: number[] = [];
  for (const token of tokens) {
    const num = parseFloat(token);
    if (!isNaN(num) && num > 0) {
      numbers.push(Math.round(num * 1000) / 1000);
    }
  }

  return numbers;
}

export function formatNumber(n: number, decimals: number = 3): string {
  return n.toFixed(decimals);
}
