import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { useData } from '../context/data-context';
import { useAuth } from '../context/auth-context';
import type { IssueRequest, RequestLineItem, UnitType } from '../types';
import { formatDate } from '../lib/utils';

const STATUS_LABEL: Record<IssueRequest['status'], string> = {
  draft: '작성중',
  submitted: '제출됨',
  approved: '승인됨',
  rejected: '반려됨',
  fulfilled: '지급완료'
};

export function IssueRequestsPage() {
  const { items, issueRequests, upsertIssueRequest, users } = useData();
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [memo, setMemo] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<UnitType>('each');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<IssueRequest | null>(null);
  const [editLineItems, setEditLineItems] = useState<RequestLineItem[]>([]);

  const requests = useMemo(
    () =>
      user?.role === 'admin'
        ? issueRequests
        : issueRequests.filter((request) => request.requestedBy === user?.id),
    [issueRequests, user]
  );

  const handleAddLineItem = () => {
    if (!selectedItemId || quantity <= 0) {
      toast.error('품목과 수량을 올바르게 입력하세요.');
      return;
    }
    setLineItems((prev) => {
      const existing = prev.find((item) => item.itemId === selectedItemId && item.unit === unit);
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { itemId: selectedItemId, quantity, unit }];
    });
    setSelectedItemId('');
    setQuantity(1);
    setUnit('each');
  };

  const handleCreateRequest = (status: IssueRequest['status']) => {
    if (!user) return;
    if (lineItems.length === 0) {
      toast.error('요청 품목을 추가하세요.');
      return;
    }
    const description = status === 'submitted' ? '지급 요청 제출' : '지급 요청 임시 저장';
    upsertIssueRequest(
      {
        requestedBy: user.id,
        status,
        lineItems,
        memo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      user.id,
      description
    );
    toast.success('요청이 생성되었습니다.');
    setLineItems([]);
    setMemo('');
  };

  const handleStatusChange = (request: IssueRequest, status: IssueRequest['status']) => {
    if (!user) return;
    upsertIssueRequest(
      {
        ...request,
        status
      },
      user.id,
      `지급 요청 ${STATUS_LABEL[status]} 처리`
    );
    toast.success(`요청이 ${STATUS_LABEL[status]} 상태로 변경되었습니다.`);
  };

  const handleOpenConvertDialog = (request: IssueRequest) => {
    setEditRequest(request);
    setEditLineItems(request.lineItems.map((line) => ({ ...line })));
    setEditDialogOpen(true);
  };

  const handleSaveConversions = () => {
    if (!user || !editRequest) return;
    upsertIssueRequest(
      {
        ...editRequest,
        lineItems: editLineItems
      },
      user.id,
      '지급 요청 단위 변환'
    );
    toast.success('단위 변환이 적용되었습니다.');
    setEditDialogOpen(false);
    setEditRequest(null);
  };

  const handleConversionUnitChange = (index: number, newUnit: UnitType) => {
    setEditLineItems((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const product = items.find((item) => item.id === line.itemId);
        const conversionRate = product?.unit === 'box' ? 10 : 1;
        let quantity = line.quantity;
        if (line.unit !== newUnit) {
          if (line.unit === 'box' && newUnit === 'each') {
            quantity = line.quantity * conversionRate;
          } else if (line.unit === 'each' && newUnit === 'box') {
            quantity = Math.max(1, Math.ceil(line.quantity / conversionRate));
          }
        }
        return { ...line, unit: newUnit, quantity };
      })
    );
  };

  const handleConversionQuantityChange = (index: number, value: number) => {
    setEditLineItems((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, quantity: Math.max(1, value) } : line))
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>지급 요청</CardTitle>
          <CardDescription>필요한 소모품을 장바구니에 담아 요청하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="item">품목 선택</Label>
              <select
                id="item"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
              >
                <option value="">품목을 선택하세요</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">수량</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">단위</Label>
              <select
                id="unit"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={unit}
                onChange={(event) => setUnit(event.target.value as UnitType)}
              >
                <option value="each">낱개</option>
                <option value="box">박스</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddLineItem} className="w-full">
                품목 추가
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>품목명</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>단위</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => {
                  const product = items.find((p) => p.id === item.itemId);
                  return (
                    <TableRow key={`${item.itemId}-${item.unit}`}>
                      <TableCell>{product?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit === 'each' ? '낱개' : '박스'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setLineItems((prev) =>
                              prev.filter(
                                (line) => !(line.itemId === item.itemId && line.unit === item.unit)
                              )
                            )
                          }
                        >
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lineItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                      추가된 품목이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">요청 메모</Label>
            <Textarea
              id="memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="세부 요청 사항을 입력하세요"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => handleCreateRequest('draft')}>
              임시 저장
            </Button>
            <Button onClick={() => handleCreateRequest('submitted')}>요청 제출</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요청 현황</CardTitle>
          <CardDescription>요청 상태를 확인하고 승인/지급을 처리하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>요청 ID</TableHead>
                  <TableHead>요청자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청 품목</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead>최근 업데이트</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">{request.id}</TableCell>
                    <TableCell>
                      {users.find((member) => member.id === request.requestedBy)?.name ??
                        request.requestedBy}
                    </TableCell>
                    <TableCell>{STATUS_LABEL[request.status]}</TableCell>
                    <TableCell>
                      <ul className="space-y-1 text-xs">
                        {request.lineItems.map((item) => {
                          const product = items.find((p) => p.id === item.itemId);
                          return (
                            <li key={`${item.itemId}-${item.unit}`}>
                              {product?.name} - {item.quantity}{' '}
                              {item.unit === 'each' ? '낱개' : '박스'}
                            </li>
                          );
                        })}
                      </ul>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{request.memo ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(request.updatedAt ?? request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {user?.role === 'admin' && (
                          <>
                            {request.status === 'submitted' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleStatusChange(request, 'approved')}
                                >
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStatusChange(request, 'rejected')}
                                >
                                  반려
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenConvertDialog(request)}
                                >
                                  단위 변환
                                </Button>
                              </>
                            )}
                            {request.status === 'approved' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenConvertDialog(request)}
                                >
                                  단위 변환
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(request, 'fulfilled')}
                                >
                                  지급 완료
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        {user?.id === request.requestedBy && request.status === 'draft' && (
                          <Button size="sm" onClick={() => handleStatusChange(request, 'submitted')}>
                            제출
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                      등록된 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
      </CardContent>
      </Card>
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>단위 변환</DialogTitle>
            <DialogDescription>요청 품목의 단위와 수량을 조정하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품목</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>단위</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editLineItems.map((item, index) => {
                  const product = items.find((p) => p.id === item.itemId);
                  return (
                    <TableRow key={`${item.itemId}-${index}`}>
                      <TableCell>{product?.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            handleConversionQuantityChange(index, Number(event.target.value))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                          value={item.unit}
                          onChange={(event) =>
                            handleConversionUnitChange(index, event.target.value as UnitType)
                          }
                        >
                          <option value="each">낱개</option>
                          <option value="box">박스</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveConversions}>저장</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
