import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useData } from '../context/data-context';
import { downloadFile, formatDate } from '../lib/utils';
import { useDebounce } from '../hooks/use-debounce';
import { useAuth } from '../context/auth-context';

export function AuditLogPage() {
  const { auditLogs, users, deleteAuditLog, clearAuditLogs } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const scopedLogs = useMemo(
    () => (user?.role === 'admin' ? auditLogs : auditLogs.filter((log) => log.category === 'inventory')),
    [auditLogs, user]
  );

  const filteredLogs = useMemo(() => {
    return scopedLogs.filter((log) => {
      const matchesActor = actorFilter ? log.actorId === actorFilter : true;
      const matchesDate = dateFilter ? log.timestamp.startsWith(dateFilter) : true;
      const matchesSearch = debouncedSearch
        ? log.action.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          log.target.toLowerCase().includes(debouncedSearch.toLowerCase())
        : true;
      return matchesActor && matchesDate && matchesSearch;
    });
  }, [scopedLogs, actorFilter, dateFilter, debouncedSearch]);

  const handleExport = () => {
    const csv = Papa.unparse({
      fields: ['이력ID', '사용자', '액션', '대상', '일시'],
      data: filteredLogs.map((log) => [
        log.id,
        users.find((u) => u.id === log.actorId)?.name ?? log.actorId,
        log.action,
        log.target,
        formatDate(log.timestamp)
      ])
    });
    downloadFile('audit-log.csv', csv);
  };

  const handleDeleteLog = (id: string) => {
    if (user?.role !== 'admin' || !user) return;
    const target = filteredLogs.find((log) => log.id === id);
    if (!target) return;
    if (!confirm('선택한 이력을 삭제하시겠습니까?')) return;
    deleteAuditLog(id, user.id);
    toast.success('이력이 삭제되었습니다.');
  };

  const handleClearLogs = () => {
    if (user?.role !== 'admin' || !user) return;
    if (!confirm('모든 이력을 초기화하시겠습니까?')) return;
    clearAuditLogs(user.id);
    toast.success('이력이 초기화되었습니다.');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>이력 관리</CardTitle>
          <CardDescription>
            {user?.role === 'admin'
              ? '모든 액션 로그를 확인하고 CSV로 내보낼 수 있습니다.'
              : '재고 입출 관련 로그만 확인할 수 있습니다.'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Button variant="destructive" onClick={handleClearLogs}>
              이력 초기화
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            CSV 내보내기
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            placeholder="키워드 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={actorFilter}
            onChange={(event) => setActorFilter(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">전체 사용자</option>
            {users.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
          <div className="flex items-center text-sm text-slate-500">
            총 {filteredLogs.length}건의 로그
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>액션</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>일시</TableHead>
                {user?.role === 'admin' && <TableHead className="text-right">관리</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{users.find((u) => u.id === log.actorId)?.name ?? log.actorId}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.target}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(log.timestamp)}</TableCell>
                  {user?.role === 'admin' && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteLog(log.id)}>
                        삭제
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={user?.role === 'admin' ? 5 : 4}
                    className="text-center text-sm text-slate-500"
                  >
                    조건에 해당하는 로그가 없습니다.
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
