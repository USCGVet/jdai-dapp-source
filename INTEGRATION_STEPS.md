/* 
INTEGRATION STEPS FOR PLS RECOVERY COMPONENT

1. Find your main app component (likely App.js or a vault component)
2. Add the import at the top:
*/

import PLSRecoverySimple from './components/PLSRecoverySimple';

/* 
3. Add the component to your JSX where you want it to appear:
*/

// Option A: Always visible (for testing)
<PLSRecoverySimple signer={signer} account={account} />

// Option B: With show/hide toggle (recommended)
{account && (
  <div className="mb-6">
    <button 
      onClick={() => setShowRecovery(!showRecovery)}
      className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
    >
      {showRecovery ? 'Hide' : 'Show'} PLS Recovery Tool
    </button>
    
    {showRecovery && (
      <PLSRecoverySimple 
        signer={signer} 
        account={account} 
        onRecoveryComplete={() => setShowRecovery(false)}
      />
    )}
  </div>
)}

/* 
4. If you don't have signer/account props, make sure your app has wallet connection:
*/

import { ethers } from 'ethers';

// In your component:
const [signer, setSigner] = useState(null);
const [account, setAccount] = useState('');

const connectWallet = async () => {
  if (window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const account = await signer.getAddress();
    setSigner(signer);
    setAccount(account);
  }
};

/* 
5. Quick test - add this directly to your main app component for immediate visibility:
*/

// At the top of your render/return:
{account && <PLSRecoverySimple signer={signer} account={account} />}

/* 
If you're not sure which file to edit, the main app file is usually:
- src/App.js
- src/components/App.js  
- src/pages/index.js (if using Next.js)
- Look for files that handle wallet connection or vault interface
*/