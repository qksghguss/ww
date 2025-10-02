import type { AppDataState } from '../data/initial-state';
import { createInitialDataState } from '../data/initial-state';

export type SyncSource = 'remote' | 'seed' | 'realtime' | 'cache' | 'custom';

export interface DataRepository {
  load(): Promise<AppDataState | null>;
  save(state: AppDataState): Promise<void>;
  clear(): Promise<void>;
}

class HttpRepository implements DataRepository {
  constructor(private baseUrl: string) {}

  async load(): Promise<AppDataState | null> {
    const response = await fetch(`${this.baseUrl}/app-state`, {
      headers: { Accept: 'application/json' }
    });
    if (response.status === 204 || response.status === 404) {
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
let cachedState: AppDataState | null = null;

export function setRepository(repository: DataRepository | null) {
  customRepository = repository;
}

function resolveBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api';
}

function createDefaultRepository(): DataRepository {
  return new HttpRepository(resolveBaseUrl());
}

export async function loadDataState(): Promise<{ state: AppDataState; source: SyncSource }> {
  if (customRepository) {
    const state = (await customRepository.load()) ?? createInitialDataState();
    cachedState = state;
    return { state, source: 'custom' };
  }

  const repository = createDefaultRepository();
  try {
    const remote = await repository.load();
    if (remote) {
      cachedState = remote;
      return { state: remote, source: 'remote' };
    }
  } catch (error) {
    console.warn('원격 데이터 불러오기에 실패했습니다.', error);
    if (cachedState) {
      return { state: cachedState, source: 'cache' };
    }
  }

  const seeded = createInitialDataState();
  cachedState = seeded;
  try {
    await repository.save(seeded);
  } catch (error) {
    console.warn('초기 데이터를 원격 저장소에 저장하지 못했습니다.', error);
  }
  return { state: seeded, source: 'seed' };
}

export async function saveDataState(state: AppDataState): Promise<void> {
  // 항상 최신 상태를 캐시에 기록하여 원격 저장 실패 시에도
  // 수동 새로고침이나 다른 탭 동기화 과정에서 최신 상태가 보존되도록 한다.
  cachedState = state;
  if (customRepository) {
    await customRepository.save(state);
    return;
  }

  const repository = createDefaultRepository();
  await repository.save(state);
}

export async function clearDataState(): Promise<void> {
  if (customRepository) {
    await customRepository.clear();
    cachedState = null;
    return;
  }

  const repository = createDefaultRepository();
  await repository.clear();
  cachedState = null;
}
