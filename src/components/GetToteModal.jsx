import { useState, useRef, useEffect, useCallback } from 'react';
import { Package, X } from 'lucide-react';
import { scannerService } from '../services/scanner';

export default function GetToteModal({ orderNumber, customer, expectedTote, onConfirm, onClose }) {
  const [toteBarcode, setToteBarcode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const scanBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const errorTimeoutRef = useRef(null);

  // Do NOT auto-focus the input on mount to avoid opening the soft keyboard on scanning devices.
  // Scanner input is captured by the scanner service and keyboard listener below.

  // Scanner service listener for native DataWedge intents
  useEffect(() => {
    const unsubscribe = scannerService.addListener((scanData) => {
      console.log('[GetToteModal] Scan from scanner service:', scanData);
      setToteBarcode(scanData.barcode);
    });

    return () => {
      unsubscribe();
      // Clear any pending error timeout on unmount
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Global keyboard scanner listener for modal (keyboard wedge fallback)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      
      // Reset buffer if too much time passed
      if (now - lastKeyTime.current > 500) {
        scanBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (scanBuffer.current.length > 0) {
          console.log('[GetToteModal] Keyboard scan:', scanBuffer.current);
          // Route through scanner service for unified handling
          scannerService.simulateScan(scanBuffer.current);
          scanBuffer.current = '';
          e.preventDefault();
        }
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    
    if (!toteBarcode.trim()) {
      setError('Please scan or enter a tote barcode');
      return;
    }

    // If expectedTote exists, validate it matches
    if (expectedTote && toteBarcode.trim().toUpperCase() !== expectedTote.toUpperCase()) {
      setError(`Wrong tote! Expected: ${expectedTote}`);
      
      // Auto-clear the input after 2 seconds to allow rescanning
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setToteBarcode('');
        setError('');
      }, 2000);
      
      return;
    }

    onConfirm(toteBarcode.trim());
  }, [toteBarcode, expectedTote, onConfirm]);

  // Auto-submit when barcode entered (after scanner adds it)
  useEffect(() => {
    if (toteBarcode && toteBarcode.length > 3) {
      // Small delay to let user see the value
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [toteBarcode, handleSubmit]);

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
              onChange={(e) => {
                setToteBarcode(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-warehouse-gray-medium text-white rounded-lg 
                       border border-warehouse-gray-light focus:border-warehouse-blue 
                       focus:outline-none text-lg"
              placeholder="TOTE-123"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-warehouse-red/20 border border-warehouse-red rounded">
              <p className="text-warehouse-red text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-warehouse-blue text-white rounded-lg font-bold 
                     hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 
                     disabled:cursor-not-allowed"
            disabled={!toteBarcode.trim()}
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