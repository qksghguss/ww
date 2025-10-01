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
import { downloadFile } from '../lib/utils';
import { nanoid } from '../lib/nanoid';
import { useDebounce } from '../hooks/use-debounce';

interface ItemFormState {
  id?: string;
  name: string;
  description: string;
  category: string;
  unit: UnitType;
  optionSize: string;
  optionColor: string;
  photo: string;
  sku: string;
  threshold: number;
  stock: number;
}

const initialFormState: ItemFormState = {
  name: '',
  description: '',
  category: '',
  unit: 'each',
  optionSize: '',
  optionColor: '',
  photo: '',
  sku: '',
  threshold: 0,
  stock: 0
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

    const payload: Item = {
      id: formState.id ?? '',
      name: formState.name,
      description: formState.description,
      category: formState.category,
      unit: formState.unit,
      option: {
        size: formState.optionSize || undefined,
        color: formState.optionColor || undefined
      },
      photo: formState.photo || undefined,
      sku: formState.sku,
      threshold: Number(formState.threshold),
      stock: Number(formState.stock)
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
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      optionSize: item.option?.size ?? '',
      optionColor: item.option?.color ?? '',
      photo: item.photo ?? '',
      sku: item.sku,
      threshold: item.threshold,
      stock: item.stock
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
    const csv = Papa.unparse(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        unit: item.unit,
        optionSize: item.option?.size ?? '',
        optionColor: item.option?.color ?? '',
        sku: item.sku,
        threshold: item.threshold,
        stock: item.stock
      }))
    );
    downloadFile('items.csv', csv);
    toast.success('CSV 파일로 내보냈습니다.');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Item>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedItems = results.data
            .filter((row) => row.name && row.category && row.sku)
            .map((row) => ({
              ...row,
              id: row.id && row.id.length > 0 ? row.id : nanoid(),
              threshold: Number(row.threshold ?? 0),
              stock: Number(row.stock ?? 0),
              option: {
                size: (row as any).optionSize || undefined,
                color: (row as any).optionColor || undefined
              }
            })) as unknown as Item[];
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
                      onChange={(event) =>
                        setFormState({ ...formState, unit: event.target.value as UnitType })
                      }
                    >
                      <option value="each">낱개</option>
                      <option value="box">박스</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">임계치 *</Label>
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
                    <Label htmlFor="stock">현재 재고 *</Label>
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
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{item.threshold}</TableCell>
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
