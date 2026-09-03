import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { BuyerDashboardPage } from './pages/BuyerDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MerchantDashboardPage } from './pages/MerchantDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute role="MERCHANT" />}>
        <Route element={<AppLayout />}>
          <Route path="/merchant" element={<MerchantDashboardPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="BUYER" />}>
        <Route element={<AppLayout />}>
          <Route path="/buyer" element={<BuyerDashboardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
