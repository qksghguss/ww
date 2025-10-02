import type { AppDataState } from '../data/initial-state';
import { createInitialDataState } from '../data/initial-state';
import { getPersistentStorage } from './storage-helpers';

const STORAGE_KEY = 'supply-admin:data';

export type SyncSource = 'remote' | 'local' | 'seed' | 'realtime';

export interface DataRepository {
  load(): Promise<AppDataState | null>;
  save(state: AppDataState): Promise<void>;
  clear(): Promise<void>;
}

class LocalStorageRepository implements DataRepository {
  private storage: Storage;

  constructor(private key: string) {
    this.storage = getPersistentStorage();
  }

  async load(): Promise<AppDataState | null> {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<AppDataState>;
      return this.hydrate(parsed);
    } catch (error) {
      console.error('로컬 데이터 파싱에 실패했습니다.', error);
      return null;
    }
  }

  async save(state: AppDataState): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }

  private hydrate(state: Partial<AppDataState> | null): AppDataState | null {
    if (!state) {
      return null;
    }
    const fallback = createInitialDataState();
    return {
      users: state.users ?? fallback.users,
      items: state.items ?? fallback.items,
      issueRequests: state.issueRequests ?? fallback.issueRequests,
      purchaseRequests: state.purchaseRequests ?? fallback.purchaseRequests,
      auditLogs: state.auditLogs ?? fallback.auditLogs,
      activities: state.activities ?? fallback.activities
    };
  }
}

class HttpRepository implements DataRepository {
  constructor(private baseUrl: string) {}

  async load(): Promise<AppDataState | null> {
    const response = await fetch(`${this.baseUrl}/app-state`, {
      headers: { Accept: 'application/json' }
    });
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`원격 데이터를 불러오지 못했습니다: ${response.status}`);
    }
    const payload = (await response.json()) as AppDataState;
    return payload;
  }

  async save(state: AppDataState): Promise<void> {
    const response = await fetch(`${this.baseUrl}/app-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) {
      throw new Error(`원격 데이터를 저장하지 못했습니다: ${response.status}`);
    }
  }

  async clear(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/app-state`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`원격 데이터를 삭제하지 못했습니다: ${response.status}`);
    }
  }
}

let customRepository: DataRepository | null = null;

export function setRepository(repository: DataRepository | null) {
  customRepository = repository;
}

function createDefaultRepository(): { primary: DataRepository; fallback: LocalStorageRepository } {
  const fallback = new LocalStorageRepository(STORAGE_KEY);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) {
    return { primary: fallback, fallback };
  }
  return { primary: new HttpRepository(baseUrl), fallback };
}

export async function loadDataState(): Promise<{ state: AppDataState; source: SyncSource }> {
  if (customRepository) {
    const state = (await customRepository.load()) ?? createInitialDataState();
    return { state, source: 'local' };
  }

  const { primary, fallback } = createDefaultRepository();
  try {
    const remote = await primary.load();
    if (remote) {
      await fallback.save(remote);
      return { state: remote, source: 'remote' };
    }
  } catch (error) {
    console.warn('원격 데이터 불러오기에 실패하여 로컬 데이터를 사용합니다.', error);
  }

  const local = await fallback.load();
  if (local) {
    return { state: local, source: 'local' };
  }

  const seeded = createInitialDataState();
  await fallback.save(seeded);
  return { state: seeded, source: 'seed' };
}

export async function saveDataState(state: AppDataState): Promise<void> {
  if (customRepository) {
    await customRepository.save(state);
    return;
  }

  const { primary, fallback } = createDefaultRepository();
  await fallback.save(state);
  try {
    if (primary !== fallback) {
      await primary.save(state);
    }
  } catch (error) {
    console.warn('원격 데이터 저장에 실패하여 로컬 데이터로 유지합니다.', error);
  }
}

export async function clearDataState(): Promise<void> {
  if (customRepository) {
    await customRepository.clear();
    return;
  }

  const { primary, fallback } = createDefaultRepository();
  await fallback.clear();
  try {
    if (primary !== fallback) {
      await primary.clear();
    }
  } catch (error) {
    console.warn('원격 데이터 삭제에 실패했습니다.', error);
  }
}
