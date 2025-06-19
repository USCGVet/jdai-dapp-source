// Security utilities to prevent duplicate recovery and validate recovery amounts
import { ethers } from 'ethers';
import { CONTRACTS } from './contracts';

// Track recovered transactions to prevent double-spending
let recoveredTransactions = new Set();

// Get recovered transactions from localStorage for persistence
function getRecoveredTransactions() {
  try {
    const stored = localStorage.getItem('recovered_pls_transactions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save recovered transactions to localStorage
function saveRecoveredTransactions(txSet) {
  try {
    localStorage.setItem('recovered_pls_transactions', JSON.stringify([...txSet]));
  } catch (error) {
    console.warn('Could not save recovered transactions to localStorage');
  }
}

// Initialize recovered transactions from storage
recoveredTransactions = getRecoveredTransactions();

// Check if a transaction has already been recovered
export function isTransactionAlreadyRecovered(txHash, userAddress) {
  const key = `${txHash.toLowerCase()}_${userAddress.toLowerCase()}`;
  return recoveredTransactions.has(key);
}

// Mark a transaction as recovered
export function markTransactionAsRecovered(txHash, userAddress) {
  const key = `${txHash.toLowerCase()}_${userAddress.toLowerCase()}`;
  recoveredTransactions.add(key);
  saveRecoveredTransactions(recoveredTransactions);
}

// Validate that the user hasn't already recovered more than they deposited
export async function validateRecoveryAmount(provider, userAddress, vat, ilk, proposedAmount) {
  try {
    // Get user's current vault collateral
    const [currentInk] = await vat.urns(ilk, userAddress);
    
    // Get all their historical join() transactions to ETHJoin
    const totalDeposited = await calculateTotalDeposited(provider, userAddress);
    
    // Calculate what they should be able to recover
    const currentCollateralWei = currentInk;
    const proposedAmountWei = ethers.parseEther(proposedAmount);
    const totalAfterRecovery = currentCollateralWei + proposedAmountWei;
    
    if (totalAfterRecovery > totalDeposited) {
      throw new Error(`Recovery would exceed total deposits. Deposited: ${ethers.formatEther(totalDeposited)} PLS, Current: ${ethers.formatEther(currentCollateralWei)} PLS, Proposed: ${proposedAmount} PLS`);
    }
    
    return true;
    
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

// Calculate total amount user has ever deposited to ETHJoin
async function calculateTotalDeposited(provider, userAddress) {
  try {
    // This is a simplified version - in production you'd want to scan more comprehensively
    // or use event logs if available
    let totalDeposited = 0n;
    
    const latestBlock = await provider.getBlockNumber();
    const searchBlocks = 100000; // Search further back
    const fromBlock = Math.max(0, latestBlock - searchBlocks);
    
    // Scan for all join() transactions from this user
    for (let blockNum = fromBlock; blockNum <= latestBlock; blockNum += 1000) {
      try {
        const endBlock = Math.min(blockNum + 999, latestBlock);
        
        for (let i = blockNum; i <= endBlock; i++) {
          const block = await provider.getBlock(i, true);
          if (block?.transactions) {
            for (const tx of block.transactions) {
              if (tx.from?.toLowerCase() === userAddress.toLowerCase() && 
                  tx.to?.toLowerCase() === CONTRACTS.ETHJOIN.toLowerCase() &&
                  tx.value > 0 &&
                  tx.data.startsWith('0x28ffe6c8')) { // join() method
                totalDeposited += tx.value;
              }
            }
          }
        }
      } catch (blockError) {
        continue; // Skip failed blocks
      }
    }
    
    return totalDeposited;
    
  } catch (error) {
    console.error('Error calculating total deposited:', error);
    throw new Error('Could not verify total deposits for security validation');
  }
}

// Clear recovery history (admin function)
export function clearRecoveryHistory() {
  recoveredTransactions.clear();
  localStorage.removeItem('recovered_pls_transactions');
}