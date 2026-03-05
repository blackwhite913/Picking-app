import { useState, useRef, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { scannerService } from '../services/scanner';

export default function GetToteModal({ orderNumber, customer, expectedTote, onConfirm, onClose }) {
  const [toteBarcode, setToteBarcode] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const unsubscribe = scannerService.addListener((scanData) => {
      const value = scanData.barcode?.trim();
      if (value) {
        onConfirm(value);
      }
    });

    return () => unsubscribe();
  }, [onConfirm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = toteBarcode?.trim();
    if (!value) return;
    onConfirm(value);
    setToteBarcode('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-warehouse-gray-dark rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="text-warehouse-blue" size={24} />
            <h3 className="text-white text-xl font-bold">
              {expectedTote ? 'Verify Tote' : 'Get Tote'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-warehouse-gray-light hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-warehouse-gray-light mb-2">
            Order: <span className="text-white font-semibold">{orderNumber}</span>
          </p>
          <p className="text-warehouse-gray-light">
            Customer: <span className="text-white font-semibold">{customer}</span>
          </p>
        </div>

        {expectedTote && (
          <div className="mb-4 p-3 bg-warehouse-blue/20 border border-warehouse-blue rounded">
            <p className="text-warehouse-blue text-sm font-semibold">
              Expected Tote: {expectedTote}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-warehouse-gray-light text-sm mb-2">
              Scan or Enter Tote Barcode
            </label>
            <input
              ref={inputRef}
              type="text"
              value={toteBarcode}
              onChange={(e) => setToteBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.keyCode === 10) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="w-full px-4 py-3 bg-warehouse-gray-medium text-white rounded-lg 
                       border border-warehouse-gray-light focus:border-warehouse-blue 
                       focus:outline-none text-lg"
              placeholder="TOTE-123"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-warehouse-blue text-white rounded-lg font-bold 
                     hover:bg-blue-600 active:bg-blue-700"
          >
            Continue
          </button>
        </form>

        <button
          onClick={() => {
            const simulated = `TOTE-${Math.floor(Math.random() * 1000)}`;
            setToteBarcode(simulated);
          }}
          className="w-full mt-2 py-2 text-warehouse-gray-light text-sm hover:text-white"
        >
          Simulate Scan (Testing)
        </button>
      </div>
    </div>
  );
}