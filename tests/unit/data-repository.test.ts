import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppDataState } from '../../src/data/initial-state';
import {
  clearDataState,
  loadDataState,
  saveDataState,
  setRepository,
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
  });

  afterEach(() => {
    setRepository(null);
  });

  it('returns seeded data when repository is empty', async () => {
    const { state, source } = await loadDataState();
    expect(state.users.length).toBeGreaterThan(0);
    expect(source).toBe('local');
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
});
