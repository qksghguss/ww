import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { useData } from '../context/data-context';
import { useAuth } from '../context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import type { Item, UnitType } from '../types';
import { downloadFile, formatStockSummary, getStockBreakdown } from '../lib/utils';
import { nanoid } from '../lib/nanoid';
import { useDebounce } from '../hooks/use-debounce';

interface ItemFormState {
  id?: string;
  name: string;
  description: string;
  category: string;
  unit: UnitType;
  unitsPerBox: number;
  optionSize: string;
  optionColor: string;
  photo: string;
  sku: string;
  threshold: number;
  thresholdBoxes: number;
  thresholdRemainder: number;
  stock: number;
  stockBoxes: number;
  stockRemainder: number;
}

interface ItemCsvRow {
  id?: string;
  name: string;
  description?: string;
  category: string;
  unit?: string;
  unitsPerBox?: string | number;
  stockBoxes?: string | number;
  stockRemainder?: string | number;
  stockEachTotal?: string | number;
  optionSize?: string;
  optionColor?: string;
  sku: string;
  threshold?: string | number;
  thresholdBoxes?: string | number;
  thresholdRemainder?: string | number;
}

const ITEM_UNIT_LABEL: Record<UnitType, string> = {
  each: '낱개',
  box: '박스'
};

const ITEM_UNIT_FROM_LABEL: Record<string, UnitType> = {
  낱개: 'each',
  박스: 'box',
  each: 'each',
  box: 'box'
};

const ITEM_HEADER_MAP: Record<string, keyof ItemCsvRow> = {
  품목ID: 'id',
  품목명: 'name',
  설명: 'description',
  카테고리: 'category',
  '기본단위(낱개/박스)': 'unit',
  '박스당_수량': 'unitsPerBox',
  '재고(박스)': 'stockBoxes',
  '재고(낱개)': 'stockRemainder',
  '총재고(낱개)': 'stockEachTotal',
  '옵션-사이즈': 'optionSize',
  '옵션-색상': 'optionColor',
  SKU: 'sku',
  '임계치(박스)': 'thresholdBoxes',
  '임계치(낱개)': 'thresholdRemainder',
  '임계치(총낱개)': 'threshold'
};

const initialFormState: ItemFormState = {
  name: '',
  description: '',
  category: '',
  unit: 'each',
  unitsPerBox: 1,
  optionSize: '',
  optionColor: '',
  photo: '',
  sku: '',
  threshold: 0,
  thresholdBoxes: 0,
  thresholdRemainder: 0,
  stock: 0,
  stockBoxes: 0,
  stockRemainder: 0
};

export function ItemsPage() {
  const { items, addItem, updateItem, deleteItem, importItems } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<ItemFormState>(initialFormState);
  const debouncedSearch = useDebounce(search, 300);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
      return matchesSearch && matchesCategory;
    });
  }, [items, debouncedSearch, categoryFilter]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).filter(Boolean),
    [items]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.name || !formState.category || !formState.sku) {
      toast.error('필수 항목을 모두 입력하세요.');
      return;
    }

    const unit = formState.unit;
    let unitsPerBox: number | undefined;
    let stockValue = 0;
    let thresholdValue = 0;

    if (unit === 'box') {
      if (!formState.unitsPerBox || formState.unitsPerBox <= 0) {
        toast.error('박스당 낱개 수량을 입력하세요.');
        return;
      }
      unitsPerBox = Math.floor(formState.unitsPerBox);
      const boxes = Math.max(0, Math.floor(formState.stockBoxes));
      const remainder = Math.max(0, Math.floor(formState.stockRemainder));
      if (remainder >= unitsPerBox) {
        toast.error('재고 낱개 수량은 박스당 수량보다 작아야 합니다.');
        return;
      }
      const thresholdBoxes = Math.max(0, Math.floor(formState.thresholdBoxes));
      const thresholdRemainder = Math.max(0, Math.floor(formState.thresholdRemainder));
      if (thresholdRemainder >= unitsPerBox) {
        toast.error('임계치 낱개 수량은 박스당 수량보다 작아야 합니다.');
        return;
      }
      stockValue = boxes * unitsPerBox + remainder;
      thresholdValue = thresholdBoxes * unitsPerBox + thresholdRemainder;
    } else {
      stockValue = Math.max(0, Number(formState.stock));
      thresholdValue = Math.max(0, Number(formState.threshold));
    }

    const payload: Item = {
      id: formState.id ?? '',
      name: formState.name,
      description: formState.description,
      category: formState.category,
      unit,
      unitsPerBox,
      option: {
        size: formState.optionSize || undefined,
        color: formState.optionColor || undefined
      },
      photo: formState.photo || undefined,
      sku: formState.sku,
      threshold: thresholdValue,
      stock: stockValue
    };

    try {
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }
      if (formState.id) {
        updateItem(payload, user.id);
        toast.success('품목이 수정되었습니다.');
      } else {
        const { id: _id, ...rest } = payload;
        addItem(rest, user.id);
        toast.success('품목이 추가되었습니다.');
      }
      setDialogOpen(false);
      setFormState(initialFormState);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.');
    }
  };

  const handleEdit = (item: Item) => {
    const breakdown = getStockBreakdown(item);
    const thresholdBoxes = item.unitsPerBox ? Math.floor(item.threshold / item.unitsPerBox) : 0;
    const thresholdRemainder = item.unitsPerBox ? item.threshold % item.unitsPerBox : 0;
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      unitsPerBox: item.unitsPerBox ?? 1,
      optionSize: item.option?.size ?? '',
      optionColor: item.option?.color ?? '',
      photo: item.photo ?? '',
      sku: item.sku,
      threshold: item.unit === 'each' ? item.threshold : 0,
      thresholdBoxes: thresholdBoxes,
      thresholdRemainder: thresholdRemainder,
      stock: item.unit === 'each' ? item.stock : 0,
      stockBoxes: breakdown.boxes ?? 0,
      stockRemainder: breakdown.remainder ?? 0
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    deleteItem(id, user.id);
    toast.success('품목이 삭제되었습니다.');
  };

  const handleExport = () => {
    const csv = Papa.unparse({
      fields: [
        '품목ID',
        '품목명',
        '설명',
        '카테고리',
        'SKU',
        '기본단위(낱개/박스)',
        '박스당_수량',
        '재고(박스)',
        '재고(낱개)',
        '총재고(낱개)',
        '임계치(박스)',
        '임계치(낱개)',
        '임계치(총낱개)',
        '옵션-사이즈',
        '옵션-색상'
      ],
      data: items.map((item) => [
        item.id,
        item.name,
        item.description ?? '',
        item.category,
        item.sku,
        ITEM_UNIT_LABEL[item.unit],
        item.unitsPerBox ?? '',
        item.unitsPerBox ? Math.floor(item.stock / (item.unitsPerBox || 1)) : '',
        item.unitsPerBox ? item.stock % (item.unitsPerBox || 1) : '',
        item.stock,
        item.unitsPerBox ? Math.floor(item.threshold / (item.unitsPerBox || 1)) : '',
        item.unitsPerBox ? item.threshold % (item.unitsPerBox || 1) : '',
        item.threshold,
        item.option?.size ?? '',
        item.option?.color ?? ''
      ])
    });
    downloadFile('items.csv', csv);
    toast.success('CSV 파일로 내보냈습니다.');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<ItemCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const trimmed = header.trim();
        return (ITEM_HEADER_MAP[trimmed] ?? trimmed) as keyof ItemCsvRow as string;
      },
      complete: (results) => {
        try {
          const parsedItems = ((results.data as ItemCsvRow[])
            .filter((row) => row.name && row.category && row.sku)
            .map((row) => {
              const resolvedUnit =
                ITEM_UNIT_FROM_LABEL[String(row.unit ?? '').trim()] ?? 'each';
              const parsedUnitsPerBox = Number(row.unitsPerBox);
              const resolvedUnitsPerBox =
                resolvedUnit === 'box' && Number.isFinite(parsedUnitsPerBox) && parsedUnitsPerBox > 0
                  ? parsedUnitsPerBox
                  : undefined;
              const rowRecord = row as unknown as Record<string, unknown>;
              const legacyThreshold = Number(row.threshold ?? rowRecord.threshold ?? 0);
              const legacyStock = Number(rowRecord.stock ?? row.stockEachTotal ?? 0);
              const stockBoxes = Number(row.stockBoxes ?? 0);
              const stockRemainder = Number(row.stockRemainder ?? 0);
              const thresholdBoxes = Number(row.thresholdBoxes ?? 0);
              const thresholdRemainder = Number(row.thresholdRemainder ?? 0);

              const hasStockBreakdown = Boolean(stockBoxes || stockRemainder);
              const computedStock = resolvedUnitsPerBox
                ? hasStockBreakdown
                  ? stockBoxes * resolvedUnitsPerBox + stockRemainder
                  : legacyStock
                : legacyStock;
              const hasThresholdBreakdown = Boolean(thresholdBoxes || thresholdRemainder);
              const computedThreshold = resolvedUnitsPerBox
                ? hasThresholdBreakdown
                  ? thresholdBoxes * resolvedUnitsPerBox + thresholdRemainder
                  : legacyThreshold
                : legacyThreshold;

              return {
                id: row.id && row.id.length > 0 ? row.id : nanoid(),
                name: row.name,
                description: row.description ?? '',
                category: row.category,
                unit: resolvedUnit,
                unitsPerBox: resolvedUnitsPerBox,
                option: {
                  size: row.optionSize || undefined,
                  color: row.optionColor || undefined
                },
                photo: undefined,
                sku: row.sku,
                threshold: computedThreshold,
                stock: computedStock
              } as Item;
            })) as Item[];
          if (!user) {
            throw new Error('로그인이 필요합니다.');
          }
          importItems(parsedItems, user.id);
          toast.success(`${parsedItems.length}건의 품목을 불러왔습니다.`);
        } catch (error) {
          toast.error('CSV 파일을 처리하는 중 오류가 발생했습니다.');
        }
      },
      error: () => toast.error('파일을 읽는 중 오류가 발생했습니다.')
    });
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>품목 관리</CardTitle>
          <CardDescription>사내에서 사용하는 소모품 품목을 등록/수정/삭제할 수 있습니다.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              CSV 불러오기
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
            </label>
          </Button>
          <Button variant="outline" onClick={handleExport}>
            CSV 내보내기
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>품목 추가</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>품목 {formState.id ? '수정' : '등록'}</DialogTitle>
                <DialogDescription>필수 정보를 입력하고 저장하세요.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">품목명 *</Label>
                    <Input
                      id="name"
                      required
                      value={formState.name}
                      onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      required
                      value={formState.sku}
                      onChange={(event) => setFormState({ ...formState, sku: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">카테고리 *</Label>
                    <Input
                      id="category"
                      required
                      value={formState.category}
                      onChange={(event) => setFormState({ ...formState, category: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">단위 *</Label>
                    <select
                      id="unit"
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={formState.unit}
                      onChange={(event) => {
                        const nextUnit = event.target.value as UnitType;
                        setFormState((prev) => {
                          if (nextUnit === 'each') {
                            const perBox = prev.unitsPerBox > 0 ? prev.unitsPerBox : 1;
                            return {
                              ...prev,
                              unit: nextUnit,
                              stock:
                                prev.stockBoxes * perBox + prev.stockRemainder,
                              threshold:
                                prev.thresholdBoxes * perBox + prev.thresholdRemainder
                            };
                          }
                          return { ...prev, unit: nextUnit };
                        });
                      }}
                    >
                      <option value="each">낱개</option>
                      <option value="box">박스</option>
                    </select>
                  </div>
                </div>
                {formState.unit === 'box' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="unitsPerBox">박스당 낱개 수량 *</Label>
                      <Input
                        id="unitsPerBox"
                        type="number"
                        min={1}
                        value={formState.unitsPerBox}
                        onChange={(event) =>
                          setFormState({ ...formState, unitsPerBox: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockBoxes">현재 재고 - 박스</Label>
                      <Input
                        id="stockBoxes"
                        type="number"
                        min={0}
                        value={formState.stockBoxes}
                        onChange={(event) =>
                          setFormState({ ...formState, stockBoxes: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stockRemainder">현재 재고 - 낱개</Label>
                      <Input
                        id="stockRemainder"
                        type="number"
                        min={0}
                        value={formState.stockRemainder}
                        onChange={(event) =>
                          setFormState({ ...formState, stockRemainder: Number(event.target.value) })
                        }
                      />
                      <p className="text-xs text-slate-500">
                        총 {formState.stockBoxes * formState.unitsPerBox + formState.stockRemainder}낱개 보유
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thresholdBoxes">임계치 - 박스</Label>
                      <Input
                        id="thresholdBoxes"
                        type="number"
                        min={0}
                        value={formState.thresholdBoxes}
                        onChange={(event) =>
                          setFormState({ ...formState, thresholdBoxes: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thresholdRemainder">임계치 - 낱개</Label>
                      <Input
                        id="thresholdRemainder"
                        type="number"
                        min={0}
                        value={formState.thresholdRemainder}
                        onChange={(event) =>
                          setFormState({ ...formState, thresholdRemainder: Number(event.target.value) })
                        }
                      />
                      <p className="text-xs text-slate-500">
                        총 {formState.thresholdBoxes * formState.unitsPerBox + formState.thresholdRemainder}낱개 기준
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="threshold">임계치(낱개) *</Label>
                      <Input
                        id="threshold"
                        type="number"
                        min={0}
                        value={formState.threshold}
                        onChange={(event) =>
                          setFormState({ ...formState, threshold: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">현재 재고(낱개) *</Label>
                      <Input
                        id="stock"
                        type="number"
                        min={0}
                        value={formState.stock}
                        onChange={(event) =>
                          setFormState({ ...formState, stock: Number(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="optionSize">옵션 - 사이즈</Label>
                    <Input
                      id="optionSize"
                      value={formState.optionSize}
                      onChange={(event) =>
                        setFormState({ ...formState, optionSize: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="optionColor">옵션 - 색상</Label>
                    <Input
                      id="optionColor"
                      value={formState.optionColor}
                      onChange={(event) =>
                        setFormState({ ...formState, optionColor: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">사진 URL</Label>
                  <Input
                    id="photo"
                    value={formState.photo}
                    onChange={(event) => setFormState({ ...formState, photo: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState({ ...formState, description: event.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    취소
                  </Button>
                  <Button type="submit">저장</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">전체 카테고리</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>품목명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>단위</TableHead>
                <TableHead>재고</TableHead>
                <TableHead>임계치</TableHead>
                <TableHead>옵션</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className={item.stock <= item.threshold ? 'bg-amber-50' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.unit === 'each' ? '낱개' : '박스'}</TableCell>
                  <TableCell>{formatStockSummary(item)}</TableCell>
                  <TableCell>
                    {item.unitsPerBox
                      ? `${Math.floor(item.threshold / (item.unitsPerBox || 1))}박스 ${
                          item.threshold % (item.unitsPerBox || 1)
                        }낱개 (총 ${item.threshold}낱개)`
                      : `${item.threshold}낱개`}
                  </TableCell>
                  <TableCell>
                    {[item.option?.size, item.option?.color].filter(Boolean).join(' / ') || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                        수정
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500">
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
