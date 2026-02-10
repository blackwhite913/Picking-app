import { useState, useRef, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { scannerService } from '../services/scanner';

export default function GetToteModal({ orderNumber, customer, expectedTote, onConfirm, onClose }) {
  const [toteBarcode, setToteBarcode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const scanBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Do NOT auto-focus the input on mount to avoid opening the soft keyboard on scanning devices.
  // Scanner input is captured by the scanner service and keyboard listener below.

  // Scanner service listener for native DataWedge intents
  useEffect(() => {
    const unsubscribe = scannerService.addListener((scanData) => {
      console.log('[GetToteModal] Scan from scanner service:', scanData);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:18',message:'Scanner service received',data:{barcode:scanData.barcode,source:scanData.source},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      setToteBarcode(scanData.barcode);
    });

    return () => {
      unsubscribe();
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

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:56',message:'handleSubmit called',data:{toteBarcode,expectedTote,hasEvent:!!e},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    if (!toteBarcode.trim()) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:59',message:'Empty tote barcode',data:{},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      setError('Please scan or enter a tote barcode');
      return;
    }

    // If expectedTote exists, validate it matches
    if (expectedTote && toteBarcode.trim().toUpperCase() !== expectedTote.toUpperCase()) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:65',message:'Tote mismatch',data:{scanned:toteBarcode.trim().toUpperCase(),expected:expectedTote.toUpperCase()},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      setError(`Wrong tote! Expected: ${expectedTote}`);
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:69',message:'Calling onConfirm',data:{barcode:toteBarcode.trim()},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    onConfirm(toteBarcode.trim());
  };

  // Auto-submit when barcode entered (after scanner adds it)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:74',message:'Auto-submit effect triggered',data:{toteBarcode,length:toteBarcode?.length,willAutoSubmit:toteBarcode?.length>3},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'J'})}).catch(()=>{});
    // #endregion
    if (toteBarcode && toteBarcode.length > 3) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fdf83986-196c-4edf-be7b-8532a0e1a438',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GetToteModal.jsx:76',message:'Setting auto-submit timer',data:{delay:300},timestamp:Date.now(),runId:'tote-debug',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      // Small delay to let user see the value
      const timer = setTimeout(() => {
        handleSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [toteBarcode]);

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