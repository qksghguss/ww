import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useData } from '../context/data-context';
import { useAuth } from '../context/auth-context';
import type { PurchaseRequest, RequestLineItem, UnitType } from '../types';
import { formatDate } from '../lib/utils';

const STATUS_LABEL: Record<PurchaseRequest['status'], string> = {
  draft: '작성중',
  submitted: '제출됨',
  approved: '승인됨',
  ordered: '발주완료'
};

export function PurchaseRequestsPage() {
  const { items, purchaseRequests, upsertPurchaseRequest, users } = useData();
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<RequestLineItem[]>([]);
  const [memo, setMemo] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<UnitType>('box');

  const requests = useMemo(
    () =>
      user?.role === 'admin'
        ? purchaseRequests
        : purchaseRequests.filter((request) => request.requestedBy === user?.id),
    [purchaseRequests, user]
  );

  const handleAddLineItem = () => {
    if (!selectedItemId || quantity <= 0) {
      toast.error('품목과 수량을 올바르게 입력하세요.');
      return;
    }
    setLineItems((prev) => [...prev, { itemId: selectedItemId, quantity, unit }]);
    setSelectedItemId('');
    setQuantity(1);
    setUnit('box');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
      toast.success('첨부 파일이 선택되었습니다.');
    }
  };

  const handleCreateRequest = (status: PurchaseRequest['status']) => {
    if (!user) return;
    if (lineItems.length === 0) {
      toast.error('요청 품목을 추가하세요.');
      return;
    }
    upsertPurchaseRequest(
      {
        requestedBy: user.id,
        status,
        lineItems,
        memo,
        attachmentName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      user.id,
      status === 'submitted' ? '구매 요청 제출' : '구매 요청 임시 저장'
    );
    toast.success('구매 요청이 생성되었습니다.');
    setLineItems([]);
    setMemo('');
    setAttachmentName('');
  };

  const handleStatusChange = (request: PurchaseRequest, status: PurchaseRequest['status']) => {
    if (!user) return;
    upsertPurchaseRequest(
      {
        ...request,
        status
      },
      user.id,
      `구매 요청 ${STATUS_LABEL[status]} 처리`
    );
    toast.success(`요청이 ${STATUS_LABEL[status]} 상태로 변경되었습니다.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>구매 요청</CardTitle>
          <CardDescription>재고가 부족하거나 신규 품목의 구매를 요청하세요.</CardDescription>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="memo">요청 메모</Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="세부 요청 사항을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">첨부 파일</Label>
              <Input id="attachment" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
              {attachmentName && <p className="text-xs text-slate-500">선택된 파일: {attachmentName}</p>}
            </div>
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
          <CardTitle>구매 요청 현황</CardTitle>
          <CardDescription>승인 및 발주 상태를 추적하세요.</CardDescription>
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
                  <TableHead>첨부</TableHead>
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
                    <TableCell className="text-xs text-slate-500">{request.attachmentName ?? '-'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(request.updatedAt ?? request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {user?.role === 'admin' && request.status === 'submitted' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(request, 'approved')}
                          >
                            승인
                          </Button>
                        )}
                        {user?.role === 'admin' && request.status === 'approved' && (
                          <Button size="sm" onClick={() => handleStatusChange(request, 'ordered')}>
                            발주 완료
                          </Button>
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
                    <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                      등록된 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
