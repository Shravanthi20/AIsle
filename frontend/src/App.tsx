import { Navigate, Route, Routes } from 'react-router-dom';

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
      <Route element={<AppLayout />}>
        <Route path="/merchant" element={<MerchantDashboardPage />} />
        <Route path="/buyer" element={<BuyerDashboardPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
