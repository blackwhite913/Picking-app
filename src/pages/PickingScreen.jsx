import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBatchStore } from '../store';
import { pickingAPI, batchAPI } from '../api';
import { ChevronLeft, AlertCircle, Check, X, Package, ScanBarcode } from 'lucide-react';
import GetToteModal from '../components/GetToteModal';
import OrderCard from '../components/OrderCard';
import ConfirmModal from '../components/ConfirmModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { scannerService } from '../services/scanner';

export default function PickingScreen() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const {
    currentBatch,
    currentLocation,
    currentLocationIndex,
    locations,
    nextLocation,
    updateLineItem,
    refreshBatchData,
    toteAssignments,
    setToteAssignment,
    setBatch,
  } = useBatchStore();

  console.log(`[PickingScreen] RENDER. BatchId: ${batchId}, Loaded: ${!!currentBatch}, Loc: ${currentLocationIndex}`);
  if (currentBatch) {
    console.log(`[PickingScreen] CurrentLoc:`, currentLocation);
  }

  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [showToteModal, setShowToteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(false); // Visual flash state

  // Web Audio Context for error buzzer
  const playErrorSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // Louder/harsher than sawtooth
      osc.frequency.setValueAtTime(150, ctx.currentTime); // Low frequency
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3); // Pitch drop effect

      // Max volume
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);

      // Add vibration
      if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200ms
      }
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  };
  // Removed local toteAssignments state

  // Deep Link / Refresh Data Loading
  useEffect(() => {
    if (!currentBatch && batchId) {
      setLoading(true);
      batchAPI.getBatchDetails(batchId)
        .then(response => {
          setBatch(response.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load batch:", err);
          setError("Failed to load batch data. Please return to list.");
          setLoading(false);
        });
    }
  }, [batchId, currentBatch, setBatch]); // Depend on setBatch

  // Initialize active order when location changes
  useEffect(() => {
    if (currentLocation?.orders?.length > 0) {
      // Find the first order that isn't fully picked
      const firstIncompleteIndex = currentLocation.orders.findIndex(order => {
        // Check if any item in this order needs picking
        return order.items.some(item =>
          item.quantity_picked < item.quantity_required &&
          item.status !== 'oversized' &&
          item.status !== 'none_remaining'
        );
      });

      // Default to 0 if all are complete (or none found), otherwise use the found index
      const targetIndex = firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0;
      setActiveOrderIndex(targetIndex);

      // Only show tote modal if the TARGET order doesn't have a tote yet
      const targetOrder = currentLocation.orders[targetIndex];

      // Check if we've "verified" or "assigned" a tote for this session yet
      const hasSessionTote = toteAssignments[targetOrder.orderId];

      if (!hasSessionTote) {
        // If not verified in this session, show modal (either for new assignment or verification)
        // Only if the order actually ISN'T complete (otherwise we don't need a tote to look at a done order)
        const isTargetComplete = firstIncompleteIndex === -1;
        if (!isTargetComplete) {
          setShowToteModal(true);
        }
      }
    }
  }, [currentLocation?.location, currentLocationIndex]); // Only trigger on location change

  if (!currentBatch && loading) {
    return (
      <div className="flex min-h-full bg-warehouse-bg items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warehouse-blue"></div>
      </div>
    );
  }

  if (!currentBatch || !currentLocation) {
    return (
      <div className="flex min-h-full bg-warehouse-bg items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="text-warehouse-red mx-auto mb-4" size={48} />
          <h2 className="text-white text-xl font-bold mb-2">Batch Not Found</h2>
          <button
            onClick={() => navigate('/batches')}
            className="mt-4 px-6 py-3 bg-warehouse-blue text-white rounded-lg"
          >
            Back to Batches
          </button>
        </div>
      </div>
    );
  }

  // SAFEGUARDS: Ensure currentLocation.orders exists
  const orders = currentLocation.orders || [];

  // Safe Access to Active Order
  const activeOrder = orders[activeOrderIndex];

  // FIX: Robust Active Item Selection using Line Number (or at least strictly filtering incomplete)
  // We explicitly look for the FIRST item that is NOT complete.
  const activeItem = activeOrder ? (() => {
    const incompleteItem = activeOrder.items.find(item =>
      (item.quantity_picked || 0) < item.quantity_required &&
      item.status !== 'oversized' &&
      item.status !== 'none_remaining'
    );
    // If all complete, just show the last one (or first), doesn't matter much as we'll move order
    // Check if items exists just in case
    if (!activeOrder.items || activeOrder.items.length === 0) return null;
    return incompleteItem || activeOrder.items[activeOrder.items.length - 1];
  })() : null;

  // Check if current order is complete
  const isOrderComplete = activeOrder?.items?.every(item =>
    item.quantity_picked >= item.quantity_required ||
    item.status === 'oversized' ||
    item.status === 'none_remaining'
  ) ?? true;

  // Check if all orders at this location are complete
  const allOrdersComplete = orders.every(order =>
    order.items.every(item =>
      item.quantity_picked >= item.quantity_required ||
      item.status === 'oversized' ||
      item.status === 'none_remaining'
    )
  );

  /* SCANNER LISTENER - HIDDEN INPUT STRATEGY */
  const inputRef = useRef(null);
  const visibleInputRef = useRef(null); // Visible tiny input that scanners reliably target
  const focusableRef = useRef(null); // Non-input element we can focus without triggering keyboard
  const [isInputFocused, setIsInputFocused] = useState(false); // Track focus state
  const [showVisibleInput, setShowVisibleInput] = useState(false);
  const lastScanTimeRef = useRef(0); // Debounce ref

  // Ensure focus is always on the hidden input UNLESS a modal is open OR all orders are complete
  const isModalOpen = showToteModal || showConfirmModal || showImageModal;
  const shouldFocusInput = !isModalOpen && !allOrdersComplete;

  useEffect(() => {
    // If not valid to focus, blur if currently focused
    if (!shouldFocusInput) {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.blur();
      }
      return;
    }

    const focusInput = () => {
      // Create a "prevent scroll" option if supported or just standard focus
      // preventScroll is standard in modern browsers
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
        if (document.activeElement === inputRef.current) {
          setIsInputFocused(true);
        }
      }
    };

    focusInput();

    // We avoid programmatically focusing the hidden input to prevent the soft keyboard on Android devices.
    // Instead, we rely on the global keydown listener below to capture scanner input even when no input is focused.
    const handleClick = (e) => {
      if (isModalOpen || allOrdersComplete) return;

      // Don't interfere with interactive elements (including icons inside buttons)
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
        return;
      }

      // Mark scanner as 'ready' in the UI and ensure the page/window has focus without focusing an input
      console.log('[Scanner] Click detected - focusing hidden non-input element and attempting visible input');
      setIsInputFocused(true);

      if (focusableRef.current) {
        try {
          focusableRef.current.focus();
        } catch (err) {
          console.warn('[Scanner] Failed to focus focusableRef:', err);
        }
      }

      // Show and focus a tiny visible input that many HID scanners will target reliably (inputMode='none')
      try {
        setShowVisibleInput(true);
        setTimeout(() => {
          if (visibleInputRef.current) {
            try {
              visibleInputRef.current.focus();
            } catch (err) {
              console.warn('[Scanner] visibleInputRef.focus failed:', err);
            }
          }
          if (typeof window.focus === 'function') {
            try { window.focus(); } catch (err) { /* ignore */ }
          }
        }, 50);
      } catch (err) {
        console.warn('[Scanner] Error showing/focusing visible input:', err);
      }
    };

    window.addEventListener('click', handleClick);

    // If we should be ready to accept scans, focus a non-input element so HID keystrokes go to the page
    if (shouldFocusInput) {
      if (focusableRef.current) {
        try {
          focusableRef.current.focus();
          if (document.activeElement === focusableRef.current) {
            setIsInputFocused(true);
          }
        } catch (err) {
          console.warn('[Scanner] Failed to focus focusableRef on startup:', err);
          if (typeof window.focus === 'function') window.focus();
        }
      } else if (typeof window.focus === 'function') {
        window.focus();
      }
    }

    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [shouldFocusInput, isModalOpen, allOrdersComplete]);

  /* ROBUST GLOBAL SCANNER LISTENER (Backup for Focus Issues) */
  const scanBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // FIX STALE CLOSURE: Keep a ref to the latest processScan function
  // This ensures handleGlobalKeyDown always calls the freshest version with latest state
  const processScanRef = useRef(null);
  useEffect(() => {
    processScanRef.current = processScan;
  });

  /* SCANNER SERVICE LISTENER - DataWedge Intent Support */
  useEffect(() => {
    // Subscribe to scanner service for native DataWedge intents
    const unsubscribe = scannerService.addListener((scanData) => {
      console.log('[PickingScreen] Scan from scanner service:', scanData);
      
      // If modal is open, ignore (modal will handle its own scans)
      if (showToteModal || showConfirmModal || showImageModal) {
        return;
      }
      
      // Process the scan using the latest processScan function
      if (processScanRef.current) {
        processScanRef.current(scanData.barcode);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [showToteModal, showConfirmModal, showImageModal]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // If any modal is open, IGNORE global picking scans.
      // The modal itself (e.g. GetToteModal) has its own listener.
      if (showToteModal || showConfirmModal || showImageModal) {
        return;
      }

      // DEBUG: Log *every* key to overlay to prove we are receiving events
      setLastDebugKey(`KEY: ${e.key} (${Date.now() % 10000})`);

      // STRATEGY 2: GLOBAL LISTENER ALWAYS ACTIVE
      // We removed the check that ignored the event if our hidden input was focused.
      // Now, even if the hidden input captures the key, we ALSO capture it here to be safe.
      // (Scan buffer logic handles reassembly).

      // Ignore if focus is on a real input field (like manual quantity entry)
      // BUT exclude our own hidden `inputRef` from this exclusion check
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && document.activeElement !== inputRef.current) {
        return;
      }

      const char = e.key;
      const now = Date.now();

      // Reset buffer if too much time passed
      // Increased to 500ms for slower scanners
      if (now - lastKeyTime.current > 500) {
        scanBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (char === 'Enter') {
        if (scanBuffer.current.length > 0) {
          console.log('[GlobalScan] Buffer Flush:', scanBuffer.current);
          // Route through scanner service for unified handling
          scannerService.simulateScan(scanBuffer.current);
          setLastDebugKey(`Global Scan: ${scanBuffer.current}`);
          scanBuffer.current = '';
          e.preventDefault();
        }
      } else if (char.length === 1) {
        scanBuffer.current += char;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentLocation, activeItem, showToteModal, showConfirmModal, showImageModal]);

  const handleScannerInput = (e) => {
    // Debugging only - we trust the value in DOM
    console.log('Input Change:', e.target.value);
  };

  const handleScannerKeyDown = (e) => {
    console.log('[InputScan] KeyDown:', e.key, 'Value:', e.target.value);

    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      console.log('[InputScan] Enter pressed. Value:', val);

      if (val && val.length > 0) {
        // Route through scanner service for unified handling
        scannerService.simulateScan(val);
        e.target.value = ''; // Clear for next scan
        e.preventDefault();
      } else {
        console.warn('[InputScan] Empty value on Enter');
      }
    }
  };

  const [lastDebugKey, setLastDebugKey] = useState('');

  const processScan = (barcode) => {
    if (!barcode) return;

    // Explicitly update debug overlay with what we actually received
    setLastDebugKey(`PROCESSING: ${barcode}`);

    const now = Date.now();
    // Debounce: Ignore if we just scanned successfully < 1s ago
    if (now - lastScanTimeRef.current < 1000) {
      console.warn('Ignoring rapid duplicate scan');
      return;
    }
    lastScanTimeRef.current = now;

    console.log('Scanner Input:', barcode);

    // Normalize comparison
    const scanned = barcode.trim().toUpperCase();

    // RIGID SEARCH STRATEGY:
    // 1. Check if it matches an item in the *active order* (Success)
    // 2. Check if it matches an item in *another order* at this location (Error: Wrong Tote)
    // 3. Else (Error: Incorrect Barcode)

    let matchedItem = null;

    // Helper to check if item matches
    const checkItemMatch = (item) => {
      // Handle both camelCase (Backend) and snake_case (Legacy/DB) keys
      const pBarcode = (item.productBarcode || item.product_barcode || '').trim().toUpperCase();
      const pSku = (item.productSku || item.product_sku || '').trim().toUpperCase();

      return (pBarcode && scanned === pBarcode) || (pSku && scanned === pSku);
    };

    // 1. Search in Active Order
    if (activeOrder) {
      matchedItem = activeOrder.items.find(item => {
        // Only match if item is not fully picked
        const isComplete = (item.quantity_picked || 0) >= item.quantity_required;
        const isIgnored = item.status === 'oversized' || item.status === 'none_remaining';
        return !isIgnored && !isComplete && checkItemMatch(item);
      });
    }

    // 2. If not found, check other orders to give helpful "Wrong Tote" error
    if (!matchedItem && currentLocation && currentLocation.orders) {
      for (let oIdx = 0; oIdx < currentLocation.orders.length; oIdx++) {
        // Skip current active order (already checked)
        if (oIdx === activeOrderIndex) continue;

        const order = currentLocation.orders[oIdx];
        const found = order.items.find(item => {
          const isIgnored = item.status === 'oversized' || item.status === 'none_remaining';
          // Even if complete, if they scan it, it's the wrong tote context
          return !isIgnored && checkItemMatch(item);
        });

        if (found) {
          console.warn('[processScan] Item belonging to another order scanned!');
          setError(`Wrong Tote! This item is for order #${order.orderNumber} (Tote: ${order.toteNumber || 'Unknown'})`);
          setScanError(true);
          playErrorSound();
          setTimeout(() => setScanError(false), 500);
          return;
        }
      }
    }

    // DEBUG: Update overlay
    setLastDebugKey(`RX: ${barcode} | Match: ${matchedItem ? matchedItem.product_sku : 'NONE'}`);

    if (matchedItem) {
      console.log(`[processScan] Match Found! ID: ${matchedItem.id}`);

      // Determine max we can pick
      const remaining = matchedItem.quantity_required - (matchedItem.quantity_picked || 0);

      if (remaining > 0) {
        handlePickExplicit(matchedItem, 1, 'SCAN');
      } else {
        // Item is full (rarely reached here due to filter above, but safe to keep)
        console.warn('[processScan] Item full!', matchedItem);
        setError(`Item already fully picked! (${matchedItem.quantity_picked}/${matchedItem.quantity_required})`);
        setScanError(true);
        playErrorSound();
        setTimeout(() => setScanError(false), 500);
      }
    } else {
      setError(`Incorrect barcode: ${barcode}`);
      setScanError(true);
      playErrorSound();
      setTimeout(() => setScanError(false), 500);
    }
  };

  // New helper to pick a specific item since handlePick relies on 'activeItem' closure
  const handlePickExplicit = async (item, quantity, method = 'MANUAL') => {
    if (!item) return;

    // 1. Update Store Immediately
    const result = useBatchStore.getState().incrementLineItemQuantity(item.id, quantity);

    if (!result || !result.item) {
      if (result && result.warning === 'QUANTITY_EXCEEDED') {
        setError(`Cannot pick more than required! Max: ${result.max}`);
        return;
      }
      return;
    }

    const { item: updatedItem, orderComplete } = result;
    const previousStatus = item.status;
    const previousPicked = item.quantity_picked || 0;

    // 2. Check if order complete
    if (orderComplete) {
      // Determine the index of the order this item belongs to
      // We can find it in currentLocation.orders
      const orderIndex = currentLocation.orders.findIndex(o => o.orderId === item.order_id);
      if (orderIndex !== -1) {
        setTimeout(() => {
          moveToNextOrder(orderIndex);
        }, 300);
      }
    }

    try {
      await pickingAPI.confirmPick(batchId, item.id, {
        quantity: quantity,
        location: currentLocation.location,
        method: method
      });

      // Success - sync
      updateLineItem(item.id, {
        quantity_picked: updatedItem.quantity_picked,
        status: updatedItem.status
      });

    } catch (err) {
      console.error('Error in handlePickExplicit:', err);
      updateLineItem(item.id, {
        quantity_picked: previousPicked,
        status: previousStatus
      });
      setError(err.response?.data?.message || 'Failed to confirm pick');
    }
  };


  const handleGetTote = async (toteBarcode) => {
    try {
      setLoading(true);
      setError('');

      // If verifying an existing tote, we don't need to call the API to "get" it again, just store it locally
      if (activeOrder.toteBarcode && activeOrder.toteBarcode === toteBarcode) {
        setToteAssignment(activeOrder.orderId, toteBarcode);
        setShowToteModal(false);
        setLoading(false);
        return;
      }

      const response = await pickingAPI.getToteForOrder(batchId, activeOrder.orderId, { toteBarcode });

      // Store tote assignment with barcode returned from backend
      const returnedToteBarcode = response.data.toteBarcode;

      setToteAssignment(activeOrder.orderId, returnedToteBarcode);

      setShowToteModal(false);
      setLoading(false); // Ensure loading is set to false to enable picking controls
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign tote');
      setLoading(false); // Also set loading to false on error
    }
  };

  const handlePickOne = async () => {
    console.log('[PickingScreen] Pick 1 Triggered. ActiveItem:', activeItem);
    await handlePick(1, 'MANUAL');
  };

  const handlePickQuantity = async (quantity) => {
    await handlePick(quantity);
  };

  /* OPTIMISTIC UPDATE: Pick Logic */
  const handlePick = async (quantity, method = 'MANUAL') => {
    if (!activeItem) {
      console.error("[handlePick] No active item!");
      return;
    }

    // 1. Update Store Immediately (Optimistic UI)
    const result = useBatchStore.getState().incrementLineItemQuantity(activeItem.id, quantity);

    if (!result || !result.item) {
      if (result && result.warning === 'QUANTITY_EXCEEDED') {
        setError(`Cannot pick more than required! Max: ${result.max}`);
        // Optionally vibrate or play sound here
        return;
      }
      console.error("Failed to find item to increment");
      return;
    }

    const { item: updatedItem, orderComplete } = result;
    const previousStatus = activeItem.status;
    const previousPicked = activeItem.quantity_picked || 0;

    // 3. Move to next order immediately if this order is now done
    if (orderComplete) {
      // Small delay to let the UI update show "2/2" or "Picked" before switching
      setTimeout(() => {
        moveToNextOrder(activeOrderIndex);
      }, 300);
    }

    try {
      // 4. Send API Request in Background
      const response = await pickingAPI.confirmPick(batchId, activeItem.id, {
        quantity: quantity,
        location: currentLocation.location,
        method: method
      });

      // 5. Success - Sync with backend truth
      if (response.data) {
        updateLineItem(activeItem.id, {
          quantity_picked: response.data.quantityPicked,
          status: response.data.status === 'PICKED' ? 'picked' : 'picking'
        });
      }

    } catch (err) {
      console.error('Error in handlePick:', err);

      // 6. Revert on Error
      updateLineItem(activeItem.id, {
        quantity_picked: previousPicked,
        status: previousStatus
      });

      setError(err.response?.data?.message || 'Failed to confirm pick - reverting');
    }
  };

  /* HELPER: Move to next order */
  const moveToNextOrder = (fromIndex) => {
    // 1. Determine starting point
    const currentIdx = typeof fromIndex === 'number' ? fromIndex : activeOrderIndex;

    // 2. Find next incomplete order
    // Start searching from the immediate next index
    let targetIndex = currentIdx + 1;
    let foundTarget = false;

    while (targetIndex < currentLocation.orders.length) {
      const order = currentLocation.orders[targetIndex];

      // Check if this order has ANY remaining work (unavailable items don't count)
      const isOrderComplete = order.items.every(item =>
        item.quantity_picked >= item.quantity_required ||
        item.status === 'oversized' ||
        item.status === 'none_remaining'
      );

      if (!isOrderComplete) {
        foundTarget = true;
        break; // Stop, we found an order that needs picking
      }

      // If complete, skip to next
      targetIndex++;
    }

    // 3. Execute Move
    if (foundTarget) {
      setActiveOrderIndex(targetIndex);

      // Check for tote assignment on this new order
      const nextOrder = currentLocation.orders[targetIndex];
      const currentState = useBatchStore.getState();
      const hasTote = currentState.toteAssignments[nextOrder.orderId];

      if (!hasTote) {
        setShowToteModal(true);
      }
    } else {
      // No incomplete orders found ahead.
      // Set to last index to ensure UI shows "Next Location" button
      const lastIndex = currentLocation.orders.length - 1;
      if (activeOrderIndex !== lastIndex) {
        setActiveOrderIndex(lastIndex);
      }
    }
  };

  const handleMarkOversized = async () => {
    // 1. Optimistic Update
    const previousStatus = activeItem.status;

    updateLineItem(activeItem.id, {
      status: 'oversized',
      is_oversized: true
    });

    checkAndMoveToNextOrder(activeOrderIndex);

    try {
      await pickingAPI.markOversized(batchId, activeItem.id, {
        location: currentLocation.location,
        quantity: 1,
      });
    } catch (err) {
      // Revert
      updateLineItem(activeItem.id, {
        status: previousStatus,
        is_oversized: false
      });
      setError(err.response?.data?.message || 'Failed to mark oversized');
    }
  };

  const handleNoneRemaining = () => {
    setConfirmModalConfig({
      title: 'None Remaining?',
      message: `Are you sure there are no more "${activeItem.product_name}" items available?`,
      onConfirm: confirmNoneRemaining,
    });
    setShowConfirmModal(true);
  };

  const confirmNoneRemaining = async () => {
    try {
      setLoading(true);
      setError('');

      await pickingAPI.markNoneRemaining(batchId, activeItem.id, {
        notes: 'Out of stock',
      });

      setShowConfirmModal(false);

      // Refresh batch data from server to ensure sync
      const freshBatch = await batchAPI.getBatchDetails(batchId);
      refreshBatchData(freshBatch.data);

      // Check if we should move to next order
      setTimeout(() => {
        const currentState = useBatchStore.getState();
        const freshActiveOrder = currentState.currentLocation?.orders?.[activeOrderIndex];

        if (freshActiveOrder) {
          // Check if ALL items in this order are complete
          const allItemsInOrderComplete = freshActiveOrder.items.every(item =>
            item.quantity_picked >= item.quantity_required ||
            item.status === 'oversized' ||
            item.status === 'none_remaining'
          );

          if (allItemsInOrderComplete) {
            moveToNextOrder();
          }
        }
      }, 300);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark none remaining');
    } finally {
      setLoading(false);
    }
  };



  const handleNextLocation = async () => {
    const hasNext = nextLocation();

    if (hasNext) {
      setActiveOrderIndex(0);
      // Only show tote modal if first order at new location doesn't have one
      setTimeout(() => {
        const firstOrder = currentLocation?.orders?.[0];
        if (firstOrder) {
          const hasSessionTote = toteAssignments[firstOrder.orderId];
          if (!hasSessionTote) {
            setShowToteModal(true);
          }
        }
      }, 100);
    } else {
      // All locations complete - complete the batch and go directly to summary
      try {
        setLoading(true);
        await batchAPI.completeBatch(batchId);

        // Navigate to batch complete screen
        // Note: We're skipping the tote routing step as requested
        navigate('/batch-complete', {
          state: {
            productionCount: 0, // Backend handles routing automatically
            finalFindCount: 0
          }
        });
      } catch (err) {
        console.error('Failed to complete batch:', err);
        setError('Failed to complete batch. Please try again.');
        setLoading(false);
      }
    }
  };

  // Get the tote display (from assignment or from order data)
  const toteAssignment = toteAssignments[activeOrder?.orderId];
  const displayTote = toteAssignment?.toteBarcode || activeOrder?.toteBarcode;

  return (
    <ErrorBoundary>
      <div className="flex min-h-full bg-warehouse-bg flex-col">
        {/* Compact Header */}
        <div className="bg-warehouse-gray-dark px-4 py-2 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/batches')}
              className="p-1 -ml-1 text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-2">
                <p className="text-warehouse-gray-light text-xs">
                  Location {currentLocationIndex + 1} of {locations?.length}
                </p>
              </div>
              <div className="w-full bg-warehouse-gray-medium h-1 rounded-full mt-0.5">
                <div
                  className="bg-warehouse-blue h-1 rounded-full transition-all"
                  style={{
                    width: `${((currentLocationIndex + 1) / locations.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="w-6" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Compact Tote & Location Banner */}
          <div className="bg-warehouse-blue px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white/80 text-xs">TOTE</p>
                <p className="text-white text-3xl font-bold tracking-wider">
                  {displayTote || '---'}
                </p>
              </div>
              <div className="text-right flex-1 border-l-2 border-white/20 pl-4">
                <p className="text-white/80 text-xs">LOCATION</p>
                <p className="text-warehouse-yellow text-3xl font-bold tracking-wider">
                  {currentLocation.location || 'UNKNOWN'}
                </p>
              </div>
            </div>
          </div>

          {/* Product Info with Larger Image */}
          <div className="bg-warehouse-gray-dark px-4 py-3 border-b border-warehouse-gray-medium">
            <div className="flex items-start space-x-4">
              {(activeItem?.productImageUrl || currentLocation.imageUrl) ? (
                <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowImageModal(true)}>
                  <img
                    src={activeItem?.productImageUrl || currentLocation.imageUrl}
                    alt={activeItem?.productName || currentLocation.productName}
                    className="w-full h-full object-contain p-2"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error('Image Load Error:', activeItem?.productImageUrl, e);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                      <div class="w-full h-full flex flex-col items-center justify-center bg-gray-800 p-2 text-center border-2 border-red-500 rounded-lg">
                         <p class="text-red-500 font-bold text-xs">LOAD ERROR</p>
                      </div>
                    `;
                    }}
                  />
                </div>
              ) : (
                <div className="w-40 h-40 bg-warehouse-gray-medium rounded-lg flex flex-col items-center justify-center flex-shrink-0 border-2 border-yellow-500">
                  <Package className="text-yellow-500 mb-2" size={32} />
                  <p className="text-yellow-500 font-bold text-xs">NO IMAGE URL</p>
                  <p className="text-gray-500 text-[8px] text-center px-1">SKU: {activeItem?.productSku || currentLocation.sku || 'N/A'}</p>
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-white text-lg font-bold mb-1">
                  {activeItem?.productName || currentLocation.productName}
                </h2>
                <div className="flex items-center space-x-2 text-warehouse-gray-light text-sm">
                  <span>SKU: {activeItem?.productSku || currentLocation.sku}</span>
                  {activeItem?.line_number && (
                    <span className="bg-warehouse-gray-medium px-1.5 rounded text-xs text-white border border-gray-600">
                      Line #{activeItem.line_number}
                    </span>
                  )}
                </div>
                <div className={`flex items-center mt-1 text-xs font-semibold ${isInputFocused ? 'text-warehouse-green animate-pulse' : 'text-warehouse-red'}`}>
                  <ScanBarcode size={14} className="mr-1" />
                  {isInputFocused ? 'READY TO SCAN' : 'TAP TO SCAN'}
                </div>

                {/* Force Next Order Button (Debug/Recovery) */}

              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-4 my-2 bg-warehouse-red/20 border border-warehouse-red rounded-lg p-2">
              <p className="text-warehouse-red text-xs">{error}</p>
            </div>
          )}

          {/* Orders List */}
          <div className="px-4 space-y-2 my-2">
            {orders.map((order, index) => {
              const isThisOrderActive = index === activeOrderIndex;

              // Create a dynamic key that changes when items are picked
              // This forces OrderCard to re-mount and recalculate which item to show
              const itemsState = order.items.map(i => `${i.id}:${i.quantity_picked}:${i.status}`).join('|');
              const dynamicKey = `${order.orderId}-${itemsState}`;

              return (
                <OrderCard
                  key={dynamicKey}
                  order={order}
                  isActive={isThisOrderActive}
                  onPickOne={() => {
                    console.log('[PickingScreen] onPickOne called for order:', order.orderNumber);
                    console.log('Active item:', activeItem);
                    console.log('Loading state:', loading);
                    handlePickOne();
                  }}
                  onPickQuantity={(qty) => {
                    console.log('[PickingScreen] onPickQuantity called:', qty);
                    handlePickQuantity(qty);
                  }}
                  onNoneRemaining={() => {
                    console.log('[PickingScreen] onNoneRemaining called');
                    handleNoneRemaining();
                  }}
                  disabled={loading}
                />
              );
            })}
          </div>

          {/* Next Pick Preview - Show while picking OR when done (to plan move) */}
          {locations && locations[currentLocationIndex + 1] && (
            <div className="mt-4 bg-gray-900 border-t-4 border-yellow-500 pb-safe shadow-2xl">
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center text-gray-400 text-xs font-bold uppercase mb-1 space-x-2">
                    <span>NEXT ITEM PREVIEW</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                    <span className="text-blue-400 text-sm">{locations[currentLocationIndex + 1].location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-base font-bold truncate">
                        {locations[currentLocationIndex + 1].productName}
                      </p>
                      <p className="text-gray-400 text-xs truncate font-mono mt-0.5">
                        SKU: {locations[currentLocationIndex + 1].sku}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Image */}
                {locations[currentLocationIndex + 1].imageUrl ? (
                  <div className="w-12 h-12 bg-white rounded-md overflow-hidden flex-shrink-0 border border-gray-600">
                    <img
                      src={locations[currentLocationIndex + 1].imageUrl}
                      alt="Next"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center border border-gray-600">
                    <Package className="text-gray-500 h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Next Location Button */}
        <div className="flex-none p-4 bg-warehouse-bg border-t border-warehouse-gray-dark">
          {allOrdersComplete && (
            <button
              onClick={handleNextLocation}
              className="w-full py-4 bg-warehouse-green text-white text-lg font-bold rounded-lg hover:bg-green-600 active:bg-green-700 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>Next Location</span>
              <Check size={20} />
            </button>
          )}
        </div>



        {/* Modals */}
        {showToteModal && (
          <GetToteModal
            orderNumber={activeOrder?.orderNumber}
            customer={activeOrder?.customer}
            expectedTote={activeOrder?.toteBarcode}
            onConfirm={handleGetTote}
            onClose={() => setShowToteModal(false)}
          />
        )}

        {showConfirmModal && confirmModalConfig && (
          <ConfirmModal
            title={confirmModalConfig.title}
            message={confirmModalConfig.message}
            onConfirm={confirmModalConfig.onConfirm}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}

        {/* Image Modal */}
        {/* Image Modal */}
        {showImageModal && (activeItem?.productImageUrl || currentLocation.imageUrl) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative w-[90vw] max-w-sm flex flex-col gap-4">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X size={32} />
              </button>

              {/* Image Container */}
              <div className="w-full aspect-square bg-white rounded-lg p-2 flex items-center justify-center overflow-hidden shadow-2xl">
                <img
                  src={activeItem?.productImageUrl || currentLocation.imageUrl}
                  alt={activeItem?.productName || currentLocation.productName}
                  className="w-full h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Text Details (Below Image) */}
              <div className="text-center text-white">
                <p className="font-bold text-xl leading-tight mb-1">{activeItem?.productName || currentLocation.productName}</p>
                <p className="text-sm text-gray-400 font-mono">SKU: {activeItem?.productSku || currentLocation.sku}</p>
              </div>
            </div>
          </div>
        )}

        {/* Focus Lost Warning / Recovery Overlay (DISABLED)
        {!isInputFocused && shouldFocusInput && (
          <div
            className="fixed inset-0 z-[99] bg-black/50 flex items-center justify-center cursor-pointer"
            onClick={() => {
              // Focus a non-input element and the window so HID keystrokes are delivered without opening the keyboard
              console.log('[Scanner] User tapped overlay - focusing hidden non-input and window');
              setIsInputFocused(true);
              try {
                if (focusableRef && focusableRef.current) focusableRef.current.focus();
              } catch (err) {
                console.warn('[Scanner] focusableRef.focus failed:', err);
              }
              try { if (typeof window.focus === 'function') window.focus(); } catch (err) { console.warn('[Scanner] window.focus failed:', err); }
            }}
          >
            <div className="bg-white p-6 rounded-xl shadow-2xl text-center animate-bounce">
              <ScanBarcode size={48} className="mx-auto text-warehouse-blue mb-2" />
              <h3 className="text-xl font-bold text-gray-800">Scanner Disconnected</h3>
              <p className="text-gray-600">Tap to acknowledge. Then scan a tote (no keyboard needed).</p>
            </div>
          </div>
        )}
        */}

        {/* Tiny visible input used to accept HID keystrokes without requiring the tote modal */}
        {showVisibleInput && (
          <input
            ref={visibleInputRef}
            type="text"
            inputMode="none" /* Prevents keyboard on many devices */
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="fixed top-2 left-2 w-1 h-1 opacity-0 z-[10000]"
            style={{
              position: 'fixed',
              top: '8px',
              left: '8px',
              width: '1px',
              height: '1px',
              opacity: 0,
              zIndex: 10000,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onKeyDown={handleScannerKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
        )}

        {/* Hidden non-input focus target (used to give the page focus for HID scanners) */}
        <div
          ref={focusableRef}
          tabIndex={-1}
          aria-hidden="true"
          onFocus={() => {
            console.log('[Scanner] focusableRef focused');
            setIsInputFocused(true);
          }}
          onBlur={() => {
            console.log('[Scanner] focusableRef blurred');
            setIsInputFocused(false);
          }}
          style={{
            position: 'fixed',
            top: '-100px',
            left: '-100px',
            width: '1px',
            height: '1px',
            opacity: 0,
            zIndex: -1,
            pointerEvents: 'none'
          }}
        />

        {/* Hidden Scanner Input - readOnly to prevent software keyboard on scanning devices */}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          inputMode="none"  /* Prevents mobile keyboard where supported */
          readOnly={true}     /* Prevents software keyboard from appearing on mobile devices */
          tabIndex={-1}
          className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
          style={{
            position: 'fixed',
            top: '-100px',
            left: '-100px',
            width: '1px',
            height: '1px',
            opacity: 0,
            zIndex: -1
          }}
          onKeyDown={handleScannerKeyDown}
          onChange={(e) => {
            // Log for debugging
            console.log('[Input] onChange (readonly):', e.target.value);
          }}
          onBlur={() => {
            console.log('[Input] Lost focus');
            setIsInputFocused(false);
          }}
          onFocus={() => {
            console.log('[Input] Gained focus (readonly)');
            setIsInputFocused(true);
          }}
        />

        {/* Red Screen Flash for Errors */}
        <div
          className={`fixed inset-0 bg-red-500 z-[9999] pointer-events-none transition-opacity duration-200 ${scanError ? 'opacity-30' : 'opacity-0'}`}
        />
      </div>
    </ErrorBoundary>
  );
}
