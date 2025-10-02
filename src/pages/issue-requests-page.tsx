import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button, type ButtonProps } from '../components/ui/button';
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
import { downloadFile, formatDate, formatRequestLineSummary, formatStockSummary } from '../lib/utils';

const STATUS_LABEL: Record<IssueRequest['status'], string> = {
  draft: '작성중',
  submitted: '제출됨',
  approved: '승인됨',
  rejected: '반려됨',
  fulfilled: '지급완료'
};

type IssueAdminAction = {
  label: string;
  status: IssueRequest['status'];
  description: string;
  toastMessage?: string;
  variant?: ButtonProps['variant'];
};

const ADMIN_STATUS_ACTIONS: Record<IssueRequest['status'], IssueAdminAction[]> = {
  draft: [],
  submitted: [
    {
      label: '승인',
      status: 'approved',
      description: '지급 요청 승인',
      toastMessage: '요청이 승인되었습니다.',
      variant: 'secondary'
    },
    {
      label: '반려',
      status: 'rejected',
      description: '지급 요청 반려',
      toastMessage: '요청이 반려되었습니다.',
      variant: 'destructive'
    }
  ],
  approved: [
    {
      label: '지급 완료',
      status: 'fulfilled',
      description: '지급 완료 처리',
      toastMessage: '요청이 지급 완료 처리되었습니다.'
    },
    {
      label: '승인 취소',
      status: 'submitted',
      description: '지급 승인 취소',
      toastMessage: '승인이 취소되어 재검토 상태로 이동했습니다.',
      variant: 'ghost'
    },
    {
      label: '반려로 변경',
      status: 'rejected',
      description: '지급 요청 반려로 재설정',
      toastMessage: '요청이 반려 상태로 전환되었습니다.',
      variant: 'destructive'
    }
  ],
  rejected: [
    {
      label: '재검토 요청',
      status: 'submitted',
      description: '지급 요청 재검토',
      toastMessage: '요청이 재검토 상태로 이동했습니다.',
      variant: 'secondary'
    }
  ],
  fulfilled: [
    {
      label: '지급 취소',
      status: 'approved',
      description: '지급 완료 취소',
      toastMessage: '지급 완료가 취소되어 승인 상태로 돌아갔습니다.',
      variant: 'ghost'
    },
    {
      label: '재검토 전환',
      status: 'submitted',
      description: '지급 요청 재검토',
      toastMessage: '요청이 재검토 상태로 이동했습니다.',
      variant: 'secondary'
    }
  ]
};

export function IssueRequestsPage() {
  const { items, issueRequests, upsertIssueRequest, removeIssueRequest, users } = useData();
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [memo, setMemo] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<UnitType>('each');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<IssueRequest | null>(null);
  const [editLineItems, setEditLineItems] = useState<RequestLineItem[]>([]);

  const selectedProduct = useMemo(
    () => items.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  );
  const canUseBoxUnit = selectedProduct?.unitsPerBox && selectedProduct.unitsPerBox > 0;

  useEffect(() => {
    if (unit === 'box' && !canUseBoxUnit) {
      setUnit('each');
    }
  }, [unit, canUseBoxUnit]);

  const requests = useMemo(
    () =>
      user?.role === 'admin'
        ? issueRequests
        : issueRequests.filter((request) => request.requestedBy === user?.id),
    [issueRequests, user]
  );

  const handleExport = () => {
    const csv = Papa.unparse({
      fields: ['요청ID', '요청자', '상태', '요청일', '최종수정일', '요청 품목', '메모'],
      data: requests.map((request) => {
        const requester = users.find((candidate) => candidate.id === request.requestedBy);
        const itemsSummary = request.lineItems
          .map((line) => {
            const product = items.find((item) => item.id === line.itemId);
            return `${product?.name ?? '알 수 없음'} ${formatRequestLineSummary(line, product)}`;
          })
          .join(' | ');
        return [
          request.id,
          requester ? `${requester.name}(${requester.username})` : request.requestedBy,
          STATUS_LABEL[request.status],
          formatDate(request.createdAt),
          formatDate(request.updatedAt),
          itemsSummary,
          request.memo ?? ''
        ];
      })
    });
    downloadFile('issue-requests.csv', csv);
    toast.success('지급 요청 데이터를 CSV로 내보냈습니다.');
  };

  const resetForm = () => {
    setLineItems([]);
    setMemo('');
    setSelectedItemId('');
    setQuantity(1);
    setUnit('each');
    setEditingRequestId(null);
  };

  const handleAddLineItem = () => {
    if (!selectedItemId || quantity <= 0) {
      toast.error('품목과 수량을 올바르게 입력하세요.');
      return;
    }
    const product = items.find((item) => item.id === selectedItemId);
    if (!product) {
      toast.error('선택한 품목을 찾을 수 없습니다.');
      return;
    }
    if (unit === 'box' && (!product.unitsPerBox || product.unitsPerBox <= 0)) {
      toast.error('해당 품목은 박스 단위가 정의되지 않았습니다.');
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
    const existing = editingRequestId
      ? issueRequests.find((req) => req.id === editingRequestId)
      : undefined;
    const requesterId = existing?.requestedBy ?? user.id;
    const description = status === 'submitted' ? '지급 요청 제출' : '지급 요청 임시 저장';
    upsertIssueRequest(
      {
        id: editingRequestId ?? undefined,
        requestedBy: requesterId,
        status,
        lineItems,
        memo,
        createdAt: existing?.createdAt
      },
      user.id,
      description
    );
    toast.success(editingRequestId ? '요청이 업데이트되었습니다.' : '요청이 생성되었습니다.');
    resetForm();
  };

  const handleLoadRequest = (request: IssueRequest) => {
    if (user?.id !== request.requestedBy && user?.role !== 'admin') {
      toast.error('요청 내용을 불러올 권한이 없습니다.');
      return;
    }
    setLineItems(request.lineItems.map((line) => ({ ...line })));
    setMemo(request.memo ?? '');
    setSelectedItemId('');
    setQuantity(1);
    setUnit('each');
    setEditingRequestId(request.id);
    toast.info('요청 내용을 편집 폼에 불러왔습니다.');
  };

  const handleDeleteRequest = (request: IssueRequest) => {
    if (!user) return;
    if (user.role !== 'admin' && user.id !== request.requestedBy) {
      toast.error('요청을 삭제할 권한이 없습니다.');
      return;
    }
    if (user.role !== 'admin' && request.status === 'fulfilled') {
      toast.error('지급 완료된 요청은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm('선택한 지급 요청을 삭제하시겠습니까?')) return;
    removeIssueRequest(request.id, user.id);
    if (editingRequestId === request.id) {
      resetForm();
    }
    toast.success('지급 요청이 삭제되었습니다.');
  };

  const handleStatusChange = (
    request: IssueRequest,
    status: IssueRequest['status'],
    description?: string,
    toastMessage?: string
  ) => {
    if (!user) return;
    upsertIssueRequest(
      {
        ...request,
        status
      },
      user.id,
      description ?? `지급 요청 ${STATUS_LABEL[status]} 처리`
    );
    toast.success(toastMessage ?? `요청이 ${STATUS_LABEL[status]} 상태로 변경되었습니다.`);
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
        const conversionRate = product?.unitsPerBox && product.unitsPerBox > 0 ? product.unitsPerBox : 1;
        if (newUnit === 'box' && (!product?.unitsPerBox || product.unitsPerBox <= 0)) {
          toast.error('이 품목은 박스 단위가 정의되지 않았습니다.');
          return line;
        }
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
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>지급 요청</CardTitle>
            <CardDescription>필요한 소모품을 장바구니에 담아 요청하세요.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport}>
            CSV 다운로드
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingRequestId && (
            <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 md:flex-row md:items-center md:justify-between">
              <span>
                {editingRequestId} 요청을 수정 중입니다. 변경 후 임시 저장 또는 제출하세요.
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  취소
                </Button>
              </div>
            </div>
          )}
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
                <option value="box" disabled={!canUseBoxUnit}>
                  박스{selectedProduct?.unitsPerBox ? ` (박스당 ${selectedProduct.unitsPerBox}낱개)` : ''}
                </option>
              </select>
              {selectedProduct?.unitsPerBox && (
                <p className="text-xs text-slate-500">박스 1개 = {selectedProduct.unitsPerBox}낱개</p>
              )}
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
                  <TableHead>요약</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => {
                  const product = items.find((p) => p.id === item.itemId);
                  const summary = formatRequestLineSummary(item, product);
                  return (
                    <TableRow key={`${item.itemId}-${item.unit}`}>
                      <TableCell>{product?.name ?? '알 수 없음'}</TableCell>
                      <TableCell>{summary}</TableCell>
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
                          const summary = formatRequestLineSummary(item, product);
                          const remainingLabel =
                            request.status === 'fulfilled' && product
                              ? ` (남은 재고: ${formatStockSummary(product)})`
                              : '';
                          return (
                            <li key={`${item.itemId}-${item.unit}`}>
                              {product?.name ?? '알 수 없음'} - {summary}
                              {remainingLabel}
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
                            {['submitted', 'approved'].includes(request.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenConvertDialog(request)}
                              >
                                단위 변환
                              </Button>
                            )}
                            {ADMIN_STATUS_ACTIONS[request.status].map((action) => (
                              <Button
                                key={`${request.id}-${action.label}`}
                                size="sm"
                                variant={action.variant}
                                onClick={() =>
                                  handleStatusChange(
                                    request,
                                    action.status,
                                    action.description,
                                    action.toastMessage
                                  )
                                }
                              >
                                {action.label}
                              </Button>
                            ))}
                          </>
                        )}
                        {user?.id === request.requestedBy &&
                          ['draft', 'rejected'].includes(request.status) && (
                            <Button size="sm" variant="outline" onClick={() => handleLoadRequest(request)}>
                              폼 불러오기
                            </Button>
                          )}
                        {user?.id === request.requestedBy && request.status === 'draft' && (
                          <Button size="sm" onClick={() => handleStatusChange(request, 'submitted')}>
                            제출
                          </Button>
                        )}
                        {user?.id === request.requestedBy && request.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleStatusChange(
                                request,
                                'draft',
                                '지급 요청 임시 저장',
                                '요청이 임시 저장 상태로 되돌려졌습니다.'
                              )
                            }
                          >
                            수정으로 전환
                          </Button>
                        )}
                        {user?.id === request.requestedBy && request.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleStatusChange(
                                request,
                                'submitted',
                                '지급 요청 재제출',
                                '요청이 재제출되었습니다.'
                              )
                            }
                          >
                            재제출
                          </Button>
                        )}
                        {(user?.role === 'admin' ||
                          (user?.id === request.requestedBy && request.status !== 'fulfilled')) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRequest(request)}
                          >
                            삭제
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
                          <option value="box" disabled={!product?.unitsPerBox}>
                            박스{product?.unitsPerBox ? ` (박스당 ${product.unitsPerBox}낱개)` : ''}
                          </option>
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
