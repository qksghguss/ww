import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function LoginPage() {
  const { loginUser, loginAdmin } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (isAdmin) {
        await loginAdmin(password);
      } else {
        await loginUser({ username, password });
      }
      toast.success('로그인 성공');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>사내 소모품 관리</CardTitle>
          <CardDescription>권한에 맞는 로그인 방법을 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-2">
            <Button variant={isAdmin ? 'secondary' : 'default'} className="flex-1" onClick={() => setIsAdmin(false)}>
              사용자 로그인
            </Button>
            <Button variant={isAdmin ? 'default' : 'secondary'} className="flex-1" onClick={() => setIsAdmin(true)}>
              관리자 로그인
            </Button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="username">아이디</Label>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="아이디를 입력하세요"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
