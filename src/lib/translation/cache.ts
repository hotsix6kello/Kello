interface CacheEntry<TValue> {
  expiresAt: number;
  value: TValue;
}

export class MemoryTtlCache<TValue> {
  private readonly store = new Map<string, CacheEntry<TValue>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  get(key: string) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: TValue) {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value,
    });
  }

  clear() {
    this.store.clear();
  }
}
