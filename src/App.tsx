import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { AppLayout } from './components/app-layout';
import { DashboardPage } from './pages/dashboard-page';
import { ItemsPage } from './pages/items-page';
import { InventoryPage } from './pages/inventory-page';
import { IssueRequestsPage } from './pages/issue-requests-page';
import { PurchaseRequestsPage } from './pages/purchase-requests-page';
import { AuditLogPage } from './pages/audit-log-page';
import { UsersPage } from './pages/users-page';
import { LoginPage } from './pages/login-page';

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/issue-requests" element={<IssueRequestsPage />} />
        <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
        <Route path="/history" element={<AuditLogPage />} />
        {user.role === 'admin' && <Route path="/users" element={<UsersPage />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
