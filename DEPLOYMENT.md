# Deployment Guide for Bloom

This guide will help you deploy Bloom to production using Railway (backend) and GitHub Pages (frontend).

## Prerequisites

- GitHub account
- Railway account (free tier available at [railway.app](https://railway.app))

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your bloom repository
5. Select the `server` directory as the root

### Step 2: Configure Railway

1. In your Railway project, go to "Settings"
2. Set the **Root Directory** to `server`
3. Add environment variables (if needed in future):
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secure-random-string-here` (optional, but recommended)

### Step 3: Deploy

1. Railway will automatically deploy your backend
2. Once deployed, copy your Railway URL (e.g., `https://bloom-production.up.railway.app`)
3. Your SQLite database will persist in Railway's volume storage

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Update Frontend Configuration

1. Edit `client/.env.production` and set your Railway backend URL:
   ```
   REACT_APP_API_URL=https://your-railway-url.up.railway.app
   ```

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

Railway provides automatic backups, but for critical data:
1. Consider upgrading to Railway Pro for better backup options
2. Or migrate to PostgreSQL for better production support

### Environment Variables

Remember to update:
- `client/.env.production` with your Railway URL before each deployment
- Never commit `.env` files with sensitive data to GitHub

## Troubleshooting

### Frontend can't connect to backend
- Check that `REACT_APP_API_URL` in `.env.production` matches your Railway URL
- Verify CORS is properly configured
- Check browser console for errors

### Database resets on Railway
- Railway's free tier may reset volumes occasionally
- Consider upgrading to Pro for persistent storage
- Or migrate to PostgreSQL for production use

### GitHub Pages shows 404
- Make sure `gh-pages` branch exists
- Check repository Settings → Pages configuration
- Wait a few minutes after deployment

## Cost

- **Railway**: Free tier includes 500 hours/month (enough for small projects)
- **GitHub Pages**: Completely free for public repositories

## Next Steps

- Set up custom domain (optional)
- Add monitoring and analytics
- Consider migrating to PostgreSQL for production
- Set up CI/CD for automatic deployments
