export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return formatDateLocal(new Date());
}

export function formatJapaneseDate(date: Date): string {
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
}

export function dateRange(startIso: string, endIso: string): string[] {
  const result: string[] = [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(formatDateLocal(d));
  }
  return result;
}
