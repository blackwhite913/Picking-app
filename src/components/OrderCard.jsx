import { useState } from 'react';
import { Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { color: 'border-warehouse-gray-medium', bgColor: 'bg-warehouse-gray-dark' },
  picking: { color: 'border-warehouse-blue', bgColor: 'bg-warehouse-blue/10' },
  picked: { color: 'border-warehouse-green', bgColor: 'bg-warehouse-green/10' },
  none_remaining: { color: 'border-warehouse-red', bgColor: 'bg-warehouse-red/10' },
  oversized: { color: 'border-warehouse-purple', bgColor: 'bg-warehouse-purple/10' },
};

export default function OrderCard({
  order,
  isActive,
  onPickOne,
  onPickQuantity,
  onNoneRemaining,
  disabled
}) {
  const [manualQuantity, setManualQuantity] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Find the first incomplete item, or default to first item
  // Find the first incomplete item, or default to last item if all done
  if (!order || !order.items || order.items.length === 0) {
    return null;
  }

  // Find the first incomplete item, or default to last item if all done
  const item = order.items.find(item =>
    (item.quantity_picked || 0) < item.quantity_required &&
    item.status !== 'oversized' &&
    item.status !== 'none_remaining'
  ) || order.items[order.items.length - 1];

  if (!item) return null; // Should not happen given check above, but extra safe

  const quantityNeeded = item.quantity_required;
  const quantityPicked = item.quantity_picked || 0;
  const quantityRemaining = quantityNeeded - quantityPicked;
  const isComplete = quantityPicked >= quantityNeeded || item.status === 'none_remaining' || item.status === 'oversized';

  // Check if ALL items in this order are complete
  const allItemsComplete = order.items.every(i =>
    i.quantity_picked >= i.quantity_required ||
    i.status === 'oversized' ||
    i.status === 'none_remaining'
  );

  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

  const handleManualPick = () => {
    const qty = parseInt(manualQuantity);
    if (qty > 0 && qty <= quantityRemaining && onPickQuantity) {
      onPickQuantity(qty);
      setManualQuantity('');
      setShowManualEntry(false);
    }
  };

  return (
    <div
      className={`border-2 ${statusConfig.color} ${statusConfig.bgColor} rounded-lg p-3 ${isActive ? 'ring-2 ring-warehouse-blue' : 'opacity-75'
        }`}
    >
      {/* Compact Order Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          <h3 className="text-white font-bold text-base">{order.orderNumber}</h3>
          {allItemsComplete && <Check className="text-warehouse-green" size={16} />}
          {item.is_oversized && (
            <span className="px-1.5 py-0.5 bg-warehouse-purple text-white text-xs font-semibold rounded">
              Oversized
            </span>
          )}
          {item.status === 'none_remaining' && (
            <AlertCircle size={14} className="text-warehouse-red" />
          )}
        </div>
      </div>

      {/* Compact Quantity Display */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-xl font-bold">
          <span className={quantityPicked === 0 && item.status === 'none_remaining' ? 'text-warehouse-red' : ''}>
            {quantityPicked}
          </span>
          <span className="text-warehouse-gray-light text-sm"> / {quantityNeeded}</span>
          {quantityRemaining > 0 && (
            <span className="text-warehouse-yellow text-base ml-2">({quantityRemaining} left)</span>
          )}
        </p>
      </div>

      {/* Compact Picking Controls */}
      {isActive && !isComplete && (
        <div className="space-y-2">
          {/* Main Pick Button Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPickOne}
              disabled={disabled}
              className="py-3 bg-warehouse-blue text-white text-base font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Pick 1
            </button>

            {/* Compact Manual Entry */}
            <div className="flex items-center space-x-1">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max={quantityRemaining}
                value={manualQuantity}
                onChange={(e) => setManualQuantity(e.target.value)}
                placeholder="Qty"
                className="flex-1 px-2 py-3 bg-warehouse-gray-dark text-white text-center text-base rounded-lg border-2 border-transparent focus:border-warehouse-blue focus:outline-none"
              />
              <button
                onClick={handleManualPick}
                disabled={!manualQuantity || disabled}
                className="w-12 h-12 bg-warehouse-green text-white font-bold rounded-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                ✓
              </button>
            </div>
          </div>

          {/* Collapsible Exception Buttons */}
          {!showManualEntry ? (
            <button
              onClick={() => setShowManualEntry(true)}
              className="w-full text-warehouse-gray-light text-xs flex items-center justify-center space-x-1 py-1"
            >
              <span>Show Exception Options</span>
              <ChevronDown size={14} />
            </button>
          ) : (
            <>
              <button
                onClick={onNoneRemaining}
                disabled={disabled}
                className="w-full py-2 bg-warehouse-red text-white text-xs font-semibold rounded-lg hover:bg-red-600 active:bg-red-700 disabled:opacity-50 transition-colors"
              >
                None Left
              </button>

              <button
                onClick={() => setShowManualEntry(false)}
                className="w-full text-warehouse-gray-light text-xs flex items-center justify-center space-x-1 py-1"
              >
                <span>Hide Exception Options</span>
                <ChevronUp size={14} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Compact Completion Message */}
      {allItemsComplete && (
        <div className="text-center">
          <p className="text-warehouse-green text-sm font-semibold">✓ Complete</p>
        </div>
      )}
      {!allItemsComplete && isComplete && (
        <div className="text-center">
          <p className="text-warehouse-blue text-xs">Item done - continue with remaining</p>
        </div>
      )}
    </div>
  );
}