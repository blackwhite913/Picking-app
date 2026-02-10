
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, AlertCircle } from 'lucide-react';

export default function BatchComplete() {
  const navigate = useNavigate();
  const location = useLocation();

  const { productionCount = 0, finalFindCount = 0 } = location.state || {};

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