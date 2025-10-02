import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { useData } from './context/data-context';
import { AppLayout } from './components/app-layout';
import { DashboardPage } from './pages/dashboard-page';
import { ItemsPage } from './pages/items-page';
import { InventoryPage } from './pages/inventory-page';
import { IssueRequestsPage } from './pages/issue-requests-page';
import { PurchaseRequestsPage } from './pages/purchase-requests-page';
import { AuditLogPage } from './pages/audit-log-page';
import { UsersPage } from './pages/users-page';
import { LoginPage } from './pages/login-page';
import { LoadingScreen } from './components/loading-screen';

export default function App() {
  const { user, isReady } = useAuth();
  const { isHydrated, syncInfo } = useData();

  if (!isHydrated || !isReady) {
    return (
      <LoadingScreen
        description={
          syncInfo.error
            ? `데이터 동기화 오류: ${syncInfo.error}`
            : !isHydrated
            ? '최신 데이터를 동기화하고 있습니다.'
            : '세션 정보를 확인하고 있습니다.'
        }
      />
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/items"
          element={user.role === 'admin' ? <ItemsPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/inventory"
          element={user.role === 'admin' ? <InventoryPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route path="/issue-requests" element={<IssueRequestsPage />} />
        <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
        <Route path="/history" element={<AuditLogPage />} />
        <Route
          path="/users"
          element={user.role === 'admin' ? <UsersPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
