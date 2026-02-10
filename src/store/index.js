import { create } from 'zustand';

// Auth Store (with localStorage persistence)
export const useAuthStore = create((set) => {
  // Load from localStorage on init
  const storedAuth = localStorage.getItem('auth-storage');
  const storedToken = localStorage.getItem('auth_token');
  const initialState = storedAuth ? JSON.parse(storedAuth) : {
    user: null,
    token: storedToken,
    isAuthenticated: !!storedToken
  };

  return {
    ...initialState,

    setAuth: (user, token) => {
      const newState = {
        user,
        token,
        isAuthenticated: true
      };
      set(newState);
      localStorage.setItem('auth-storage', JSON.stringify(newState));
      localStorage.setItem('auth_token', token); // Sync for API use
    },

    logout: () => {
      const newState = {
        user: null,
        token: null,
        isAuthenticated: false
      };
      set(newState);
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    },
  };
});

// Batch Store
export const useBatchStore = create((set, get) => ({
  currentBatch: null,
  currentLocation: null,
  currentLocationIndex: 0,
  locations: [],

  setBatch: (batch) => {
    // Convert locationGroups from API to locations array
    const locations = convertLocationGroupsToLocations(batch.locationGroups || {});

    set({
      currentBatch: batch,
      currentLocation: locations[0] || null,
      currentLocationIndex: 0,
      locations
    });
  },

  nextLocation: () => {
    const { locations, currentLocationIndex } = get();

    console.log('🔄 nextLocation called');
    console.log('  locations:', locations.map((l, i) => `[${i}] ${l.sku} @ ${l.location}`));
    console.log('  currentLocationIndex:', currentLocationIndex);

    // Find the next location that has incomplete items
    // Start from the next index and wrap around to check all locations
    for (let i = 1; i <= locations.length; i++) {
      const nextIndex = (currentLocationIndex + i) % locations.length;
      const nextLoc = locations[nextIndex];

      console.log(`  Checking index ${nextIndex}:`, nextLoc.sku);

      // Check if this location has any incomplete items
      const hasIncompleteItems = nextLoc.orders.some(order =>
        order.items.some(item =>
          item.quantity_picked < item.quantity_required &&
          item.status !== 'oversized' &&
          item.status !== 'none_remaining'
        )
      );

      console.log(`    hasIncompleteItems:`, hasIncompleteItems);

      if (hasIncompleteItems) {
        console.log(`  ✅ Moving to index ${nextIndex}`);
        set({
          currentLocationIndex: nextIndex,
          currentLocation: locations[nextIndex]
        });
        return true;
      }
    }

    console.log('  ❌ No more locations with incomplete items');
    return false; // No more locations with incomplete items
  },

  updateLineItem: (lineItemId, updates) => {
    const { currentBatch, currentLocation, locations, currentLocationIndex } = get();

    // Update in current location
    const updatedLocation = {
      ...currentLocation,
      orders: currentLocation.orders.map(order => ({
        ...order,
        items: order.items.map(item =>
          item.id === lineItemId ? { ...item, ...updates } : item
        )
      }))
    };

    // Update in the locations array so changes persist
    const updatedLocations = locations.map((loc, index) =>
      index === currentLocationIndex ? updatedLocation : loc
    );

    set({
      currentLocation: updatedLocation,
      locations: updatedLocations
    });
  },

  incrementLineItemQuantity: (lineItemId, amount) => {
    const { currentBatch, currentLocation, locations, currentLocationIndex } = get();

    // Helper to find item and update it
    let itemFound = null;
    let orderIndex = -1;

    // We assume the item is in the current location for efficiency, 
    // but we could search all if needed. For now, picking is always in current location.

    const updatedLocation = {
      ...currentLocation,
      orders: currentLocation.orders.map((order, oIdx) => {
        const itemIndex = order.items.findIndex(i => i.id === lineItemId);

        if (itemIndex !== -1) {
          orderIndex = oIdx; // Capture the order index
          const item = order.items[itemIndex];

          const quantityToAdd = amount;
          const currentPicked = item.quantity_picked || 0;
          const maxAllowed = item.quantity_required;

          // Prevent local over-picking
          // If already full, do nothing
          if (currentPicked >= maxAllowed) {
            // Already full, return existing item without changes
            itemFound = item;
            return order;
          }

          // Cap the new quantity
          let newQuantity = currentPicked + quantityToAdd;

          // Validation: Check for over-pick
          if (newQuantity > maxAllowed) {
            console.warn(`[Store] Over-pick prevented. Cur: ${currentPicked}, Add: ${amount}, Max: ${maxAllowed}`);
            console.warn(`[Store] Over-pick prevented. Cur: ${currentPicked}, Add: ${amount}, Max: ${maxAllowed}`);
            // Do NOT update. Return useful warning info.
            return { item: item, warning: 'QUANTITY_EXCEEDED', max: maxAllowed };
          }

          console.log(`[Store] Updates VALID. New Qty: ${newQuantity}`);

          // Calculate new status
          const isComplete = newQuantity >= maxAllowed || item.status === 'none_remaining' || item.status === 'oversized';
          const newStatus = isComplete ? 'picked' : 'picking';

          console.log(`[Store] Incrementing item ${lineItemId}. New Qty: ${newQuantity}, Status: ${newStatus}`);

          itemFound = { ...item, quantity_picked: newQuantity, status: newStatus };

          const newItems = [...order.items];
          newItems[itemIndex] = itemFound;

          return { ...order, items: newItems };
        }
        return order;
      })
    };

    if (!itemFound) return null; // Item not found in current location

    // Update locations array
    const updatedLocations = locations.map((loc, index) =>
      index === currentLocationIndex ? updatedLocation : loc
    );

    set({
      currentLocation: updatedLocation,
      locations: updatedLocations
    });

    if (!itemFound || orderIndex === -1) {
      console.warn("Item not found in store increment:", lineItemId);
      return null;
    }

    // Check if the order is now complete
    const updatedOrder = updatedLocation.orders[orderIndex]; // Note: orderIndex needs to be captured
    const isOrderComplete = updatedOrder.items.every(i =>
      i.quantity_picked >= i.quantity_required ||
      i.status === 'oversized' ||
      i.status === 'none_remaining'
    );

    return { item: itemFound, orderComplete: isOrderComplete }; // Return updated item and order status
  },

  refreshBatchData: (freshBatchData) => {
    const { currentLocation: oldLocation, locations: oldLocations } = get();

    console.log('🔄 refreshBatchData called');
    console.log('  Old locations count:', oldLocations.length);
    console.log('  Old locations:', oldLocations.map(l => `${l.sku} @ ${l.location}`));
    console.log('  locationGroups from backend:', Object.keys(freshBatchData.locationGroups || {}));

    // Convert fresh data to locations
    const locations = convertLocationGroupsToLocations(freshBatchData.locationGroups || {});

    console.log('  New locations count:', locations.length);
    console.log('  New locations:', locations.map(l => `${l.sku} @ ${l.location}`));

    // Find the current location in the new locations array by matching SKU and location
    let newLocationIndex = 0;
    if (oldLocation) {
      console.log('  Looking for:', `${oldLocation.sku} @ ${oldLocation.location}`);
      const matchIndex = locations.findIndex(loc =>
        loc.sku === oldLocation.sku && loc.location === oldLocation.location
      );
      console.log('  Match found at index:', matchIndex);
      if (matchIndex !== -1) {
        newLocationIndex = matchIndex;
      }
    }

    // Ensure index is valid
    const safeIndex = Math.min(newLocationIndex, locations.length - 1);

    console.log('  Final index:', safeIndex);
    console.log('  Final currentLocation:', locations[safeIndex]);

    set({
      currentBatch: freshBatchData,
      locations,
      currentLocationIndex: safeIndex,
      currentLocation: locations[safeIndex] || null
    });
  },

  clearBatch: () => set({
    currentBatch: null,
    currentLocation: null,
    currentLocationIndex: 0,
    locations: [],
    toteAssignments: {}, // Clear totes on batch clear
  }),

  // Tote Management
  toteAssignments: {}, // KEY: orderId -> { toteBarcode }

  setToteAssignment: (orderId, toteBarcode) => {
    set(state => ({
      toteAssignments: {
        ...state.toteAssignments,
        [orderId]: { toteBarcode }
      }
    }));
  },
}));

// Helper function to convert API's locationGroups to frontend format
function convertLocationGroupsToLocations(locationGroupsData) {
  try {
    // Safety check for null/undefined
    if (!locationGroupsData) return [];

    const locations = [];
    let locationEntries = [];

    if (Array.isArray(locationGroupsData)) {
      // New Format: Array of { name, items }
      locationEntries = locationGroupsData.map(g => [g.name, g.items]);
    } else if (typeof locationGroupsData === 'object') {
      // Old Format: Object { 'A1': items }
      locationEntries = Object.entries(locationGroupsData);
    } else {
      console.warn('[Store] Unknown data format', typeof locationGroupsData);
      return [];
    }

    // Use standard for loops to avoid prototype/polyfill issues
    for (const [location, items] of locationEntries) {
      if (!items || !Array.isArray(items)) {
        console.warn(`[Store] Invalid items for location ${location}:`, items);
        continue;
      }

      if (items.length === 0) continue;

      // Group items by SKU at this location
      const skuMap = new Map();

      for (const item of items) {
        if (!item) continue;
        const sku = item.productSku;

        if (!skuMap.has(sku)) {
          skuMap.set(sku, {
            sku: item.productSku,
            productName: item.productName,
            location: item.pickLocation || location,
            imageUrl: item.productImageUrl || item.imageUrl, // FIX: Map productImageUrl to location preview
            productBarcode: item.productBarcode,
            totalQuantity: 0,
            orders: []
          });
        }

        const skuGroup = skuMap.get(sku);
        skuGroup.totalQuantity += item.quantity;

        // Find or create order group
        let orderGroup = skuGroup.orders.find(o => o.orderId === item.orderId);
        if (!orderGroup) {
          orderGroup = {
            orderId: item.orderId,
            orderNumber: item.orderNumber,
            customer: item.customerName,
            toteNumber: item.toteNumber,
            toteBarcode: item.toteBarcode,
            priority: 'normal',
            items: []
          };
          skuGroup.orders.push(orderGroup);
        }

        orderGroup.items.push({
          id: item.id,
          product_sku: item.productSku,
          product_name: item.productName,
          quantity_required: item.quantity,
          quantity_picked: item.quantityPicked,
          pick_location: item.pickLocation,
          status: normalizeStatus(item.status),
          is_oversized: item.isOversized,
          oversized_location: item.oversizedLocation,
          product_barcode: item.productBarcode,
          order_id: item.orderId,
          order_number: item.orderNumber,
          customer_name: item.customerName,
          line_number: item.lineNumber, // NEW: Map line number
          productImageUrl: item.productImageUrl, // FIX: Pass image URL through
          product_image_url: item.productImageUrl, // FIX: Pass as snake_case too just in case
        });
      }

      // Add each SKU group as a location
      // Map.forEach is generally safe, but we can use for..of values
      for (const skuGroup of skuMap.values()) {
        locations.push(skuGroup);
      }
    }

    return locations;
  } catch (err) {
    console.error('[Store] Critical syntax error in convertLocationGroupsToLocations:', err);
    return []; // Fail safe to empty list instead of crashing app
  }
}

// Helper function to normalize status from backend enum to frontend format
function normalizeStatus(status) {
  if (!status) return 'pending';

  const statusMap = {
    'PENDING': 'pending',
    'PICKING': 'picking',
    'PICKED': 'picked',
    'NOT_FOUND': 'none_remaining',
    'OVERSIZED': 'oversized'
  };

  return statusMap[status] || status.toLowerCase();
}

// Tote Routing Store
export const useToteStore = create((set) => ({
  routedTotes: [],

  addRoutedTote: (tote) => set((state) => ({
    routedTotes: [...state.routedTotes, tote]
  })),

  clearRoutedTotes: () => set({ routedTotes: [] }),
}));
