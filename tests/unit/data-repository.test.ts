import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppDataState } from '../../src/data/initial-state';
import {
  clearDataState,
  loadDataState,
  saveDataState,
  setRepository,
  __resetDataRepositoryCache,
  type DataRepository
} from '../../src/services/data-repository';

class MockRepository implements DataRepository {
  constructor(private store: { state: AppDataState | null }) {}

  async load(): Promise<AppDataState | null> {
    return this.store.state;
  }

  async save(state: AppDataState): Promise<void> {
    this.store.state = state;
  }

  async clear(): Promise<void> {
    this.store.state = null;
  }
}

describe('data-repository', () => {
  const store: { state: AppDataState | null } = { state: null };

  beforeEach(() => {
    store.state = null;
    setRepository(new MockRepository(store));
    __resetDataRepositoryCache();
  });

  afterEach(() => {
    setRepository(null);
  });

  it('returns seeded data when repository is empty', async () => {
    const { state, source } = await loadDataState();
    expect(state.users.length).toBeGreaterThan(0);
    expect(source).toBe('custom');
  });

  it('persists updates through the repository', async () => {
    const { state } = await loadDataState();
    const updated: AppDataState = {
      ...state,
      users: [
        ...state.users,
        {
          id: 'test-user',
          username: 'tester',
          name: '테스터',
          password: 'secret',
          role: 'user',
          process: '품질팀'
        }
      ]
    };

    await saveDataState(updated);
    const { state: persisted } = await loadDataState();
    expect(persisted.users).toHaveLength(updated.users.length);
  });

  it('clears persisted data', async () => {
    await loadDataState();
    await clearDataState();
    expect(store.state).toBeNull();
  });

  it('keeps the latest state cached when the default repository save fails', async () => {
    setRepository(null);
    const originalFetch = global.fetch;
    const fetchMock = vi
      .fn()
      // initial GET during loadDataState -> no remote data
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({}),
        text: async () => ''
      } as Response)
      // attempt to seed remote store -> acknowledge without error
      .mockResolvedValueOnce({
        status: 204,
        ok: true,
        json: async () => ({}),
        text: async () => ''
      } as Response);

    global.fetch = fetchMock;

    try {
      const { state } = await loadDataState();
      const updated: AppDataState = { ...state, items: [] };

      fetchMock.mockRejectedValueOnce(new Error('network down'));

      await expect(saveDataState(updated)).rejects.toThrow('network down');

      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const { state: recovered, source } = await loadDataState();

      expect(source).toBe('cache');
      expect(recovered.items).toEqual(updated.items);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('throws when remote repository cannot be reached and no cache exists', async () => {
    setRepository(null);
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockRejectedValue(new Error('server offline'));
    global.fetch = fetchMock;

    await expect(loadDataState()).rejects.toThrow(/원격 저장소에 연결할 수 없습니다/);

    global.fetch = originalFetch;
  });
});
