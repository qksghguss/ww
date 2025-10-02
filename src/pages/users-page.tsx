import { useState } from 'react';
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
import type { Role, User } from '../types';
import { downloadFile } from '../lib/utils';

interface UserFormState {
  id?: string;
  username: string;
  name: string;
  password: string;
  role: Role;
  process: string;
}

const initialFormState: UserFormState = {
  username: '',
  name: '',
  password: '',
  role: 'user',
  process: ''
};

export function UsersPage() {
  const { users, upsertUser, removeUser } = useData();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<UserFormState>(initialFormState);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!formState.username || !formState.password || !formState.name || !formState.process) {
      toast.error('필수 정보를 모두 입력하세요.');
      return;
    }
    upsertUser(
      {
        id: formState.id,
        username: formState.username,
        name: formState.name,
        password: formState.password,
        role: formState.role,
        process: formState.process
      },
      user.id,
      formState.id ? '사용자 수정' : '사용자 추가'
    );
    toast.success('사용자 정보가 저장되었습니다.');
    setDialogOpen(false);
    setFormState(initialFormState);
  };

  const handleEdit = (target: User) => {
    setFormState({
      id: target.id,
      username: target.username,
      name: target.name,
      password: target.password,
      role: target.role,
      process: target.process
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    if (!confirm('해당 사용자를 삭제하시겠습니까?')) return;
    removeUser(id, user.id);
    toast.success('사용자가 삭제되었습니다.');
  };

  const handleExport = () => {
    const csv = Papa.unparse({
      fields: ['아이디', '이름', '권한', '공정', '비밀번호'],
      data: users.map((record) => [
        record.username,
        record.name,
        record.role === 'admin' ? '관리자' : '일반 사용자',
        record.process,
        record.password
      ])
    });
    downloadFile('users.csv', csv);
    toast.success('사용자 목록을 CSV로 내보냈습니다.');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>사용자 관리</CardTitle>
          <CardDescription>사내 사용자 계정을 생성하고 권한을 부여하세요.</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              CSV 다운로드
            </Button>
            <DialogTrigger asChild>
              <Button>사용자 추가</Button>
            </DialogTrigger>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>사용자 {formState.id ? '수정' : '등록'}</DialogTitle>
              <DialogDescription>아이디와 권한을 입력하세요.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">아이디 *</Label>
                  <Input
                    id="username"
                    value={formState.username}
                    onChange={(event) => setFormState({ ...formState, username: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formState.password}
                    onChange={(event) => setFormState({ ...formState, password: event.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">권한</Label>
                  <select
                    id="role"
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={formState.role}
                    onChange={(event) => setFormState({ ...formState, role: event.target.value as Role })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process">공정 / 부서 *</Label>
                  <Input
                    id="process"
                    placeholder="예: 생산1공정"
                    value={formState.process}
                    onChange={(event) =>
                      setFormState({ ...formState, process: event.target.value })
                    }
                    required
                  />
                </div>
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
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>아이디</TableHead>
                <TableHead>이름</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>공정/부서</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.username}</TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.role === 'admin' ? 'Admin' : 'User'}</TableCell>
                  <TableCell>{member.process}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
                        수정
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(member.id)}>
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
