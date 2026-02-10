import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBatchStore, useToteStore } from '../store';
import { pickingAPI, batchAPI } from '../api';
import { Package, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { scannerService } from '../services/scanner';

export default function ToteRouting() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const { currentBatch, locations, toteAssignments } = useBatchStore();
  const clearBatch = useBatchStore((state) => state.clearBatch);
  const { routedTotes, addRoutedTote, clearRoutedTotes } = useToteStore();

  const [totes, setTotes] = useState({ production: [], finalFind: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // SEQUENTIAL ROUTING STATE
  const [activeTote, setActiveTote] = useState(null); // The tote currently being routed { identifier, orderId }
  const [globalInput, setGlobalInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (locations && locations.length > 0) {
      organizeTotes();
    }
  }, [locations, toteAssignments]); // Re-run if assignments change

  // Move handleComplete up so it's defined before usage
  const handleComplete = async () => {
    try {
      setLoading(true);
      await batchAPI.completeBatch(batchId);
      clearBatch();
      clearRoutedTotes();
      navigate('/batch-complete', {
        state: {
          productionCount: totes.production.length,
          finalFindCount: totes.finalFind.length
        }
      });
    } catch (err) {
      setError('Failed to complete batch');
      setLoading(false); // Ensure loading is reset on error
    }
  };

  // Scanner service listener for native DataWedge intents
  useEffect(() => {
    const unsubscribe = scannerService.addListener((scanData) => {
      console.log('[ToteRouting] Scan from scanner service:', scanData);
      // Simulate setting the input and processing it
      processInput(scanData.barcode);
    });

    return () => {
      unsubscribe();
    };
  }, [activeTote, totes, routedTotes]); // Include dependencies used in processInput

  // Keep focus on global input
  useEffect(() => {
    const focusInput = () => {
      // Only focus if we are NOT navigating away (loading check helps, but also explicit check)
      if (!loading && inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 2000); // Re-focus periodically if lost
    return () => clearInterval(interval);
  }, [loading, activeTote]);

  // Auto-complete check
  useEffect(() => {
    const totalTotes = totes.production.length + totes.finalFind.length;
    // console.log(`[Auto-Complete Check] Routed: ${routedTotes.length} / ${totalTotes}, Loading: ${loading}`);

    if (totalTotes > 0 && routedTotes.length >= totalTotes && !loading) {
      console.log('✅ Auto-completing batch...');
      handleComplete();
    }
  }, [routedTotes, totes, loading]); // Added loading to dependencies to retry if needed, though mostly routedTotes triggers it


  const organizeTotes = () => {
    // Collect all unique orders from all locations
    const orderMap = new Map();

    console.log('🔍 Organizing totes from locations:', locations);

    // Merge batch-level totes with local session assignments
    // Local assignments take precedence as they are "fresh" from the picking session
    const finalToteMap = {};

    // 1. Start with server-provided assignments
    if (currentBatch?.totes) {
      currentBatch.totes.forEach(tote => {
        if (tote.orderId) {
          finalToteMap[tote.orderId] = tote.toteBarcode;
        }
      });
    }

    // 2. Override with local assignments (what the user just scanned)
    if (toteAssignments) {
      Object.entries(toteAssignments).forEach(([orderId, data]) => {
        if (data?.toteBarcode) {
          finalToteMap[orderId] = data.toteBarcode;
        }
      });
    }

    locations.forEach(location => {
      // console.log(`\n📍 Location: ${location.location}`);

      location.orders.forEach(order => {
        if (!orderMap.has(order.orderId)) {

          // Get correct tote barcode
          const correctBarcode = finalToteMap[order.orderId] || order.toteBarcode;

          orderMap.set(order.orderId, {
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            customer: order.customer,
            toteBarcode: correctBarcode, // Use the resolved barcode
            hasIssues: false,
            items: []
          });
        }

        const orderData = orderMap.get(order.orderId);

        // Add items and check for issues
        order.items.forEach(item => {
          orderData.items.push(item);

          console.log(`  📦 Item: ${item.product_name}`, {
            status: item.status,
            picked: item.quantity_picked,
            required: item.quantity_required,
            isOversized: item.is_oversized,
            incomplete: item.quantity_picked < item.quantity_required
          });

          // Check if this item has issues (NOT including oversized - that's complete)
          const isNoneRemaining = item.status === 'none_remaining';
          const isIncomplete = item.quantity_picked < item.quantity_required && item.status !== 'oversized';

          if (isNoneRemaining || isIncomplete) {
            console.log(`    ⚠️  HAS ISSUES: noneRemaining=${isNoneRemaining}, incomplete=${isIncomplete}`);
            orderData.hasIssues = true;
          } else {
            console.log(`    ✅ No issues${item.is_oversized ? ' (oversized but complete)' : ''}`);
          }
        });
      });
    });

    // Split into production and final find
    const production = [];
    const finalFind = [];

    Array.from(orderMap.values()).forEach(order => {
      console.log(`\n🎯 Order ${order.orderNumber}:`, {
        hasIssues: order.hasIssues,
        destination: order.hasIssues ? 'FINAL FIND' : 'PRODUCTION',
        toteBarcode: order.toteBarcode
      });

      if (order.hasIssues) {
        finalFind.push(order);
      } else {
        production.push(order);
      }
    });

    console.log('\n📊 FINAL SPLIT:');
    console.log(`  🟢 Production: ${production.length} orders`);
    console.log(`  🔴 Final Find: ${finalFind.length} orders`);

    setTotes({ production, finalFind });
  };

  // CORE SEQUENTIAL LOGIC
  const processInput = async (input) => {
    const cleanInput = input.trim().toUpperCase();
    if (!cleanInput) return;

    // SCENARIO 1: We are waiting for a Location (Active Tote is selected)
    if (activeTote) {
      console.log(`[Sequential] Active Tote ${activeTote.identifier} selected. Input is assumed Location: ${cleanInput}`);

      try {
        setLoading(true);
        setError('');

        // Call API
        await pickingAPI.scanTote(batchId, {
          toteBarcode: activeTote.identifier,
          location: cleanInput, // Input is location
        });

        // Success
        addRoutedTote({
          toteBarcode: activeTote.identifier,
          orderId: activeTote.orderId,
          destination: activeTote.destination,
          location: cleanInput
        });

        // Reset state
        setActiveTote(null);
        setGlobalInput(''); // Clear input

      } catch (err) {
        console.error('❌ Scan failed:', err);
        setError(err.response?.data?.message || 'Failed to scan location');
        // Keep active tote selected so they can try again
      } finally {
        setLoading(false);
      }
      return;
    }

    // SCENARIO 2: We are waiting for a Tote (No active tote)
    // Check if input matches a known tote
    const allTotes = [...totes.production, ...totes.finalFind];
    const matchedTote = allTotes.find(t => {
      const tBarcode = t.toteBarcode ? t.toteBarcode.toUpperCase() : '';
      const tGenerated = `TOTE-${t.orderId.substring(0, 8)}`.toUpperCase();
      return cleanInput === tBarcode || cleanInput === tGenerated || cleanInput === t.orderId;
    });

    if (matchedTote) {
      if (isToteScanned(matchedTote.orderId)) {
        setError(`Tote ${cleanInput} is already routed.`);
        setGlobalInput('');
        return;
      }

      console.log(`[Sequential] Matched Tote:`, matchedTote);
      setActiveTote({
        identifier: matchedTote.toteBarcode || `TOTE-${matchedTote.orderId.substring(0, 8)}`,
        orderId: matchedTote.orderId,
        destination: matchedTote.hasIssues ? 'manager' : 'production'
      });
      setGlobalInput(''); // Clear input so they can scan location next
      setError('');
    } else {
      // Unknown input - maybe they scanned a location first by mistake?
      setError(`Unknown Tote: ${cleanInput}. Please scan a tote first.`);
      setGlobalInput('');
    }
  };

  const handleManualSelect = (tote) => {
    setActiveTote({
      identifier: tote.toteBarcode || `TOTE-${tote.orderId.substring(0, 8)}`,
      orderId: tote.orderId,
      destination: tote.hasIssues ? 'manager' : 'production'
    });
    setGlobalInput('');
    setError('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      processInput(globalInput);
    }
  };

  const allTotesScanned = () => {
    const totalTotes = totes.production.length + totes.finalFind.length;
    return routedTotes.length >= totalTotes;
  };

  const isToteScanned = (orderId) => {
    return routedTotes.some(t => t.toteBarcode === orderId || t.orderId === orderId);
  };



  const totalTotes = totes.production.length + totes.finalFind.length;
  const scannedCount = routedTotes.length;

  return (
    <div className="flex min-h-full bg-warehouse-bg flex-col">
      {/* Header */}
      <div className="bg-warehouse-gray-dark px-6 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/batches')}
            className="p-2 -ml-2 text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-right">
            <div className="text-warehouse-blue font-bold text-lg">
              {scannedCount} / {totalTotes}
            </div>
            <div className="text-warehouse-gray-light text-xs">Totes Routed</div>
          </div>
        </div>

        {/* Global Input & Instructions */}
        <div className="space-y-3">
          <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${activeTote ? 'bg-warehouse-blue/20 border-warehouse-blue' : 'bg-warehouse-gray-medium/50 border-warehouse-gray-light'}`}>
            {activeTote ? (
              <div className="w-8 h-8 rounded-full bg-warehouse-blue flex items-center justify-center animate-pulse">
                <span className="text-white font-bold">2</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-warehouse-gray-light flex items-center justify-center">
                <span className="text-warehouse-gray-dark font-bold">1</span>
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-lg">
                {activeTote ? `Scan Location for ${activeTote.identifier}` : 'Scan Next Tote'}
              </h2>
              <p className="text-warehouse-gray-light text-sm">
                {activeTote ? 'Where are you placing this tote?' : 'Scan tote barcode or tap card below'}
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="text"
            inputMode="none" // Suppress virtual keyboard
            value={globalInput}
            onChange={(e) => setGlobalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTote ? "Scan Location Barcode..." : "Scan Tote Barcode..."}
            className={`w-full px-4 py-4 text-xl rounded-lg border-2 focus:outline-none transition-all ${activeTote
              ? 'bg-warehouse-blue/10 border-warehouse-blue text-white placeholder-warehouse-blue/50'
              : 'bg-warehouse-gray-medium text-white border-transparent focus:border-warehouse-gray-light'
              }`}
            autoFocus
          />
        </div>
      </div>

      {/* Error Message + Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-6 mt-4 bg-warehouse-red/20 border border-warehouse-red rounded-lg p-4">
            <p className="text-warehouse-red text-sm">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">
        {/* Final Find Section */}
        {totes.finalFind.length > 0 && (
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-warehouse-red rounded-full flex items-center justify-center">
                <AlertCircle className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Warehouse Manager</h2>
                <p className="text-warehouse-gray-light text-sm">Final Find - Items Missing</p>
              </div>
            </div>

            <div className="space-y-3">
              {totes.finalFind.map((order) => {
                const identifier = order.toteBarcode || `TOTE-${order.orderId.substring(0, 8)}`;
                const isActive = activeTote?.orderId === order.orderId;

                return (
                  <ToteCard
                    key={order.orderId}
                    order={order}
                    destination="manager"
                    color="red"
                    isScanned={isToteScanned(order.orderId)}
                    isActive={isActive}
                    onSelect={() => handleManualSelect(order)}
                    disabled={loading || (activeTote && !isActive)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Production Section */}
        {totes.production.length > 0 && (
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-warehouse-green rounded-full flex items-center justify-center">
                <Package className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Production Studio</h2>
                <p className="text-warehouse-gray-light text-sm">Ready to Pack</p>
              </div>
            </div>

            <div className="space-y-3">
              {totes.production.map((order) => {
                const identifier = order.toteBarcode || `TOTE-${order.orderId.substring(0, 8)}`;
                const isActive = activeTote?.orderId === order.orderId;

                return (
                  <ToteCard
                    key={order.orderId}
                    order={order}
                    destination="production"
                    color="green"
                    isScanned={isToteScanned(order.orderId)}
                    isActive={isActive}
                    onSelect={() => handleManualSelect(order)}
                    disabled={loading || (activeTote && !isActive)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {totalTotes === 0 && (
          <div className="text-center py-12">
            <Package className="text-warehouse-gray-medium mx-auto mb-4" size={48} />
            <h2 className="text-white text-xl font-semibold mb-2">No Totes to Route</h2>
            <p className="text-warehouse-gray-light">All items have been processed</p>
          </div>
        )}
        </div>
      </div>

      {/* Complete Button */}
      <div className="flex-none p-6 bg-warehouse-bg border-t border-warehouse-gray-dark">
        {allTotesScanned() && totalTotes > 0 && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full min-h-touch bg-warehouse-green text-white text-xl font-bold rounded-lg hover:bg-green-600 active:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <CheckCircle size={24} />
            <span>Complete Batch</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ToteCard({ order, destination, color, isScanned, isActive, onSelect, disabled }) {
  const colorClasses = {
    red: {
      border: 'border-warehouse-red',
      bg: 'bg-warehouse-red/10',
      activeBg: 'bg-warehouse-red/20',
      button: 'bg-warehouse-red',
      text: 'text-warehouse-red'
    },
    green: {
      border: 'border-warehouse-green',
      bg: 'bg-warehouse-green/10',
      activeBg: 'bg-warehouse-green/20',
      button: 'bg-warehouse-green',
      text: 'text-warehouse-green'
    }
  };

  const colors = colorClasses[color];
  const displayTote = order.toteBarcode || `TOTE-${order.orderId.substring(0, 8)}`;

  // COMPLETED STATE
  if (isScanned) {
    return (
      <div className={`border ${colors.border} ${colors.bg} rounded p-3 opacity-60 flex items-center justify-between transition-all duration-300`}>
        <div className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colors.button}`}>
            <CheckCircle className="text-white" size={14} />
          </div>
          <div>
            <span className="text-white font-bold text-sm block">{displayTote}</span>
            <span className="text-warehouse-gray-light text-xs block">{order.customer}</span>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE / PENDING STATE
  return (
    <div
      onClick={() => !disabled && !isActive && onSelect()}
      className={`
            relative rounded-lg p-4 border-2 transition-all duration-200
            ${isActive
          ? `${colors.border} ${colors.activeBg} scale-[1.02] shadow-lg ring-2 ring-offset-2 ring-offset-warehouse-bg ring-${color === 'red' ? 'red-500' : 'green-500'}`
          : `${colors.border} ${colors.bg} ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:scale-[1.01] cursor-pointer hover:brightness-110'}`
        }
        `}
    >
      <div className="flex justify-between items-start">
        <div className="mb-1">
          <p className="text-white font-bold text-xl mb-1 flex items-center gap-2">
            {displayTote}
            {isActive && (
              <span className="text-xs bg-white text-black px-2 py-0.5 rounded-full animate-pulse">
                Active
              </span>
            )}
          </p>
          <p className="text-warehouse-gray-light">{order.customer}</p>
          <p className="text-warehouse-gray-light text-sm">{order.orderNumber}</p>
        </div>

        {!isActive && !disabled && (
          <div className={`p-2 rounded-full bg-white/10`}>
            <Package size={20} className="text-white" />
          </div>
        )}
      </div>

      {order.hasIssues && (
        <div className="bg-warehouse-red/20 rounded px-3 py-2 mt-2">
          <p className="text-warehouse-red text-xs font-semibold flex items-center gap-1">
            <AlertCircle size={12} />
            Has missing or incomplete items
          </p>
        </div>
      )}

      {isActive && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-white text-sm font-semibold flex items-center gap-2 animate-pulse">
            Waiting for location scan...
          </p>
        </div>
      )}
    </div>
  );
}
