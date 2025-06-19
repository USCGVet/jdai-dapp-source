import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useWallet } from './hooks/useWallet';
import { useVault } from './hooks/useVault';
import VaultOverview from './components/VaultOverview';
import VaultActionsV2 from './components/VaultActionsV2';
import WithdrawTrappedJDAI from './components/WithdrawTrappedJDAI';
import { 
  AppContainer, 
  Header, 
  HeaderContent, 
  Logo, 
  WalletButton, 
  NetworkBadge,
  MainContent,
  Alert 
} from './components/StyledComponents';
import { truncateAddress } from './utils/formatters';

const App = () => {
  const { 
    account, 
    signer, 
    isConnecting, 
    isCorrectNetwork, 
    connectWallet, 
    disconnect,
    switchToPulseChain
  } = useWallet();  const { 
    vaultData, 
    systemData, 
    balances, 
    contracts,
    depositAndMint, 
    repayAndWithdraw, 
    clearDebtWithInternalBalance,
    refresh 
  } = useVault(signer, account);

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  const handleDeposit = async (plsAmount, jdaiAmount) => {
    const transactions = await depositAndMint(plsAmount, jdaiAmount);
    await refresh();
    return transactions;
  };

  const handleWithdraw = async (jdaiAmount, plsAmount) => {
    const transactions = await repayAndWithdraw(jdaiAmount, plsAmount);
    await refresh();
    return transactions;
  };
  const handleNetworkSwitch = async () => {
    try {
      await switchToPulseChain();
      toast.success('Switched to PulseChain!');
    } catch (error) {
      toast.error('Failed to switch network');
    }
  };
  const addJDAIToWallet = async () => {
    if (!window.ethereum) {
      toast.error('No wallet detected');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: '0x1610E75C9b48BF550137820452dE4049bB22bB72',
            symbol: 'JDAI',
            decimals: 18,
            image: 'https://raw.githubusercontent.com/your-repo/jdai-logo.png', // You can replace with actual logo URL
          },
        },
      });
      toast.success('JDAI token added to wallet!');
    } catch (error) {
      toast.error('Failed to add token to wallet');
    }
  };

  const openDexScreener = (tokenAddress) => {
    window.open(`https://dexscreener.com/pulsechain/${tokenAddress}`, '_blank');
  };

  const openTelegram = () => {
    window.open('https://t.me/USCG_Vet_Chat', '_blank');
  };
  const openTwitter = () => {
    window.open('https://x.com/uscgvet5555', '_blank');
  };

  const openSourceCode = (contractAddress) => {
    window.open(`https://repo.sourcify.dev/369/${contractAddress}`, '_blank');
  };

  return (
    <AppContainer>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
        <Header>
        <HeaderContent>
          <Logo>
            <div>
              <h1 onClick={addJDAIToWallet} style={{ cursor: 'pointer' }} title="Click to add JDAI to wallet">
                JDAI
              </h1>
              <div className="subtitle">Gold-Pegged Unstablecoin on PulseChain</div>              {/* Contract Addresses */}
              <div style={{ 
                fontSize: '0.7rem', 
                color: '#666', 
                marginTop: '0.5rem',
                fontFamily: 'monospace'
              }}>
                <div style={{ marginBottom: '0.2rem' }}>
                  <span 
                    onClick={() => openSourceCode('0x1610E75C9b48BF550137820452dE4049bB22bB72')}
                    style={{
                      cursor: 'pointer',
                      color: '#4ade80',
                      textDecoration: 'underline',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#22c55e'}
                    onMouseLeave={(e) => e.target.style.color = '#4ade80'}
                    title="View JDAI source code on Sourcify"
                  >
                    ✅ JDAI: 0x1610E75C9b48BF550137820452dE4049bB22bB72
                  </span>
                </div>
                <div>
                  <span 
                    onClick={() => openSourceCode('0xd9e59020089916A8EfA7Dd0B605d55219D72dB7B')}
                    style={{
                      cursor: 'pointer',
                      color: '#4ade80',
                      textDecoration: 'underline',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#22c55e'}
                    onMouseLeave={(e) => e.target.style.color = '#4ade80'}
                    title="View TKR source code on Sourcify"
                  >
                    ✅ TKR: 0xd9e59020089916A8EfA7Dd0B605d55219D72dB7B
                  </span>
                </div>
              </div>
            </div>
          </Logo>
          
          {/* Middle section - DexScreener and Social Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>            {/* DexScreener Buttons */}
            <button
              onClick={() => openDexScreener('0x1610E75C9b48BF550137820452dE4049bB22bB72')}
              style={{
                background: 'linear-gradient(45deg, #ffd700, #f59e0b)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: '1.2'
              }}
              title="View JDAI on DexScreener"
            >
              <div>📊 JDAI</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>DexScreener</div>
            </button>
            
            <button
              onClick={() => openDexScreener('0x205c6d44d84e82606e4e921f87b51b71ba85f0f0')}
              style={{
                background: 'linear-gradient(45deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: '1.2'
              }}
              title="View TKR on DexScreener"
            >
              <div>📊 TKR</div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>DexScreener</div>
            </button>
            
            {/* Social Links */}
            <button
              onClick={openTelegram}
              style={{
                background: '#0088cc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              title="Join Telegram Chat"
            >
              💬 Telegram
            </button>
            
            <button
              onClick={openTwitter}
              style={{
                background: '#1da1f2',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              title="Follow on X (Twitter)"
            >
              🐦 X
            </button>
          </div>
            {/* Right section - Network and Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {account && (
              <NetworkBadge $correct={isCorrectNetwork}>
                {isCorrectNetwork ? 'PulseChain' : 'Wrong Network'}
              </NetworkBadge>
            )}
            
            <WalletButton
              $connected={!!account}
              onClick={account ? disconnect : handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 
               account ? truncateAddress(account) : 'Connect Wallet'}
            </WalletButton>
          </div>
        </HeaderContent>
      </Header>

      <MainContent>
        {!account ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '4rem 2rem' 
          }}>
            <h2 style={{ marginBottom: '1rem', color: '#ffd700' }}>
              Welcome to JDAI
            </h2>            <p style={{ 
              fontSize: '1.1rem', 
              color: '#ccc', 
              maxWidth: '600px', 
              margin: '0 auto 2rem auto' 
            }}>
              JDAI is a gold-pegged unstablecoin on PulseChain. Each JDAI represents 
              1/1000th of an ounce of gold's USD value. Create a vault by depositing 
              PLS as collateral and mint JDAI against it.
            </p>
            <WalletButton onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect Wallet to Start'}
            </WalletButton>
          </div>
        ) : !isCorrectNetwork ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <Alert type="warning">
              <div className="title">Wrong Network</div>
              <div className="message">
                Please switch to PulseChain to use this application.
              </div>
            </Alert>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <WalletButton onClick={handleNetworkSwitch}>
                Switch to PulseChain
              </WalletButton>
            </div>
          </div>
        ) : (
          <>
            <VaultOverview
              vaultData={vaultData}
              systemData={systemData}
              onRefresh={refresh}
              isLoading={vaultData.isLoading || systemData.isLoading}
            />            <VaultActionsV2
              vaultData={vaultData}
              systemData={systemData}
              balances={balances}
              contracts={contracts}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onClearStuckDebt={clearDebtWithInternalBalance}
              isLoading={balances.isLoading}
              userAddress={account}
              onRefresh={refresh}
            />
            
            {/* Recovery tool for trapped JDAI */}
            <WithdrawTrappedJDAI
              signer={signer}
              account={account}
              refresh={refresh}
            />
          </>
        )}
      </MainContent>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        color: '#666',
        borderTop: '1px solid #333'
      }}>        <p>
          JDAI Unstablecoin - Powered by PulseChain | 
          <span style={{ marginLeft: '1rem' }}>
            1 JDAI = 1/1000 oz Gold USD Value
          </span>
        </p>
      </footer>
    </AppContainer>
  );
};

export default App;
