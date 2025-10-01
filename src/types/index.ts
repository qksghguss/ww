export type Role = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  password: string;
  role: Role;
}

export type UnitType = 'each' | 'box';

export interface ItemOption {
  size?: string;
  color?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: UnitType;
  option?: ItemOption;
  photo?: string;
  sku: string;
  threshold: number;
  stock: number;
}

export interface RequestLineItem {
  itemId: string;
  quantity: number;
  unit: UnitType;
  note?: string;
}

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'ordered';

export interface IssueRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'fulfilled';
  lineItems: RequestLineItem[];
  memo?: string;
}

export interface PurchaseRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  requestedBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'ordered';
  lineItems: RequestLineItem[];
  memo?: string;
  attachmentName?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  target: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface ActivitySummary {
  id: string;
  type: 'issue' | 'purchase' | 'inventory' | 'user';
  description: string;
  timestamp: string;
}
