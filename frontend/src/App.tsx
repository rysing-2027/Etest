import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SelectPair from './pages/SelectPair';
import TestPage from './pages/TestPage';
import CompletePage from './pages/CompletePage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminPairs from './pages/admin/AdminPairs';
import AdminMagic from './pages/admin/AdminMagic';
import AdminSentences from './pages/admin/AdminSentences';
import AdminTesters from './pages/admin/AdminTesters';
import AdminResults from './pages/admin/AdminResults';
import AdminResultDetail from './pages/admin/AdminResultDetail';

function ProtectedRoute({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/" replace />;
  if (admin && !user.is_admin) return <Navigate to="/select" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/select" element={<ProtectedRoute><SelectPair /></ProtectedRoute>} />
        <Route path="/test/:sessionId" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
        <Route path="/complete" element={<ProtectedRoute><CompletePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute admin><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminPairs />} />
          <Route path="pairs" element={<AdminPairs />} />
          <Route path="magic" element={<AdminMagic />} />
          <Route path="sentences/:pairId" element={<AdminSentences />} />
          <Route path="testers" element={<AdminTesters />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="results/:sessionId" element={<AdminResultDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
