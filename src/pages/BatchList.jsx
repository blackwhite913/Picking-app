import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useBatchStore } from '../store';
import { batchAPI } from '../api';
import { Package, ChevronRight, LogOut, AlertCircle, Filter, ArrowUpDown, RefreshCw } from 'lucide-react';

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-500', bgColor: 'bg-red-500/20', emoji: '🔴' },
  high: { label: 'High', color: 'text-orange-500', bgColor: 'bg-orange-500/20', emoji: '🟠' },
  normal: { label: 'Normal', color: 'text-green-500', bgColor: 'bg-green-500/20', emoji: '🟢' },
  low: { label: 'Low', color: 'text-gray-500', bgColor: 'bg-gray-500/20', emoji: '⚪' },
};

export default function BatchList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const setBatch = useBatchStore((state) => state.setBatch);

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ASSIGNED, IN_PROGRESS
  const [sortBy, setSortBy] = useState('PRIORITY'); // PRIORITY, DATE

  useEffect(() => {
    window.scrollTo(0, 0); // Force scroll to top on load
    loadBatches();
  }, [location.key]); // Refresh whenever location changes (e.g. returning from picking)

  const loadBatches = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await batchAPI.getMyBatches();
      setBatches(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityScore = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT': return 4;
      case 'HIGH': return 3;
      case 'NORMAL': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  };

  const processedBatches = batches
    .filter(batch => {
      if (filterStatus === 'ALL') return true;
      return batch.status === filterStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const scoreA = getPriorityScore(a.priority);
        const scoreB = getPriorityScore(b.priority);
        if (scoreA !== scoreB) return scoreB - scoreA; // Descending priority
      }
      // Secondary sort (or primary if sortBy is DATE) by date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const handleBatchSelect = async (batch) => {
    try {
      // Load full batch details
      const response = await batchAPI.getBatchDetails(batch.id);

      const fullBatch = response.data;

      // Store in global state
      setBatch(fullBatch);

      // Navigate to picking flow
      navigate(`/batch/${batch.id}`);
    } catch (err) {
      console.error('Error loading batch:', err);
      console.error('Error response:', err.response);
      setError('Failed to load batch details');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-full bg-warehouse-bg items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-warehouse-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full bg-warehouse-bg flex-col">
      {/* Header */}
      <div className="bg-warehouse-gray-dark px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#295541] rounded-full p-1.5 shadow-sm flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-warehouse-gray-light text-xs uppercase tracking-wider font-semibold">Picker</h1>
              </div>
              <p className="text-white text-lg font-bold bg-warehouse-blue/20 px-3 py-0.5 -ml-1 rounded border border-warehouse-blue/30 inline-block shadow-sm">
                {user?.name || user?.picker_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Refresh Button */}
            <button
              onClick={loadBatches}
              disabled={loading}
              className={`p-3 text-warehouse-gray-light hover:text-white ${loading ? 'animate-spin' : ''}`}
              title="Refresh Batches"
            >
              <RefreshCw size={24} />
            </button>
            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(prev => prev === 'PRIORITY' ? 'DATE' : 'PRIORITY')}
              className="p-3 text-warehouse-gray-light hover:text-white flex items-center gap-1"
              title="Toggle Sort"
            >
              <ArrowUpDown size={20} />
              <span className="text-xs font-medium">{sortBy === 'PRIORITY' ? 'Prio' : 'Date'}</span>
            </button>

            {/* Filter Toggle */}
            <button
              onClick={() => {
                const states = ['ALL', 'ASSIGNED', 'IN_PROGRESS'];
                const nextIndex = (states.indexOf(filterStatus) + 1) % states.length;
                setFilterStatus(states[nextIndex]);
              }}
              className={`p-3 hover:text-white flex items-center gap-1 ${filterStatus !== 'ALL' ? 'text-warehouse-blue' : 'text-warehouse-gray-light'}`}
              title="Toggle Filter"
            >
              <Filter size={20} />
              <span className="text-xs font-medium">
                {filterStatus === 'ALL' ? 'All' : filterStatus === 'ASSIGNED' ? 'New' : 'Active'}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="p-3 text-warehouse-gray-light hover:text-white"
              title="Logout"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {error && (
          <div className="bg-warehouse-red/20 border border-warehouse-red rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="text-warehouse-red flex-shrink-0 mt-0.5" size={20} />
            <p className="text-warehouse-red text-sm">{error}</p>
          </div>
        )}

        {batches.length === 0 ? (
          <div className="text-center py-12">
            <Package className="text-warehouse-gray-medium mx-auto mb-4" size={48} />
            <h2 className="text-white text-xl font-semibold mb-2">No Batches Assigned</h2>
            <p className="text-warehouse-gray-light">
              Check back later or contact your manager
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedBatches.map((batch) => {
              const priority = PRIORITY_CONFIG[batch.priority?.toLowerCase() || 'normal'];

              return (
                <button
                  key={batch.id}
                  onClick={() => handleBatchSelect(batch)}
                  className="w-full bg-warehouse-gray-dark rounded-lg p-3 text-left hover:bg-warehouse-gray-medium active:bg-warehouse-gray-medium/80 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{priority.emoji}</span>
                      <div>
                        <h3 className="text-white font-bold text-base">
                          {batch.batchNumber}
                        </h3>
                        <span className={`text-xs ${priority.color}`}>
                          {priority.label} Priority
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-warehouse-gray-light flex-shrink-0" size={20} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-warehouse-gray-light mb-0.5">Orders</p>
                      <p className="text-white font-semibold">{batch.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-warehouse-gray-light mb-0.5">Items</p>
                      <p className="text-white font-semibold">{batch.totalItems}</p>
                    </div>
                    {/* Totes removed as requested */}
                    <div>
                      <p className="text-warehouse-gray-light mb-0.5">Status</p>
                      <p className="text-warehouse-blue font-semibold capitalize">
                        {batch.status}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
