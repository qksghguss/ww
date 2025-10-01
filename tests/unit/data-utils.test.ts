import { describe, it, expect } from 'vitest';
import { calculateTotalQuantity } from '../../src/context/data-context';
import type { Item, RequestLineItem } from '../../src/types';

describe('calculateTotalQuantity', () => {
  const items: Item[] = [
    {
      id: 'item-1',
      name: '테스트 품목',
      description: '',
      category: '테스트',
      unit: 'box',
      sku: 'SKU-001',
      threshold: 0,
      stock: 0
    }
  ];

  const lineItems: RequestLineItem[] = [{ itemId: 'item-1', quantity: 2, unit: 'box' }];

  it('converts quantity to each when unit differs', () => {
    const total = calculateTotalQuantity(lineItems, items, 'each');
    expect(total).toBe(20);
  });
});
