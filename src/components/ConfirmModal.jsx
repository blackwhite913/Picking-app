import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  showQuantityInput = false,
  maxQuantity = 1 
}) {
  const [quantity, setQuantity] = useState(maxQuantity);

  const handleConfirm = () => {
    if (showQuantityInput) {
      onConfirm(quantity);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
      <div className="bg-warehouse-gray-dark rounded-lg w-full max-w-md p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-warehouse-yellow/20 rounded-full flex items-center justify-center">
            <AlertCircle className="text-warehouse-yellow" size={32} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-xl font-bold text-center mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-warehouse-gray-light text-center mb-6">
          {message}
        </p>

        {/* Quantity Input */}
        {showQuantityInput && (
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 bg-warehouse-gray-medium text-white text-2xl font-bold rounded-lg hover:bg-warehouse-gray-light active:bg-warehouse-gray-medium"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                }}
                min="1"
                max={maxQuantity}
                className="w-24 h-12 bg-warehouse-gray-medium text-white text-2xl font-bold text-center rounded-lg border-2 border-transparent focus:border-warehouse-blue focus:outline-none"
              />
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                className="w-12 h-12 bg-warehouse-gray-medium text-white text-2xl font-bold rounded-lg hover:bg-warehouse-gray-light active:bg-warehouse-gray-medium"
              >
                +
              </button>
            </div>
            <p className="text-warehouse-gray-light text-center text-sm mt-2">
              Max: {maxQuantity}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-4 bg-warehouse-gray-medium text-white text-lg font-semibold rounded-lg hover:bg-warehouse-gray-medium/80 active:bg-warehouse-gray-medium/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="py-4 bg-warehouse-red text-white text-lg font-semibold rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}