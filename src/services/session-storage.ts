import { getPersistentStorage } from './storage-helpers';

const SESSION_KEY = 'supply-admin:session';

export interface SessionPayload {
  userId: string;
}

export async function loadSession(): Promise<SessionPayload | null> {
  const storage = getPersistentStorage();
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch (error) {
    console.error('세션 정보를 파싱하지 못했습니다.', error);
    await clearSession();
    return null;
  }
}

export async function saveSession(payload: SessionPayload): Promise<void> {
  const storage = getPersistentStorage();
  storage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export async function clearSession(): Promise<void> {
  const storage = getPersistentStorage();
  storage.removeItem(SESSION_KEY);
}
