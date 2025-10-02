import { nanoid } from '../lib/nanoid';

type SyncMessage = {
  type: 'state-updated';
  at: string;
  originId: string;
};

type SyncHandler = (message: SyncMessage) => void;

const CHANNEL_NAME = 'supply-admin:sync-channel';
const STORAGE_EVENT_KEY = `${CHANNEL_NAME}:storage`;

const instanceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : nanoid();

export function createSyncChannel(onMessage: SyncHandler) {
  if (typeof window === 'undefined') {
    return {
      notify: () => undefined,
      dispose: () => undefined
    };
  }

  const w = window as Window & typeof globalThis;

  if (typeof w.BroadcastChannel === 'function') {
    const channel = new w.BroadcastChannel(CHANNEL_NAME);
    const listener = (event: MessageEvent<SyncMessage>) => {
      if (!event.data || event.data.originId === instanceId) return;
      onMessage(event.data);
    };
    channel.addEventListener('message', listener);
    return {
      notify: (message: Omit<SyncMessage, 'originId'>) => {
        channel.postMessage({ ...message, originId: instanceId });
      },
      dispose: () => {
        channel.removeEventListener('message', listener);
        channel.close();
      }
    };
  }

  const storageListener = (event: StorageEvent) => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as SyncMessage;
      if (payload.originId === instanceId) return;
      onMessage(payload);
    } catch (error) {
      console.warn('실시간 동기화 메시지를 읽지 못했습니다.', error);
    }
  };

  w.addEventListener('storage', storageListener);

  return {
    notify: (message: Omit<SyncMessage, 'originId'>) => {
      const payload: SyncMessage = { ...message, originId: instanceId };
      try {
        w.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(payload));
        w.localStorage.removeItem(STORAGE_EVENT_KEY);
      } catch (error) {
        console.warn('실시간 동기화 알림 전송에 실패했습니다.', error);
      }
    },
    dispose: () => {
      w.removeEventListener('storage', storageListener);
    }
  };
}
