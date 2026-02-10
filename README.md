# Warehouse Picking Mobile App

Progressive Web App (PWA) and Native Android App for warehouse batch picking operations, optimized for Zebra TC21 devices.

> **📱 New: Native Android APK Available!**  
> This app can now be deployed as a native Android APK with full Zebra DataWedge integration.
>
> **Quick Start:**
> - **Don't want to install Java?** → See [GET_APK.md](./GET_APK.md) - Build in the cloud with GitHub Actions!
> - **Have Java installed?** → See [BUILD_ANDROID.md](./BUILD_ANDROID.md) - Build locally
> - **Need technical details?** → See [ANDROID_CONVERSION_SUMMARY.md](./ANDROID_CONVERSION_SUMMARY.md)

## Features

- 🔐 PIN-based authentication
- 📦 Batch-based picking workflow
- 📱 Optimized for mobile/handheld devices
- 🎯 SKU-grouped picking (pick all same items at once)
- 🏷️ Tote assignment and tracking
- ⚠️ Exception handling (none remaining, oversized)
- 🔀 Smart tote routing (Production vs Final Find)
- 💾 Offline-capable (PWA or native APK)
- 🔄 Real-time sync with backend
- 📲 **Native Android APK** with Zebra DataWedge integration
- 🔒 **Portrait-locked orientation** for stable scanning
- 🔋 **Battery-optimized** for all-day warehouse use

## Tech Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **API Client**: Axios
- **PWA**: Vite PWA Plugin
- **Native**: Capacitor 8.0 (Android)
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see backend setup)

## Installation

1. **Clone and Navigate**
```bash
cd warehouse-mobile-app
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
```env
VITE_API_BASE_URL=http://your-backend-url:4000/api
```

4. **Start Development Server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Building for Production

### Web/PWA Build

```bash
npm run build
```

The build output will be in the `dist` folder.

### Native Android APK

For Zebra TC21 and other enterprise Android devices:

```bash
npm run android:build
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

**Full instructions:** See [BUILD_ANDROID.md](./BUILD_ANDROID.md) for:
- Prerequisites (Java, Android SDK)
- Building debug/release APKs
- Installing via ADB or Zebra StageNow
- DataWedge configuration for scanner integration
- Troubleshooting guide

## Deployment

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variable in Vercel dashboard:
   - `VITE_API_BASE_URL`: Your production API URL

### Option 2: Netlify

1. Build the app:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

3. Configure environment variables in Netlify settings

### Option 3: Your Own Server

1. Build:
```bash
npm run build
```

2. Serve with any static file server:
```bash
npm install -g serve
serve -s dist -p 3000
```

## Backend API Requirements

The app expects these endpoints:

### Authentication
- `POST /api/auth/login` - Login with picker ID and PIN
- `POST /api/auth/logout` - Logout

### Batches
- `GET /api/batches/my-batches` - Get batches for current user
- `GET /api/batches/:id` - Get batch details
- `POST /api/batches/:id/start` - Start a batch
- `POST /api/batches/:id/complete` - Complete a batch

### Picking
- `POST /api/batches/:batchId/orders/:orderId/get-tote` - Assign tote to order
- `POST /api/batches/:batchId/line-items/:lineItemId/pick` - Confirm pick
- `POST /api/batches/:batchId/line-items/:lineItemId/oversized` - Mark oversized
- `POST /api/batches/:batchId/line-items/:lineItemId/none-remaining` - Mark none remaining
- `POST /api/batches/:batchId/totes/scan` - Scan tote for routing

## API Response Formats

### Batch Object
```json
{
  "id": "uuid",
  "batch_number": "BTH-089",
  "priority": "urgent",
  "status": "assigned",
  "order_count": 3,
  "item_count": 8,
  "tote_count": 3,
  "line_items": [
    {
      "id": "uuid",
      "product_sku": "OFC-001",
      "product_name": "Office Chair Pro",
      "pick_location": "D-G-1-C",
      "quantity_required": 2,
      "quantity_picked": 0,
      "order_id": "uuid",
      "order_number": "NAB-169743",
      "customer_name": "Acme Corp",
      "tote_number": 1,
      "tote_barcode": "TOTE-001",
      "status": "pending",
      "is_oversized": false,
      "image_url": "https://...",
      "priority": "urgent"
    }
  ]
}
```

## Zebra TC21 Setup

### For Native Android APK (Recommended)

See [BUILD_ANDROID.md](./BUILD_ANDROID.md) for complete DataWedge configuration with intent-based scanning.

**Quick reference:**
- Profile: `WarehousePicking`
- Package: `com.warehouse.picker`
- Intent Action: `com.warehouse.picker.SCAN`
- Intent Delivery: Broadcast intent
- Keystroke Output: **Disabled**

### For PWA (Browser Mode)

1. Open DataWedge on the Zebra device
2. Create new profile: "WarehousePicking"
3. Configure:
   - **Input**: Scanner enabled, all barcode types
   - **Output**: Keystroke output (keyboard wedge mode)
   - **Intent Output**: Disabled

4. Associate with browser app

### Testing Barcode Scanner

The app includes a "Simulate Scan" button for testing without a physical scanner.

## User Roles

### Picker (Mobile App User)
- View assigned batches
- Pick items
- Handle exceptions
- Route totes

### Manager (Desktop - Separate App)
- Create batches
- Assign to pickers
- View analytics
- Handle exceptions

## Workflow

1. **Login** - Picker enters ID and PIN
2. **Select Batch** - Choose from assigned batches
3. **Get Tote** - Scan tote for first order
4. **Pick Items** - Pick all quantities for current SKU
   - Pick one at a time or enter bulk quantity
   - Mark oversized if needed
   - Mark none remaining if out of stock
5. **Move to Next Location** - Repeat for all SKUs
6. **Route Totes** - Scan each tote to destination:
   - Production Studio (complete orders)
   - Warehouse Manager (orders with issues)
7. **Complete** - Batch marked complete, synced to backend

## Customization

### Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  warehouse: {
    bg: '#000000',
    yellow: '#FFD700',
    blue: '#2563eb',
    // ... customize colors
  }
}
```

### Touch Target Sizes
Edit `tailwind.config.js`:
```javascript
minHeight: {
  'touch': '60px' // Increase for larger targets
}
```

### Location Format
Currently supports `D-G-1-C` format. To customize, edit the location display in `PickingScreen.jsx`.

## Troubleshooting

### API Connection Issues
- Check `.env` file has correct API URL
- Ensure backend is running
- Check CORS settings on backend

### PWA Not Installing
- Must be served over HTTPS (except localhost)
- Check manifest.json is accessible
- Check service worker registration

### Barcode Scanner Not Working
- Verify DataWedge configuration
- Check app is associated with DataWedge profile
- Use "Simulate Scan" for testing

## Performance Optimization

The app is optimized for:
- ✅ Fast load times (code splitting)
- ✅ Offline functionality (service worker)
- ✅ Low memory usage (efficient state management)
- ✅ Battery efficiency (minimal re-renders)

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+
- ✅ Samsung Internet 14+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile device
5. Submit pull request

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Check backend API logs
- Review browser console
- Contact development team
