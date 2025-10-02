import { NavLink, useLocation } from 'react-router-dom';
import { useState, type ComponentType, type SVGProps } from 'react';
import { useAuth } from '../context/auth-context';
import { useData } from '../context/data-context';
import { Button } from './ui/button';
import type { Role } from '../types';
import {
  MenuIcon,
  PackageIcon,
  ShoppingCartIcon,
  ClipboardListIcon,
  HistoryIcon,
  UsersIcon,
  LayoutDashboardIcon,
} from './icons';
import { Spinner } from './ui/spinner';
import { formatDate } from '../lib/utils';

type NavigationItem = {
  name: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: Role[];
};

const navigation: NavigationItem[] = [
  { name: '대시보드', to: '/dashboard', icon: LayoutDashboardIcon, roles: ['admin', 'user'] },
  { name: '품목 관리', to: '/items', icon: PackageIcon, roles: ['admin'] },
  { name: '재고 관리', to: '/inventory', icon: ClipboardListIcon, roles: ['admin'] },
  { name: '지급 요청', to: '/issue-requests', icon: ShoppingCartIcon, roles: ['admin', 'user'] },
  { name: '구매 요청', to: '/purchase-requests', icon: ShoppingCartIcon, roles: ['admin', 'user'] },
  { name: '이력 관리', to: '/history', icon: HistoryIcon, roles: ['admin', 'user'] },
  { name: '사용자 관리', to: '/users', icon: UsersIcon, roles: ['admin'] }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { syncInfo, refresh } = useData();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navigation.filter((item) => (user ? item.roles.includes(user.role) : false));

  return (
    <div className="flex min-h-screen w-full bg-slate-100">
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0`}
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <span className="text-lg font-semibold text-slate-900">소모품 관리</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4 py-6">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col lg:pl-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-medium text-slate-500">
                안녕하세요, {user?.name}님
                {user?.process ? ` · ${user.process}` : ''}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {items.find((item) => item.to === location.pathname)?.name ?? '대시보드'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs text-slate-500 sm:flex">
              <div className="flex items-center justify-end gap-2">
                {syncInfo.isSyncing ? (
                  <>
                    <Spinner className="h-4 w-4 text-brand" />
                    <span>동기화 중...</span>
                  </>
                ) : syncInfo.error ? (
                  <span className="text-red-500">동기화 오류</span>
                ) : (
                  <span>동기화 완료</span>
                )}
              </div>
              {syncInfo.lastSyncedAt ? (
                <span>
                  최근: {formatDate(syncInfo.lastSyncedAt)}
                  {syncInfo.source === 'remote'
                    ? ' · 서버'
                    : syncInfo.source === 'realtime'
                    ? ' · 실시간'
                    : syncInfo.source === 'cache'
                    ? ' · 캐시'
                    : syncInfo.source === 'custom'
                    ? ' · 저장소'
                    : ' · 초기데이터'}
                </span>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refresh();
              }}
              disabled={syncInfo.isSyncing}
              className="hidden sm:inline-flex"
            >
              {syncInfo.isSyncing ? '동기화...' : '새로고침'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void logout();
              }}
            >
              로그아웃
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
