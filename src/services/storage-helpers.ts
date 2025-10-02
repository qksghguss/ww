class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export function getPersistentStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  const globalScope = globalThis as typeof globalThis & {
    __SUPPLY_APP_MEMORY_STORAGE__?: Storage;
  };
  if (!globalScope.__SUPPLY_APP_MEMORY_STORAGE__) {
    globalScope.__SUPPLY_APP_MEMORY_STORAGE__ = new MemoryStorage();
  }
  return globalScope.__SUPPLY_APP_MEMORY_STORAGE__;
}
