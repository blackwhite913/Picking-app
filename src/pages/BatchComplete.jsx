
import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, AlertCircle, MapPin } from 'lucide-react';
import { useBatchStore } from '../store';

export default function BatchComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBatch } = useBatchStore();

  const { productionCount = 0, finalFindCount = 0 } = location.state || {};

  const destinations = useMemo(() => {
    try {
      return Array.from(new Set(
        (currentBatch?.orders || [])
          .map(o => o.manualDestination?.trim())
          .filter(Boolean)
      ));
    } catch (err) {
      if (import.meta.env.DEV) {
        // #region agent log
        fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run3',hypothesisId:'N2',location:'src/pages/BatchComplete.jsx:15',message:'BatchComplete destination aggregation crashed',data:{ordersCount:currentBatch?.orders?.length||0,firstManualDestinationType:typeof currentBatch?.orders?.[0]?.manualDestination,errorMessage:String(err?.message||err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
      throw err;
    }
  }, [currentBatch]);

  const destinationText = destinations.length === 0
    ? 'No destination set'
    : destinations.join(', ');

  if (import.meta.env.DEV) {
    // #region agent log
    fetch('http://127.0.0.1:7288/ingest/6f7b4d02-d61c-4f1d-8ac9-ac4f4b312881',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'845059'},body:JSON.stringify({sessionId:'845059',runId:'run1',hypothesisId:'H3',location:'src/pages/BatchComplete.jsx:20',message:'BatchComplete render',data:{ordersCount:currentBatch?.orders?.length||0,destinationsCount:destinations.length,destinationText},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  return (
    <div className="flex min-h-full bg-warehouse-bg flex-col items-center justify-center p-6">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-warehouse-green rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="text-white" size={56} />
      </div>

      {/* Title */}
      <h1 className="text-white text-3xl font-bold mb-2 text-center">
        Batch Complete!
      </h1>
      <p className="text-warehouse-gray-light text-lg mb-8 text-center">
        Great work! All items have been picked and routed.
      </p>

      {/* Summary Cards */}
      <div className="w-full max-w-md space-y-3 mb-8">
        {/* Production Totes */}
        {productionCount > 0 && (
          <div className="bg-warehouse-green/10 border-2 border-warehouse-green rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <Package className="text-warehouse-green" size={24} />
              <h3 className="text-white font-bold text-lg">Production Studio</h3>
            </div>
            <p className="text-warehouse-green text-3xl font-bold">{productionCount}</p>
            <p className="text-warehouse-gray-light text-sm">totes ready to pack</p>
          </div>
        )}

        {/* Final Find Totes */}
        {finalFindCount > 0 && (
          <div className="bg-warehouse-red/10 border-2 border-warehouse-red rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-2">
              <AlertCircle className="text-warehouse-red" size={24} />
              <h3 className="text-white font-bold text-lg">Final Find</h3>
            </div>
            <p className="text-warehouse-red text-3xl font-bold">{finalFindCount}</p>
            <p className="text-warehouse-gray-light text-sm">totes need attention</p>
          </div>
        )}
      </div>

      {/* Destination Block */}
      <div className="w-full max-w-md bg-warehouse-gray-dark border-2 border-warehouse-yellow rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-1">
          <MapPin className="text-warehouse-yellow" size={16} />
          <p className="text-warehouse-gray-light text-xs font-semibold tracking-widest">DESTINATION</p>
        </div>
        <p className="text-warehouse-yellow text-xl font-bold break-words">{destinationText}</p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-md space-y-3">
        <button
          onClick={() => navigate('/batches')}
          className="w-full min-h-touch bg-warehouse-blue text-white text-xl font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          Back to Batches
        </button>
      </div>

      {/* Footer Message */}
      <div className="mt-8 text-center">
        <p className="text-warehouse-gray-light text-sm">
          <p className="text-gray-600">Batch data has been synced to Production Boards</p>
        </p>
      </div>
    </div>
  );
}