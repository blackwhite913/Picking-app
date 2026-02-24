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
  if (import.meta.env.DEV) {
    // #region agent log
    fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H2',location:'src/App.jsx:15',message:'ProtectedRoute auth state',data:{isAuthenticated},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  useStableViewportHeight();
  if (import.meta.env.DEV) {
    // #region agent log
    fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H3',location:'src/App.jsx:30',message:'App render entered',data:{pathname:window.location.pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

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
