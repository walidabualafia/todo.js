# Deployment Guide for Bloom

This guide will help you deploy Bloom to production using various hosting platforms for the backend and GitHub Pages for the frontend.

## Prerequisites

- GitHub account
- Backend hosting account (see options below)

## Backend Hosting Options

### Option 1: Railway (Original)
- Free tier: 500 hours/month
- **Note**: Free tier may have limitations and instability
- URL: [railway.app](https://railway.app)

### Option 2: Render (Recommended Alternative)
- Free tier: 750 hours/month (enough for one app 24/7)
- Auto-sleeps after 15 mins of inactivity
- Easy GitHub deployment
- URL: [render.com](https://render.com)

### Option 3: Fly.io
- Free tier: 3 shared VMs
- Better uptime, no forced sleep
- Supports SQLite persistent storage
- URL: [fly.io](https://fly.io)

### Option 4: Cyclic
- Generous free tier
- No sleep on inactivity
- Built-in database options
- URL: [cyclic.sh](https://cyclic.sh)

### Option 5: Vercel (Serverless)
- Unlimited deployments
- Serverless functions
- Fast edge network
- URL: [vercel.com](https://vercel.com)

Choose the platform that best fits your needs. The deployment steps below use Railway as an example, but can be adapted for other platforms.

## Part 1: Deploy Backend

### Deploying to Railway

#### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `server` directory as the root

#### Step 2: Configure Railway

1. In your Railway project, go to "Settings"
2. Set the **Root Directory** to `server`
3. Add environment variables (if needed in future):
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secure-random-string-here` (optional, but recommended)

#### Step 3: Deploy

1. Railway will automatically deploy your backend
2. Once deployed, copy your Railway URL (e.g., `https://your-app.up.railway.app`)
3. Your SQLite database will persist in Railway's volume storage

### Deploying to Render (Alternative)

#### Step 1: Create Web Service

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: Your app name
   - **Root Directory**: `server`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

#### Step 2: Configure Environment

1. Add environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secure-random-string-here`

#### Step 3: Deploy

1. Click "Create Web Service"
2. Render will build and deploy your app
3. Copy your Render URL (e.g., `https://your-app.onrender.com`)

### Deploying to Fly.io (Alternative)

#### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Or download from https://fly.io/docs/hands-on/install-flyctl/
```

#### Step 2: Login and Initialize

```bash
cd server
fly auth login
fly launch
```

Follow the prompts to configure your app.

#### Step 3: Deploy

```bash
fly deploy
```

Your app will be available at `https://your-app.fly.dev`

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Update Frontend Configuration

1. Edit `client/.env.production` and set your backend URL:
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   ```

   Replace with your actual backend URL from:
   - Railway: `https://your-app.up.railway.app`
   - Render: `https://your-app.onrender.com`
   - Fly.io: `https://your-app.fly.dev`
   - etc.

### Step 2: Install GitHub Pages Package

```bash
cd client
npm install --save-dev gh-pages
```

### Step 3: Update client/package.json

Add these lines to your `client/package.json`:

```json
{
  "homepage": "https://yourusername.github.io/bloom",
  "scripts": {
    ...
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

Replace `yourusername` with your GitHub username and `bloom` with your repository name.

### Step 4: Deploy to GitHub Pages

```bash
cd client
npm run deploy
```

This will:
1. Build your React app for production
2. Deploy it to the `gh-pages` branch
3. Make it available at `https://yourusername.github.io/bloom`

### Step 5: Enable GitHub Pages

1. Go to your GitHub repository
2. Click "Settings" → "Pages"
3. Under "Source", select the `gh-pages` branch
4. Click "Save"

Your frontend will be live in a few minutes!

## Testing

1. Visit your GitHub Pages URL
2. Create an account or login with demo credentials
3. Your data will persist across sessions because it's stored in Railway's SQLite database

## Important Notes

### CORS Configuration

Your backend already has CORS enabled, but if you encounter issues, update `server/server.js`:

```javascript
app.use(cors({
  origin: 'https://yourusername.github.io',
  credentials: true
}));
```

### Database Backups

Different platforms handle backups differently:
- **Railway**: Automatic backups available, upgrade to Pro for better options
- **Render**: Persistent disk with backups on paid plans
- **Fly.io**: Volumes are persistent, can use `fly volumes` commands for backups
- **General recommendation**: Consider migrating to PostgreSQL for production use

### Environment Variables

Remember to update:
- `client/.env.production` with your backend URL before each deployment
- Never commit `.env` files with sensitive data to GitHub

## Troubleshooting

### Frontend can't connect to backend
- Check that `REACT_APP_API_URL` in `.env.production` matches your backend URL
- Verify CORS is properly configured
- Check browser console for errors

### Backend issues on free tier
- **Railway**: Free tier may reset volumes or have service interruptions
- **Render**: Apps sleep after 15 mins of inactivity (cold start on next request)
- **Solution**: Consider upgrading to paid tier or using Fly.io/Cyclic for better uptime

### Database persistence issues
- Ensure your hosting platform supports persistent storage/volumes
- Consider migrating to PostgreSQL for production use
- Check platform-specific documentation for volume/disk configuration

### GitHub Pages shows 404
- Make sure `gh-pages` branch exists
- Check repository Settings → Pages configuration
- Wait a few minutes after deployment

## Cost Comparison

### Backend Hosting
- **Railway**: 500 hours/month free (may have stability issues)
- **Render**: 750 hours/month free (sleeps after inactivity)
- **Fly.io**: 3 shared VMs free (better uptime)
- **Cyclic**: Generous free tier (no sleep)
- **Vercel**: Unlimited serverless deployments

### Frontend Hosting
- **GitHub Pages**: Completely free for public repositories

## Next Steps

- Set up custom domain (optional)
- Add monitoring and analytics
- Consider migrating to PostgreSQL for production
- Set up CI/CD for automatic deployments
