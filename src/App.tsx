import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessProvider, useBusiness } from './context/BusinessContext';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { Dashboard } from './pages/analytics/Dashboard';
import { BillingPOS } from './pages/billing/BillingPOS';
import { ProductList } from './pages/products/ProductList';
import { CatalogueBrowser } from './pages/catalogue/CatalogueBrowser';
import { BulkImport } from './pages/import-export/BulkImport';
import { InventoryManagement } from './pages/inventory/InventoryManagement';
import { ForecastingPage } from './pages/forecasting/ForecastingPage';
import { AssistantChat } from './pages/assistant/AssistantChat';
import { CustomerList } from './pages/customers/CustomerList';
import { SupplierList } from './pages/suppliers/SupplierList';
import { ExpenseList } from './pages/expenses/ExpenseList';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  const { company, isLoading: bizLoading } = useBusiness();

  if (isLoading || bizLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <span className="loading-spinner mb-2" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (company && !company.is_onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { token, isLoading } = useAuth();
  const { company, isLoading: bizLoading } = useBusiness();

  if (isLoading || bizLoading) {
    return null;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (company && !company.is_onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="billing" element={<BillingPOS />} />
              <Route path="products" element={<ProductList />} />
              <Route path="catalogue" element={<CatalogueBrowser />} />
              <Route path="bulk-import" element={<BulkImport />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="forecasting" element={<ForecastingPage />} />
              <Route path="assistant" element={<AssistantChat />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="suppliers" element={<SupplierList />} />
              <Route path="expenses" element={<ExpenseList />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
