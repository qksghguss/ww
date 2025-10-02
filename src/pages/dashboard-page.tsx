import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useData } from '../context/data-context';
import { useAuth } from '../context/auth-context';
import { formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import type { IssueRequest, PurchaseRequest, RequestLineItem } from '../types';

const COLORS = ['#2563eb', '#60a5fa', '#f97316', '#22c55e', '#8b5cf6'];

const ISSUE_STATUS_LABEL: Record<IssueRequest['status'], string> = {
  draft: '작성중',
  submitted: '제출됨',
  approved: '승인됨',
  rejected: '반려됨',
  fulfilled: '지급완료'
};

const PURCHASE_STATUS_LABEL: Record<PurchaseRequest['status'], string> = {
  draft: '작성중',
  submitted: '제출됨',
  approved: '승인됨',
  ordered: '발주완료'
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  fulfilled: 'bg-indigo-100 text-indigo-700',
  ordered: 'bg-amber-100 text-amber-700'
};

export function DashboardPage() {
  const { items, issueRequests, purchaseRequests, activities, users, auditLogs } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const topUsage = useMemo(() => {
    const usageMap = new Map<string, number>();
    issueRequests.forEach((request) => {
      request.lineItems.forEach((line) => {
        usageMap.set(line.itemId, (usageMap.get(line.itemId) ?? 0) + line.quantity);
      });
    });
    return items
      .map((item) => ({
        name: item.name,
        total: usageMap.get(item.id) ?? 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [issueRequests, items]);

  const monthlyIssue = useMemo(() => {
    const data: Record<string, number> = {};
    issueRequests.forEach((request) => {
      const month = request.createdAt.slice(0, 7);
      data[month] = (data[month] ?? 0) + request.lineItems.reduce((acc, item) => acc + item.quantity, 0);
    });
    return Object.entries(data).map(([month, total]) => ({ month, total }));
  }, [issueRequests]);

  const monthlyPurchase = useMemo(() => {
    const data: Record<string, number> = {};
    purchaseRequests.forEach((request) => {
      const month = request.createdAt.slice(0, 7);
      data[month] = (data[month] ?? 0) + request.lineItems.reduce((acc, item) => acc + item.quantity, 0);
    });
    return Object.entries(data).map(([month, total]) => ({ month, total }));
  }, [purchaseRequests]);

  const lowStock = useMemo(() => items.filter((item) => item.stock <= item.threshold), [items]);

  const userDistribution = useMemo(() => {
    const counts = issueRequests.reduce<Record<string, number>>((acc, request) => {
      acc[request.requestedBy] =
        (acc[request.requestedBy] ?? 0) + request.lineItems.reduce((sum, line) => sum + line.quantity, 0);
      return acc;
    }, {});
    return Object.entries(counts).map(([userId, value]) => ({
      name: users.find((user) => user.id === userId)?.name ?? userId,
      value
    }));
  }, [issueRequests, users]);

  const recentActivities = useMemo(
    () => activities.slice(0, 6).map((activity) => ({
      ...activity,
      date: formatDate(activity.timestamp)
    })),
    [activities]
  );

  const inventoryMovements = useMemo(() => {
    return auditLogs
      .filter((log) => log.category === 'inventory')
      .map((log) => {
        const delta = Number(log.meta?.delta ?? 0);
        return {
          id: log.id,
          item: log.target,
          delta,
          note: typeof log.meta?.note === 'string' ? (log.meta?.note as string) : undefined,
          timestamp: log.timestamp
        };
      })
      .slice(0, 10);
  }, [auditLogs]);

  const myIssueRequests = useMemo(() => {
    if (!user) return [];
    return issueRequests
      .filter((request) => request.requestedBy === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);
  }, [issueRequests, user]);

  const myPurchaseRequests = useMemo(() => {
    if (!user) return [];
    return purchaseRequests
      .filter((request) => request.requestedBy === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);
  }, [purchaseRequests, user]);

  const resolveRequestTitle = useCallback(
    (lineItems: RequestLineItem[]) => {
      if (lineItems.length === 0) return '요청 상세 없음';
      const first = lineItems[0];
      const item = items.find((candidate) => candidate.id === first.itemId);
      const extra = lineItems.length - 1;
      return `${item?.name ?? '소모품'}${extra > 0 ? ` 외 ${extra}건` : ''}`;
    },
    [items]
  );

  if (!loading && user?.role === 'user') {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>재고 입출 현황</CardTitle>
            <CardDescription>최근 재고가 입고되거나 출고된 내역입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {inventoryMovements.length === 0 && (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  표시할 재고 입출 내역이 없습니다.
                </li>
              )}
              {inventoryMovements.map((movement) => {
                const deltaClass =
                  movement.delta > 0
                    ? 'text-emerald-600'
                    : movement.delta < 0
                    ? 'text-rose-600'
                    : 'text-slate-600';
                const deltaLabel =
                  movement.delta > 0
                    ? `+${movement.delta}`
                    : movement.delta < 0
                    ? `${movement.delta}`
                    : movement.note ?? '변동 없음';
                return (
                  <li
                    key={movement.id}
                    className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{movement.item}</p>
                      <p className="text-xs text-slate-500">{formatDate(movement.timestamp)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${deltaClass}`}>{deltaLabel}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내 지급 요청 상태</CardTitle>
            <CardDescription>제출한 지급 요청의 최신 상태를 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요청 내용</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>업데이트</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myIssueRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm text-slate-700">{resolveRequestTitle(request.lineItems)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_STYLE[request.status]
                        }`}
                      >
                        {ISSUE_STATUS_LABEL[request.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(request.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {myIssueRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                      제출한 지급 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내 구매 요청 상태</CardTitle>
            <CardDescription>제출한 구매 요청의 진행 상황입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요청 내용</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>업데이트</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPurchaseRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm text-slate-700">{resolveRequestTitle(request.lineItems)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_STYLE[request.status]
                        }`}
                      >
                        {PURCHASE_STATUS_LABEL[request.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(request.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {myPurchaseRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-slate-500">
                      제출한 구매 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className={index === 0 ? 'lg:col-span-2' : ''}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>월별 지급/구매 추세</CardTitle>
          <CardDescription>최근 요청 데이터를 기반으로 지급 및 구매 추세를 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyIssue.map((issue) => ({
                month: issue.month,
                지급: issue.total,
                구매: monthlyPurchase.find((purchase) => purchase.month === issue.month)?.total ?? 0
              }))}
            >
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="지급" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="구매" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용자별 요청 비중</CardTitle>
          <CardDescription>누가 가장 많이 요청했는지 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={userDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={80}
              >
                {userDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>품목별 사용량 TOP5</CardTitle>
          <CardDescription>최근 지급 요청 기준 상위 5개 품목입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsage.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{item.name}</span>
                <span className="text-sm font-semibold text-slate-900">{item.total}</span>
              </div>
            ))}
            {topUsage.length === 0 && <p className="text-sm text-slate-500">사용 내역이 없습니다.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>저재고 품목</CardTitle>
          <CardDescription>임계치 이하로 떨어진 품목을 확인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lowStock.map((item) => (
            <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">{item.name}</p>
              <p className="text-xs text-amber-700">재고 {item.stock} / 임계치 {item.threshold}</p>
            </div>
          ))}
          {lowStock.length === 0 && <p className="text-sm text-slate-500">모든 품목이 안전 재고를 유지 중입니다.</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>{user?.name}님이 확인해야 할 최신 로그입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-700">{activity.description}</span>
                <span className="text-xs text-slate-500">{activity.date}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
