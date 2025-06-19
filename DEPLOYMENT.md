# GitHub Pages Deployment Guide

## 🚀 Deploy Your JDAI DApp to GitHub Pages

### Prerequisites
- GitHub account
- Your DApp code in a GitHub repository
- Node.js installed locally

### Step 1: Update package.json

Replace `yourusername` in the homepage URL:
```json
"homepage": "https://uscgvet.github.io/jdai-dapp"
```

### Step 2: Install GitHub Pages Deployment Tool

```bash
cd jdai-dapp
npm install --save-dev gh-pages
```

### Step 3: Deploy to GitHub Pages

```bash
# Build and deploy in one command
npm run deploy
```

This will:
1. Build your React app
2. Create a `gh-pages` branch
3. Push the built files to GitHub Pages
4. Your site will be live at the homepage URL

### Step 4: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to **Pages** section
4. Set source to **Deploy from a branch**
5. Select branch: **gh-pages**
6. Click **Save**

### Alternative: Manual Deployment

If you prefer manual deployment:

```bash
# Build the app
npm run build

# The build folder contains your static files
# Upload these to any static hosting service
```

### Important Considerations for GitHub Pages

#### ✅ What Works:
- Static React application
- Web3/MetaMask integration
- All client-side functionality
- Responsive design
- Dark theme and styling

#### ⚠️ Limitations:
- **HTTPS Only**: GitHub Pages uses HTTPS (good for Web3)
- **No Server-Side Code**: Only static files (not an issue for this DApp)
- **Custom Domain**: Optional, can use your own domain

#### 🔧 Potential Issues & Solutions:

1. **Routing Issues**: 
   - GitHub Pages doesn't handle client-side routing well
   - Solution: This DApp is single-page, so no issues

2. **Wallet Connection**:
   - Some wallets require HTTPS (GitHub Pages provides this)
   - MetaMask works perfectly on GitHub Pages

3. **Contract Addresses**:
   - Make sure contract addresses in `src/utils/contracts.js` are correct
   - Test on localhost first

### Testing Your Deployment

1. **Local Testing**:
   ```bash
   npm run build
   npx serve -s build
   ```

2. **Live Testing**:
   - Visit your GitHub Pages URL
   - Connect MetaMask
   - Test wallet connection
   - Test PulseChain network switching
   - Test vault operations

### Custom Domain (Optional)

To use your own domain:

1. Add a `CNAME` file to the `public/` folder:
   ```
   yourdomain.com
   ```

2. Configure your domain's DNS:
   - Add CNAME record pointing to `yourusername.github.io`

3. Enable custom domain in GitHub Pages settings

### Deployment Workflow

For continuous deployment:

```bash
# Make changes to your code
git add .
git commit -m "Update DApp"
git push origin main

# Deploy to GitHub Pages
npm run deploy
```

### Alternative Hosting Options

If GitHub Pages doesn't meet your needs:

1. **Netlify**: 
   - Drag and drop `build` folder
   - Automatic deployments from GitHub

2. **Vercel**: 
   - Connect GitHub repository
   - Automatic builds and deployments

3. **IPFS**: 
   - Decentralized hosting
   - Upload `build` folder to IPFS

4. **Traditional Web Hosting**:
   - Upload `build` folder contents to any web server

### Security Notes

- Contract addresses are public (this is normal)
- No private keys in the code (MetaMask handles this)
- Users connect their own wallets
- All transactions happen client-side

### Performance Optimization

For better GitHub Pages performance:

1. **Image Optimization**: Compress any images
2. **Bundle Size**: The current build should be small
3. **Caching**: GitHub Pages handles this automatically

## 🔧 Troubleshooting: Blank Page / 400 Errors

### Problem: Blank white page with manifest.json 400 errors

**Cause**: You uploaded the source code instead of the built application.

**Solution**: 

1. **Build the app locally:**
   ```bash
   cd jdai-dapp
   npm install
   npm run build
   ```

2. **Replace your GitHub repository contents:**
   - Delete all current files in your GitHub repo
   - Upload ONLY the contents of the `build/` folder
   - Do NOT upload the `build` folder itself, just its contents
   - Your repo root should have: `index.html`, `static/`, `manifest.json`, etc.

3. **Update package.json homepage first:**
   ```json
   "homepage": "https://uscgvet.github.io/TakerDAO"
   ```

4. **GitHub Pages settings:**
   - Keep: "Deploy from branch: main"
   - Keep: "Folder: / (root)"

### Files your repo should contain after build:
```
/
├── index.html          ← Main app file
├── manifest.json       ← App manifest
├── static/            ← CSS, JS, assets
│   ├── css/
│   ├── js/
│   └── media/
└── asset-manifest.json ← Asset mappings
```

### What NOT to upload:
- `src/` folder (source code)
- `public/` folder (template files)
- `node_modules/` folder
- `package.json`, `package-lock.json`
- Development files

After uploading the built files, your DApp should work at:
`https://uscgvet.github.io/TakerDAO/`

## 🎯 Final Result

Your JDAI DApp will be live at:
`https://uscgvet.github.io/jdai-dapp`

Users can:
- Connect MetaMask
- Switch to PulseChain
- Create and manage vaults
- Mint and repay JDAI
- Monitor vault health

**GitHub Pages is perfect for this DApp!** ✅
