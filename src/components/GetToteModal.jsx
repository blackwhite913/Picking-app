import { useState, useRef, useEffect, useCallback } from 'react';
import { Package, X } from 'lucide-react';
import { scannerService } from '../services/scanner';

export default function GetToteModal({ orderNumber, customer, expectedTote, onConfirm, onClose }) {
  const [toteBarcode, setToteBarcode] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  const inputRef = useRef(null);
  const debugRef = useRef(null);

  const dbg = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLog(prev => [...prev.slice(-30), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (debugRef.current) debugRef.current.scrollTop = debugRef.current.scrollHeight;
  }, [debugLog]);

  useEffect(() => {
    dbg(`MOUNT orderNumber=${orderNumber} expectedTote=${expectedTote}`);
    inputRef.current?.focus();
    const tag = document.activeElement?.tagName;
    const ours = document.activeElement === inputRef.current;
    dbg(`FOCUS tag=${tag} isOurInput=${ours}`);
  }, []);

  const onConfirmRef = useRef(onConfirm);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);

  useEffect(() => {
    dbg('SUBSCRIBE scannerService');
    const unsubscribe = scannerService.addListener((scanData) => {
      dbg(`SCANNER_EVENT barcode="${scanData.barcode}" src=${scanData.source}`);
      const value = scanData.barcode?.trim();
      if (value) {
        dbg(`SCANNER_CONFIRM → onConfirm("${value}")`);
        onConfirmRef.current(value);
      } else {
        dbg(`SCANNER_EMPTY raw="${scanData.barcode}"`);
      }
    });
    return () => { dbg('UNSUBSCRIBE'); unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Scanner types directly into DOM, bypassing React onChange.
    // React state (toteBarcode) stays empty — read DOM value as fallback.
    const domValue = inputRef.current?.value || '';
    const value = (toteBarcode || domValue).trim();
    dbg(`SUBMIT state="${toteBarcode}" dom="${domValue}" used="${value}" empty=${!value}`);
    if (!value) return;
    dbg(`SUBMIT_CONFIRM → onConfirm("${value}")`);
    onConfirm(value);
    setToteBarcode('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-warehouse-gray-dark rounded-lg max-w-md w-full p-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Package className="text-warehouse-blue" size={24} />
            <h3 className="text-white text-xl font-bold">
              {expectedTote ? 'Verify Tote' : 'Get Tote'}
            </h3>
          </div>
          <button onClick={onClose} className="text-warehouse-gray-light hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="mb-3">
          <p className="text-warehouse-gray-light mb-1">
            Order: <span className="text-white font-semibold">{orderNumber}</span>
          </p>
          <p className="text-warehouse-gray-light">
            Customer: <span className="text-white font-semibold">{customer}</span>
          </p>
        </div>

        {expectedTote && (
          <div className="mb-3 p-2 bg-warehouse-blue/20 border border-warehouse-blue rounded">
            <p className="text-warehouse-blue text-sm font-semibold">
              Expected Tote: {expectedTote}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-warehouse-gray-light text-sm mb-1">
              Scan or Enter Tote Barcode
            </label>
            <input
              ref={inputRef}
              type="text"
              value={toteBarcode}
              onChange={(e) => {
                setToteBarcode(e.target.value);
                dbg(`INPUT val="${e.target.value}" len=${e.target.value.length}`);
              }}
              onKeyDown={(e) => {
                dbg(`KEY key="${e.key}" code=${e.keyCode} val="${e.target.value}"`);
                if (e.keyCode === 10) {
                  dbg('LF_DETECTED → handleSubmit');
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              onFocus={() => dbg('INPUT_FOCUS')}
              onBlur={() => dbg('INPUT_BLUR')}
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

        {/* On-screen debug panel */}
        <div className="mt-3 border border-yellow-500 rounded bg-black p-2">
          <p className="text-yellow-400 text-xs font-bold mb-1">DEBUG LOG (on-device)</p>
          <div
            ref={debugRef}
            className="text-green-400 text-[10px] font-mono leading-tight max-h-32 overflow-y-auto whitespace-pre-wrap"
          >
            {debugLog.length === 0
              ? <span className="text-gray-500">Waiting for events...</span>
              : debugLog.map((line, i) => <div key={i}>{line}</div>)
            }
          </div>
        </div>
      </div>
    </div>
  );
}
