# Quick Start Guide

## Get Running in 5 Minutes

### 1. Install Dependencies
```bash
cd warehouse-mobile-app
npm install
```

### 2. Configure API
Create `.env` file:
```bash
echo "VITE_API_BASE_URL=http://localhost:4000/api" > .env
```

Update with your actual backend URL if different.

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser or Zebra device.

### 4. Test Login

Default test credentials (configure in your backend):
- **Picker ID**: `picker1` 
- **PIN**: `1234`

## Testing Without Backend

If you need to test the UI without a backend:

1. Open `src/api/index.js`
2. Temporarily mock the API calls with test data
3. Or use a tool like MSW (Mock Service Worker)

## Testing on Zebra TC21

### Option 1: Connect to Same Network
1. Make sure Zebra device is on same WiFi as your dev machine
2. Find your computer's IP address:
   - Mac: `ifconfig | grep "inet "`
   - Windows: `ipconfig`
   - Linux: `ip addr`
3. Access: `http://YOUR_IP:3000`

### Option 2: Deploy to Public URL
1. Deploy to Vercel (free):
```bash
npm install -g vercel
vercel
```
2. Access the provided URL from Zebra device
3. Add to home screen for PWA experience

## Common Issues

**Port 3000 already in use?**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

**Can't connect from Zebra device?**
- Check firewall settings
- Ensure both devices on same network
- Try accessing by IP address instead of localhost

**API calls failing?**
- Check `.env` file exists
- Verify backend is running
- Check browser console for errors
- Verify CORS is enabled on backend

## Next Steps

1. ✅ Test login flow
2. ✅ Create a test batch in backend
3. ✅ Walk through picking flow
4. ✅ Test tote routing
5. ✅ Verify completion

## Need Help?

Check the full [README.md](./README.md) for detailed documentation.
