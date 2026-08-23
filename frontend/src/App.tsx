import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import CreateAccount from './pages/CreateAccount';
import Overview from './pages/Overview';
import EnrichProduct from './pages/EnrichProduct';
import ProductDetails from './pages/ProductDetails';
import ConflictCenter from './pages/ConflictCenter';
import BulkUpload from './pages/BulkUpload';
import Products from './pages/Products';
import ReviewQueue from './pages/ReviewQueue';
import CatalogQuality from './pages/CatalogQuality';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import SummaryReport from './pages/SummaryReport';

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/create-account" element={<CreateAccount />} />
            
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<Overview />} />
              <Route path="enrich" element={<EnrichProduct />} />
              <Route path="products/:id" element={<ProductDetails />} />
              <Route path="conflicts" element={<ConflictCenter />} />
              
              <Route path="upload" element={<BulkUpload />} />
              <Route path="products" element={<Products />} />
              <Route path="review" element={<ReviewQueue />} />
              <Route path="quality" element={<CatalogQuality />} />
              <Route path="catalog-quality" element={<CatalogQuality />} />
              <Route path="reports/summary" element={<SummaryReport />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
