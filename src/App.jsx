import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useStableViewportHeight } from './hooks/useStableViewportHeight';
import Login from './pages/Login';
import BatchList from './pages/BatchList';
import PickingScreen from './pages/PickingScreen';
import ToteRouting from './pages/ToteRouting';
import BatchComplete from './pages/BatchComplete';


// Protected Route wrapper
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  useStableViewportHeight();

  return (
    <div
      className="flex flex-col bg-warehouse-bg"
      style={{ 
        height: 'var(--app-height, 100vh)',
        maxHeight: 'var(--app-height, 100vh)',
        overflow: 'hidden'
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/batches"
            element={
              <ProtectedRoute>
                <BatchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/batch/:batchId"
            element={
              <ProtectedRoute>
                <PickingScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/batch/:batchId/route-totes"
            element={
              <ProtectedRoute>
                <ToteRouting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/batch-complete"
            element={
              <ProtectedRoute>
                <BatchComplete />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/batches" replace />} />
          <Route path="*" element={<Navigate to="/batches" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
