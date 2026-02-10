# Deployment Guide

## Prerequisites
- Backend API is deployed and accessible
- You have the production API URL
- SSL/HTTPS is configured (required for PWA)

## Option 1: Vercel (Recommended - Easiest)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
# From the warehouse-mobile-app directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? warehouse-mobile-app
# - Directory? ./
# - Override settings? No
```

### Step 4: Set Environment Variables
```bash
# Set production API URL
vercel env add VITE_API_BASE_URL production

# When prompted, enter your production API URL:
# https://your-api-domain.com/api
```

### Step 5: Deploy to Production
```bash
vercel --prod
```

Your app will be live at: `https://warehouse-mobile-app-xxx.vercel.app`

### Custom Domain (Optional)
```bash
vercel domains add your-domain.com
```

---

## Option 2: Netlify

### Step 1: Build the App
```bash
npm run build
```

### Step 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Step 3: Set Environment Variables
1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Add: `VITE_API_BASE_URL` = `https://your-api-domain.com/api`
4. Redeploy: `netlify deploy --prod --dir=dist`

---

## Option 3: AWS S3 + CloudFront

### Step 1: Build
```bash
npm run build
```

### Step 2: Upload to S3
```bash
# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://warehouse-picking-app

# Upload files
aws s3 sync dist/ s3://warehouse-picking-app --acl public-read
```

### Step 3: Create CloudFront Distribution
1. Go to AWS Console → CloudFront
2. Create distribution
3. Origin: Your S3 bucket
4. Enable SSL/HTTPS
5. Set custom error pages (404 → /index.html)

### Step 4: Update DNS
Point your domain to CloudFront distribution URL

---

## Option 4: Docker + Your Own Server

### Step 1: Create Dockerfile

```dockerfile
# File: Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build with production API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 2: Create nginx.conf
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Step 3: Build and Run
```bash
# Build image
docker build -t warehouse-picking-app \
  --build-arg VITE_API_BASE_URL=https://your-api.com/api .

# Run container
docker run -d -p 80:80 warehouse-picking-app

# Or use docker-compose
```

---

## Post-Deployment Checklist

### 1. Test Core Functionality
- [ ] Login works
- [ ] Batches load correctly
- [ ] Picking flow works
- [ ] Tote routing works
- [ ] Data syncs to backend

### 2. Test PWA Features
- [ ] Add to home screen works
- [ ] App opens in standalone mode
- [ ] Service worker caches correctly
- [ ] Offline mode works (if applicable)

### 3. Test on Zebra TC21
- [ ] App loads on device
- [ ] Touch targets are adequate
- [ ] Text is readable
- [ ] Scanner integration works
- [ ] Performance is acceptable

### 4. Security
- [ ] HTTPS is enabled
- [ ] API credentials are not exposed
- [ ] Auth tokens expire correctly
- [ ] CORS is properly configured

### 5. Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up analytics (if needed)
- [ ] Configure alerts for downtime

---

## Environment Variables Reference

```env
# Required
VITE_API_BASE_URL=https://your-api-domain.com/api

# Optional
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

---

## Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Netlify
1. Go to Deploys tab
2. Find previous successful deploy
3. Click "Publish deploy"

### Docker
```bash
# Keep previous image tagged
docker tag warehouse-picking-app:latest warehouse-picking-app:backup

# Revert
docker stop current_container
docker run -d -p 80:80 warehouse-picking-app:backup
```

---

## Updating the App

1. Make changes to code
2. Test locally: `npm run dev`
3. Build: `npm run build`
4. Test build: `npm run preview`
5. Deploy: `vercel --prod` (or your deployment method)
6. Test on production
7. Monitor for errors

---

## Performance Optimization

### 1. Enable Compression
Most platforms do this automatically. For nginx:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 2. Enable HTTP/2
Ensure your hosting supports HTTP/2 (most modern platforms do)

### 3. Set Proper Cache Headers
Already configured in the build. Static assets cache for 1 year.

### 4. Monitor Bundle Size
```bash
# Analyze bundle
npm run build -- --mode analyze
```

Keep bundle under 500KB for fast mobile loading.

---

## Troubleshooting Deployment

### "API calls failing in production"
- Check CORS settings on backend
- Verify API URL in environment variables
- Check browser console for errors

### "PWA not installing"
- Must be served over HTTPS
- Check manifest.json is accessible
- Verify service worker registered

### "Blank screen after deployment"
- Check console for errors
- Verify base path in vite.config.js
- Ensure all routes configured correctly

### "Images not loading"
- Check image URLs are absolute or properly resolved
- Verify CDN/asset hosting

---

## Support

For deployment issues:
1. Check logs on hosting platform
2. Test API endpoints directly
3. Review browser console
4. Check network tab for failed requests

For urgent issues, contact DevOps team.
