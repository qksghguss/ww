import { formatISO, subDays } from 'date-fns';
import type {
  ActivitySummary,
  AuditLog,
  IssueRequest,
  Item,
  PurchaseRequest,
  User
} from '../types';

export interface AppDataState {
  users: User[];
  items: Item[];
  issueRequests: IssueRequest[];
  purchaseRequests: PurchaseRequest[];
  auditLogs: AuditLog[];
  activities: ActivitySummary[];
}

export function createInitialDataState(): AppDataState {
  return {
    users: [
      {
        id: 'admin-1',
        username: 'admin',
        name: '시스템 관리자',
        password: 'admin1234',
        role: 'admin'
      },
      {
        id: 'user-1',
        username: 'jdoe',
        name: 'John Doe',
        password: 'password1',
        role: 'user'
      }
    ],
    items: [
      {
        id: 'item-1',
        name: 'A4 복사용지',
        description: 'A4 사이즈 복사용지 80g',
        category: '문구',
        unit: 'box',
        option: { size: 'A4', color: 'White' },
        photo: '',
        sku: 'ST-001',
        threshold: 5,
        stock: 12
      },
      {
        id: 'item-2',
        name: '볼펜',
        description: '0.5mm 검은색 볼펜',
        category: '문구',
        unit: 'each',
        option: { color: 'Black' },
        photo: '',
        sku: 'ST-002',
        threshold: 20,
        stock: 50
      }
    ],
    issueRequests: [
      {
        id: 'issue-1',
        createdAt: formatISO(subDays(new Date(), 5)),
        updatedAt: formatISO(subDays(new Date(), 3)),
        requestedBy: 'user-1',
        status: 'approved',
        lineItems: [
          { itemId: 'item-1', quantity: 1, unit: 'box' },
          { itemId: 'item-2', quantity: 10, unit: 'each' }
        ],
        memo: '회의실 비치용'
      }
    ],
    purchaseRequests: [
      {
        id: 'purchase-1',
        createdAt: formatISO(subDays(new Date(), 10)),
        updatedAt: formatISO(subDays(new Date(), 2)),
        requestedBy: 'user-1',
        status: 'ordered',
        lineItems: [{ itemId: 'item-1', quantity: 20, unit: 'box' }],
        memo: '분기 재고 확보',
        attachmentName: 'quote.xlsx'
      }
    ],
    auditLogs: [
      {
        id: 'log-1',
        actorId: 'admin-1',
        action: '시스템 초기화',
        target: '시스템',
        timestamp: formatISO(subDays(new Date(), 15)),
        category: 'system',
        meta: {}
      }
    ],
    activities: [
      {
        id: 'act-1',
        type: 'issue',
        description: 'John Doe님이 소모품 지급 요청을 제출했습니다.',
        timestamp: formatISO(subDays(new Date(), 3))
      }
    ]
  };
}
