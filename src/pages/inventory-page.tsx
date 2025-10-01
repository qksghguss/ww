import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import { useData } from '../context/data-context';
import { useAuth } from '../context/auth-context';
import { downloadFile } from '../lib/utils';
import { useDebounce } from '../hooks/use-debounce';
import type { Item } from '../types';

export function InventoryPage() {
  const { items, updateItem } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [adjustment, setAdjustment] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [items, debouncedSearch]
  );

  const lowStockItems = useMemo(() => items.filter((item) => item.stock <= item.threshold), [items]);

  const handleAdjust = () => {
    if (!selectedItem || !user) return;
    const newStock = Math.max(0, selectedItem.stock + adjustment);
    updateItem({ ...selectedItem, stock: newStock }, user.id);
    toast.success('재고 수량이 조정되었습니다.');
    setSelectedItem(null);
    setAdjustment(0);
  };

  const handleExport = () => {
    const csv = Papa.unparse(
      items.map((item) => ({
        name: item.name,
        sku: item.sku,
        stock: item.stock,
        threshold: item.threshold,
        category: item.category
      }))
    );
    downloadFile('inventory.csv', csv);
    toast.success('재고 데이터를 CSV로 내보냈습니다.');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>재고 관리</CardTitle>
          <CardDescription>품목별 재고 수량을 관리하고 임계치를 모니터링하세요.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            CSV 다운로드
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="품목명을 검색하세요"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:w-64"
          />
          <div className="flex flex-wrap items-center gap-2">
            {lowStockItems.map((item) => (
              <span key={item.id} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {item.name} 저재고 ({item.stock})
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>품목명</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>재고</TableHead>
                <TableHead>임계치</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">조정</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className={item.stock <= item.threshold ? 'bg-amber-50' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.threshold}</TableCell>
                  <TableCell>{item.unit === 'each' ? '낱개' : '박스'}</TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      open={selectedItem?.id === item.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setSelectedItem(item);
                        } else {
                          setSelectedItem(null);
                          setAdjustment(0);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          조정
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{item.name} 재고 조정</DialogTitle>
                          <DialogDescription>재고 수량을 증감하거나 직접 입력하세요.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="adjustment">조정 수량</Label>
                            <Input
                              id="adjustment"
                              type="number"
                              value={adjustment}
                              onChange={(event) => setAdjustment(Number(event.target.value))}
                            />
                          </div>
                          <div className="flex justify-between gap-2">
                            <Button type="button" variant="secondary" onClick={() => setAdjustment((value) => value + 1)}>
                              +1
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setAdjustment((value) => value - 1)}>
                              -1
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setAdjustment(0)}>
                              초기화
                            </Button>
                          </div>
                          <Button onClick={handleAdjust}>적용</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                    검색 조건에 해당하는 품목이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
