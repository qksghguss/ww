import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { formatISO } from 'date-fns';
import { nanoid } from '../lib/nanoid';
import type {
  ActivitySummary,
  AuditLog,
  IssueRequest,
  Item,
  PurchaseRequest,
  RequestLineItem,
  UnitType,
  User
} from '../types';
import type { AppDataState } from '../data/initial-state';
import { createInitialDataState } from '../data/initial-state';
import {
  clearDataState,
  loadDataState,
  saveDataState,
  type SyncSource
} from '../services/data-repository';

type State = AppDataState;

type Action =
  | { type: 'ADD_ITEM'; payload: { item: Item; actorId: string } }
  | { type: 'UPDATE_ITEM'; payload: { item: Item; actorId: string } }
  | { type: 'DELETE_ITEM'; payload: { id: string; actorId: string } }
  | {
      type: 'ADJUST_INVENTORY';
      payload: { itemId: string; stock: number; actorId: string; note?: string };
    }
  | {
      type: 'UPSERT_ISSUE_REQUEST';
      payload: { request: IssueRequest; actorId: string; description: string };
    }
  | {
      type: 'UPSERT_PURCHASE_REQUEST';
      payload: { request: PurchaseRequest; actorId: string; description: string };
    }
  | { type: 'UPSERT_USER'; payload: { user: User; actorId: string; description: string } }
  | { type: 'REMOVE_USER'; payload: { id: string; actorId: string } }
  | { type: 'SET_ITEMS'; payload: { items: Item[]; actorId: string } }
  | { type: 'HYDRATE'; payload: State };

const DataContext = createContext<{
  users: User[];
  items: Item[];
  issueRequests: IssueRequest[];
  purchaseRequests: PurchaseRequest[];
  auditLogs: AuditLog[];
  activities: ActivitySummary[];
  addItem: (item: Omit<Item, 'id'>, actorId: string) => void;
  updateItem: (item: Item, actorId: string) => void;
  deleteItem: (id: string, actorId: string) => void;
  adjustInventory: (itemId: string, stock: number, actorId: string, note?: string) => void;
  upsertIssueRequest: (
    request: Omit<IssueRequest, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    },
    actorId: string,
    description: string
  ) => void;
  upsertPurchaseRequest: (
    request: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    },
    actorId: string,
    description: string
  ) => void;
  upsertUser: (user: Omit<User, 'id'> & { id?: string }, actorId: string, description: string) => void;
  removeUser: (id: string, actorId: string) => void;
  importItems: (items: Item[], actorId: string) => void;
  isHydrated: boolean;
  syncInfo: {
    isSyncing: boolean;
    lastSyncedAt: string | null;
    source: SyncSource;
    error: string | null;
  };
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
} | null>(null);

const initialState: State = createInitialDataState();

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'ADD_ITEM': {
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '품목 등록',
        target: action.payload.item.name,
        timestamp: formatISO(new Date()),
        category: 'item',
        meta: { sku: action.payload.item.sku }
      };
      const activity: ActivitySummary = {
        id: nanoid(),
        type: 'inventory',
        description: `${action.payload.item.name} 품목이 추가되었습니다.`,
        timestamp: formatISO(new Date())
      };
      return {
        ...state,
        items: [...state.items, action.payload.item],
        auditLogs: [audit, ...state.auditLogs],
        activities: [activity, ...state.activities]
      };
    }
    case 'SET_ITEMS': {
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '품목 일괄 업로드',
        target: `${action.payload.items.length}건`,
        timestamp: formatISO(new Date()),
        category: 'item'
      };
      return {
        ...state,
        items: action.payload.items,
        auditLogs: [audit, ...state.auditLogs]
      };
    }
    case 'UPDATE_ITEM': {
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '품목 수정',
        target: action.payload.item.name,
        timestamp: formatISO(new Date()),
        category: 'item',
        meta: { stock: action.payload.item.stock }
      };
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.item.id ? action.payload.item : item
        ),
        auditLogs: [audit, ...state.auditLogs]
      };
    }
    case 'DELETE_ITEM': {
      const deleted = state.items.find((item) => item.id === action.payload.id);
      if (!deleted) return state;
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '품목 삭제',
        target: deleted.name,
        timestamp: formatISO(new Date()),
        category: 'item'
      };
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
        auditLogs: [audit, ...state.auditLogs]
      };
    }
    case 'ADJUST_INVENTORY': {
      const item = state.items.find((candidate) => candidate.id === action.payload.itemId);
      if (!item) return state;
      const updatedItem: Item = { ...item, stock: action.payload.stock };
      const now = formatISO(new Date());
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '재고 조정',
        target: item.name,
        timestamp: now,
        category: 'inventory',
        meta: { stock: action.payload.stock, note: action.payload.note }
      };
      const activity: ActivitySummary = {
        id: nanoid(),
        type: 'inventory',
        description: `${item.name} 재고가 ${action.payload.stock}으로 조정되었습니다.`,
        timestamp: now
      };
      return {
        ...state,
        items: state.items.map((candidate) => (candidate.id === item.id ? updatedItem : candidate)),
        auditLogs: [audit, ...state.auditLogs],
        activities: [activity, ...state.activities]
      };
    }
    case 'UPSERT_ISSUE_REQUEST': {
      const existing = state.issueRequests.find((req) => req.id === action.payload.request.id);
      const request = existing
        ? action.payload.request
        : { ...action.payload.request, id: nanoid() };
      const withTimestamps: IssueRequest = {
        ...request,
        createdAt: existing ? request.createdAt : formatISO(new Date()),
        updatedAt: formatISO(new Date())
      };
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: action.payload.description,
        target: withTimestamps.id,
        timestamp: withTimestamps.updatedAt,
        category: 'issue',
        meta: { status: withTimestamps.status }
      };
      const updatedList = existing
        ? state.issueRequests.map((req) => (req.id === withTimestamps.id ? withTimestamps : req))
        : [withTimestamps, ...state.issueRequests];
      const activity: ActivitySummary = {
        id: nanoid(),
        type: 'issue',
        description: action.payload.description,
        timestamp: withTimestamps.updatedAt
      };
      return {
        ...state,
        issueRequests: updatedList,
        auditLogs: [audit, ...state.auditLogs],
        activities: [activity, ...state.activities]
      };
    }
    case 'UPSERT_PURCHASE_REQUEST': {
      const existing = state.purchaseRequests.find((req) => req.id === action.payload.request.id);
      const request = existing
        ? action.payload.request
        : { ...action.payload.request, id: nanoid() };
      const withTimestamps: PurchaseRequest = {
        ...request,
        createdAt: existing ? request.createdAt : formatISO(new Date()),
        updatedAt: formatISO(new Date())
      };
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: action.payload.description,
        target: withTimestamps.id,
        timestamp: withTimestamps.updatedAt,
        category: 'purchase',
        meta: { status: withTimestamps.status }
      };
      const updatedList = existing
        ? state.purchaseRequests.map((req) => (req.id === withTimestamps.id ? withTimestamps : req))
        : [withTimestamps, ...state.purchaseRequests];
      const activity: ActivitySummary = {
        id: nanoid(),
        type: 'purchase',
        description: action.payload.description,
        timestamp: withTimestamps.updatedAt
      };
      return {
        ...state,
        purchaseRequests: updatedList,
        auditLogs: [audit, ...state.auditLogs],
        activities: [activity, ...state.activities]
      };
    }
    case 'UPSERT_USER': {
      const existing = state.users.find((user) => user.id === action.payload.user.id);
      const user: User = existing
        ? action.payload.user
        : { ...action.payload.user, id: nanoid() };
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: action.payload.description,
        target: user.name,
        timestamp: formatISO(new Date()),
        category: 'user',
        meta: { role: user.role }
      };
      const users = existing
        ? state.users.map((u) => (u.id === user.id ? user : u))
        : [...state.users, user];
      const activity: ActivitySummary = {
        id: nanoid(),
        type: 'user',
        description: action.payload.description,
        timestamp: formatISO(new Date())
      };
      return {
        ...state,
        users,
        auditLogs: [audit, ...state.auditLogs],
        activities: [activity, ...state.activities]
      };
    }
    case 'REMOVE_USER': {
      const user = state.users.find((u) => u.id === action.payload.id);
      if (!user) return state;
      const audit: AuditLog = {
        id: nanoid(),
        actorId: action.payload.actorId,
        action: '사용자 삭제',
        target: user.name,
        timestamp: formatISO(new Date()),
        category: 'user'
      };
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload.id),
        auditLogs: [audit, ...state.auditLogs]
      };
    }
    default:
      return state;
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<SyncSource>('seed');
  const [syncError, setSyncError] = useState<string | null>(null);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    setIsSyncing(true);
    loadDataState()
      .then(({ state: loadedState, source }) => {
        if (cancelled) return;
        skipPersistRef.current = true;
        dispatch({ type: 'HYDRATE', payload: loadedState });
        setSyncSource(source);
        setLastSyncedAt(formatISO(new Date()));
        setSyncError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('데이터 불러오기에 실패했습니다.', error);
        skipPersistRef.current = true;
        dispatch({ type: 'HYDRATE', payload: createInitialDataState() });
        setSyncSource('seed');
        setLastSyncedAt(formatISO(new Date()));
        setSyncError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (cancelled) return;
        setIsHydrated(true);
        setIsSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    let cancelled = false;
    setIsSyncing(true);
    saveDataState(state)
      .then(() => {
        if (cancelled) return;
        setLastSyncedAt(formatISO(new Date()));
        setSyncError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('데이터 저장에 실패했습니다.', error);
        setSyncError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (cancelled) return;
        setIsSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state, isHydrated]);

  const refresh = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { state: latest, source } = await loadDataState();
      skipPersistRef.current = true;
      dispatch({ type: 'HYDRATE', payload: latest });
      setSyncSource(source);
      setLastSyncedAt(formatISO(new Date()));
      setSyncError(null);
      setIsHydrated(true);
    } catch (error) {
      console.error('데이터 새로고침에 실패했습니다.', error);
      setSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch]);

  const reset = useCallback(async () => {
    const seeded = createInitialDataState();
    skipPersistRef.current = true;
    dispatch({ type: 'HYDRATE', payload: seeded });
    setSyncSource('seed');
    setIsHydrated(true);
    setIsSyncing(true);
    try {
      await clearDataState();
      await saveDataState(seeded);
      setLastSyncedAt(formatISO(new Date()));
      setSyncError(null);
    } catch (error) {
      console.error('데이터 초기화에 실패했습니다.', error);
      setSyncError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch]);

  const value = useMemo(
    () => ({
      ...state,
      addItem: (item: Omit<Item, 'id'>, actorId: string) =>
        dispatch({ type: 'ADD_ITEM', payload: { item: { ...item, id: nanoid() }, actorId } }),
      updateItem: (item: Item, actorId: string) =>
        dispatch({ type: 'UPDATE_ITEM', payload: { item, actorId } }),
      deleteItem: (id: string, actorId: string) =>
        dispatch({ type: 'DELETE_ITEM', payload: { id, actorId } }),
      adjustInventory: (itemId: string, stock: number, actorId: string, note?: string) =>
        dispatch({ type: 'ADJUST_INVENTORY', payload: { itemId, stock, actorId, note } }),
      upsertIssueRequest: (
        request: Omit<IssueRequest, 'id' | 'createdAt' | 'updatedAt'> & {
          id?: string;
          createdAt?: string;
          updatedAt?: string;
        },
        actorId: string,
        description: string
      ) =>
        dispatch({
          type: 'UPSERT_ISSUE_REQUEST',
          payload: {
            request: {
              ...request,
              id: request.id ?? nanoid(),
              createdAt: request.createdAt ?? formatISO(new Date()),
              updatedAt: formatISO(new Date())
            } as IssueRequest,
            actorId,
            description
          }
        }),
      upsertPurchaseRequest: (
        request: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'> & {
          id?: string;
          createdAt?: string;
          updatedAt?: string;
        },
        actorId: string,
        description: string
      ) =>
        dispatch({
          type: 'UPSERT_PURCHASE_REQUEST',
          payload: {
            request: {
              ...request,
              id: request.id ?? nanoid(),
              createdAt: request.createdAt ?? formatISO(new Date()),
              updatedAt: formatISO(new Date())
            } as PurchaseRequest,
            actorId,
            description
          }
        }),
      upsertUser: (user: Omit<User, 'id'> & { id?: string }, actorId: string, description: string) =>
        dispatch({
          type: 'UPSERT_USER',
          payload: {
            user: { ...user, id: user.id ?? nanoid() } as User,
            actorId,
            description
          }
        }),
      removeUser: (id: string, actorId: string) =>
        dispatch({ type: 'REMOVE_USER', payload: { id, actorId } }),
      importItems: (items: Item[], actorId: string) =>
        dispatch({ type: 'SET_ITEMS', payload: { items, actorId } }),
      isHydrated,
      syncInfo: {
        isSyncing,
        lastSyncedAt,
        source: syncSource,
        error: syncError
      },
      refresh,
      reset
    }),
    [
      state,
      isHydrated,
      isSyncing,
      lastSyncedAt,
      syncSource,
      syncError,
      refresh,
      reset
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData는 DataProvider 안에서 사용해야 합니다.');
  }
  return context;
}

export function calculateTotalQuantity(
  lineItems: RequestLineItem[],
  items: Item[],
  unit: UnitType = 'each'
) {
  return lineItems.reduce((total, line) => {
    const item = items.find((i) => i.id === line.itemId);
    if (!item) return total;
    if (unit === line.unit) {
      return total + line.quantity;
    }
    const conversion = item.unit === 'box' && unit === 'each' ? 10 : 1;
    return total + line.quantity * conversion;
  }, 0);
}
