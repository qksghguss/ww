import { clsx, type ClassValue } from 'clsx';
import type { Item, RequestLineItem } from '../types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | number | Date) {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(parsed);
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8;') {
  const withBom = type.includes('text/csv') ? `\uFEFF${content}` : content;
  const blob = new Blob([withBom], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getStockBreakdown(item: Item) {
  const unitsPerBox = item.unitsPerBox && item.unitsPerBox > 0 ? item.unitsPerBox : null;
  if (!unitsPerBox) {
    return {
      boxes: null as number | null,
      remainder: null as number | null,
      unitsPerBox: null as number | null,
      totalEach: item.stock
    };
  }
  const boxes = Math.floor(item.stock / unitsPerBox);
  const remainder = item.stock % unitsPerBox;
  return { boxes, remainder, unitsPerBox, totalEach: item.stock };
}

export function formatStockSummary(item: Item) {
  const breakdown = getStockBreakdown(item);
  if (!breakdown.unitsPerBox) {
    return `${breakdown.totalEach}낱개`;
  }
  const parts: string[] = [];
  parts.push(`${breakdown.boxes ?? 0}박스`);
  parts.push(`${breakdown.remainder ?? 0}낱개`);
  return `${parts.join(' ')} (총 ${breakdown.totalEach}낱개)`;
}

export function formatRequestLineSummary(line: RequestLineItem, item?: Item) {
  const unitLabel = line.unit === 'each' ? '낱개' : '박스';
  if (!item) {
    return `${line.quantity}${unitLabel}`;
  }
  if (line.unit === 'box') {
    if (item.unitsPerBox && item.unitsPerBox > 0) {
      return `${line.quantity}박스 (${line.quantity * item.unitsPerBox}낱개)`;
    }
    return `${line.quantity}박스`;
  }
  if (item.unitsPerBox && item.unitsPerBox > 0) {
    const boxes = Math.floor(line.quantity / item.unitsPerBox);
    const remainder = line.quantity % item.unitsPerBox;
    return `${boxes}박스 ${remainder}낱개 (요청단위: 낱개)`;
  }
  return `${line.quantity}${unitLabel}`;
}

export function convertRequestLineToEach(line: RequestLineItem, item?: Item) {
  if (!item) {
    return line.quantity;
  }
  if (line.unit === 'box' && item.unitsPerBox && item.unitsPerBox > 0) {
    return line.quantity * item.unitsPerBox;
  }
  return line.quantity;
}
