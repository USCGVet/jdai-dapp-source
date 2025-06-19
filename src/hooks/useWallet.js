import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PULSECHAIN_CONFIG } from '../utils/contracts';

export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (chainId) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload(); // Reload on chain change
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed');
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setChainId(Number(network.chainId));

      // Check if we're on PulseChain
      if (Number(network.chainId) !== PULSECHAIN_CONFIG.chainId) {
        await switchToPulseChain();
      }

      return { account: accounts[0], provider, signer };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  const switchToPulseChain = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${PULSECHAIN_CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${PULSECHAIN_CONFIG.chainId.toString(16)}`,
                chainName: PULSECHAIN_CONFIG.chainName,
                rpcUrls: PULSECHAIN_CONFIG.rpcUrls,
                blockExplorerUrls: PULSECHAIN_CONFIG.blockExplorerUrls,
                nativeCurrency: PULSECHAIN_CONFIG.nativeCurrency,
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding PulseChain to wallet:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to PulseChain:', switchError);
        throw switchError;
      }
    }
  };

  const isCorrectNetwork = chainId === PULSECHAIN_CONFIG.chainId;

  return {
    account,
    provider,
    signer,
    isConnecting,
    chainId,
    isCorrectNetwork,
    connectWallet,
    disconnect,
    switchToPulseChain
  };
};
