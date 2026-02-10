import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authAPI } from '../api';
import { Package } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [pickerId, setPickerId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // #region agent log
  const [debugInfo, setDebugInfo] = useState('');
  // #endregion

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    // #region agent log
    setDebugInfo('');
    // #endregion

    // Check for internet connection first
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network settings.');
      return;
    }

    setLoading(true);

    // #region agent log
    // Hypothesis A,B: Check what URL is actually being used
    const apiModule = await import('../api/index.js');
    const actualBaseURL = apiModule.default.defaults.baseURL;
    console.log('[DEBUG] Actual API baseURL:', actualBaseURL);
    console.log('[DEBUG] Environment:', import.meta.env.MODE);
    setDebugInfo(`API URL: ${actualBaseURL} | Env: ${import.meta.env.MODE}`);
    // #endregion

    try {
      const response = await authAPI.login(pickerId, pin);
      const { user, token, access_token } = response.data;

      // Handle both 'token' and 'access_token' field names
      const authToken = token || access_token;

      // Store auth data
      setAuth(user, authToken);
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Navigate to batch list
      navigate('/batches');
    } catch (err) {
      console.error('Login error:', err);

      // #region agent log
      // Hypothesis C,D: Capture detailed error information
      console.log('[DEBUG] Error code:', err.code);
      console.log('[DEBUG] Error message:', err.message);
      console.log('[DEBUG] Error response:', err.response);
      console.log('[DEBUG] Error request:', err.request);
      console.log('[DEBUG] Error config:', err.config);
      
      const errorDetails = {
        code: err.code,
        message: err.message,
        hasResponse: !!err.response,
        responseStatus: err.response?.status,
        responseData: err.response?.data,
        requestURL: err.config?.url,
        requestBaseURL: err.config?.baseURL,
        requestMethod: err.config?.method
      };
      console.log('[DEBUG] Full error details:', JSON.stringify(errorDetails, null, 2));
      setDebugInfo(prev => `${prev} | Error: ${err.code || 'NO_CODE'} | Status: ${err.response?.status || 'NO_RESPONSE'}`);
      // #endregion

      // Check for specific network errors
      if (!err.response) {
        // No response usually means network error or server down
        setError('Network error. Unable to connect to server.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Please check your connection.');
      } else {
        // Server responded with error (e.g. 401)
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full bg-warehouse-bg flex-col items-center justify-center p-6">
      {/* Logo/Header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 mb-4 bg-[#295541] rounded-full p-4 shadow-lg">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">WAREHOUSE-LY</h1>
        <p className="text-warehouse-gray-light">Sign in to start picking</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Picker ID Input */}
          <div>
            <label htmlFor="pickerId" className="block text-white text-lg font-semibold mb-2">
              Picker ID / Email
            </label>
            <input
              id="pickerId"
              type="text"
              value={pickerId}
              onChange={(e) => setPickerId(e.target.value)}
              className="w-full px-6 py-4 text-xl bg-warehouse-gray-dark text-white rounded-lg border-2 border-transparent focus:border-warehouse-blue focus:outline-none"
              placeholder="Enter your ID"
              required
              autoComplete="username"
            />
          </div>

          {/* PIN Input */}
          <div>
            <label htmlFor="pin" className="block text-white text-lg font-semibold mb-2">
              PIN / Password
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-6 py-4 text-xl bg-warehouse-gray-dark text-white rounded-lg border-2 border-transparent focus:border-warehouse-blue focus:outline-none"
              placeholder="Enter your PIN"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-warehouse-red/20 border border-warehouse-red rounded-lg p-4">
              <p className="text-warehouse-red text-sm">{error}</p>
            </div>
          )}

          {/* #region agent log */}
          {/* Debug Info Display */}
          {debugInfo && (
            <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-3">
              <p className="text-blue-300 text-xs font-mono break-all">{debugInfo}</p>
            </div>
          )}
          {/* #endregion */}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-touch bg-[#295541] text-white text-xl font-semibold rounded-lg hover:bg-[#1f4232] active:bg-[#1a382b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Stay Logged In */}
        <div className="mt-6 flex items-center justify-center">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-warehouse-gray-medium"
            />
            <span className="text-warehouse-gray-light text-sm">Stay logged in</span>
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-warehouse-gray-light text-sm">
          Warehouse Picking System v1.0
        </p>
      </div>
    </div>
  );
}
