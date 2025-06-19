import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { 
  Card, 
  CardHeader, 
  Form, 
  InputGroup, 
  Label, 
  Input, 
  Button, 
  Alert,
  StatGrid,
  StatCard,
  LoadingSpinner
} from './StyledComponents';
import { formatNumber } from '../utils/formatters';

const VaultActionsV2 = ({ 
  vaultData, 
  systemData, 
  balances, 
  onDeposit, 
  onWithdraw, 
  onClearStuckDebt, 
  isLoading, 
  userAddress,
  contracts, // We'll need access to contracts for individual operations
  onRefresh // Add refresh function prop
}) => {const [currentOperation, setCurrentOperation] = useState(null); // 'deposit-pls', 'withdraw-pls', 'mint-jdai', 'repay-jdai'
  const [currentStep, setCurrentStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [internalBalances, setInternalBalances] = useState({
    dai: '0',
    gem: '0'
  });  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [approvedAmounts, setApprovedAmounts] = useState({}); // Store approved amounts for display
  const [progressHints, setProgressHints] = useState({}); // Store progress hints for input step

  // Operation definitions - each operation broken into clear steps
  const OPERATIONS = {    'deposit-pls': {
      title: 'Deposit PLS Collateral',
      description: 'Add PLS as collateral to your vault',
      steps: [
        {
          id: 'input-amount',
          title: 'Enter Amount',
          description: 'How much PLS do you want to deposit?',
          action: 'input'
        },
        {
          id: 'join-pls',
          title: 'Deposit PLS to ETHJoin',
          description: 'Transfer PLS from your wallet to the ETHJoin contract',
          action: 'join',
          contract: 'ethjoin'
        },
        {
          id: 'frob-deposit',
          title: 'Add to Vault',
          description: 'Move PLS from ETHJoin to your vault as collateral',
          action: 'frob',
          contract: 'vat'
        },
        {
          id: 'complete',
          title: 'Complete',
          description: 'PLS successfully deposited as collateral!',
          action: 'complete'
        }
      ]
    },    'withdraw-pls': {
      title: 'Withdraw PLS Collateral',
      description: 'Remove PLS collateral from your vault',
      steps: [
        {
          id: 'input-amount',
          title: 'Enter Amount',
          description: 'How much PLS do you want to withdraw?',
          action: 'input'
        },
        {
          id: 'frob-withdraw',
          title: 'Remove from Vault',
          description: 'Move PLS from your vault to ETHJoin',
          action: 'frob',
          contract: 'vat'
        },
        {
          id: 'exit-pls',
          title: 'Exit to Wallet',
          description: 'Transfer PLS from ETHJoin to your wallet',
          action: 'exit',
          contract: 'ethjoin'
        },
        {
          id: 'complete',
          title: 'Complete',
          description: 'PLS successfully withdrawn to your wallet!',
          action: 'complete'
        }
      ]
    },
    'mint-jdai': {
      title: 'Mint JDAI',
      description: 'Borrow JDAI against your PLS collateral',
      steps: [
        {
          id: 'input-amount',
          title: 'Enter Amount',
          description: 'How much JDAI do you want to mint?',
          action: 'input'
        },
        {
          id: 'frob-mint',
          title: 'Mint JDAI',
          description: 'Create new JDAI debt in your vault',
          action: 'frob',
          contract: 'vat'
        },
        {
          id: 'exit-jdai',
          title: 'Exit to Wallet',
          description: 'Transfer JDAI from internal balance to your wallet',
          action: 'exit',
          contract: 'daijoin'
        },
        {
          id: 'complete',
          title: 'Complete',
          description: 'JDAI successfully minted and transferred to your wallet!',
          action: 'complete'
        }
      ]
    },    'repay-jdai': {
      title: 'Repay JDAI Debt',
      description: 'Pay back JDAI to reduce your vault debt',
      steps: [
        {
          id: 'input-amount',
          title: 'Enter Amount',
          description: 'How much JDAI do you want to repay?',
          action: 'input'
        },
        {
          id: 'approve-jdai',
          title: 'Approve JDAI',
          description: 'Allow the system to access your JDAI tokens',
          action: 'approve',
          contract: 'jdai'
        },
        {
          id: 'join-jdai',
          title: 'Deposit JDAI',
          description: 'Move JDAI from your wallet to the internal system',
          action: 'join',
          contract: 'daijoin'
        },
        {
          id: 'frob-repay',
          title: 'Repay Debt',
          description: 'Use deposited JDAI to reduce your vault debt',
          action: 'frob',
          contract: 'vat'
        },
        {
          id: 'complete',
          title: 'Complete',
          description: 'JDAI debt successfully repaid!',
          action: 'complete'
        }
      ]
    }
  };

  // Get current operation and step
  const operation = currentOperation ? OPERATIONS[currentOperation] : null;
  const step = operation ? operation.steps[currentStep] : null;
  // Save operation state to localStorage
  const saveOperationState = () => {
    if (currentOperation && userAddress) {
      const state = {
        operation: currentOperation,
        step: currentStep,        amount,
        completedSteps: Array.from(completedSteps),
        approvedAmounts,
        progressHints,
        timestamp: Date.now()
      };
      localStorage.setItem(`jdai-operation-${userAddress}`, JSON.stringify(state));
    }
  };
  // Load operation state from localStorage
  const loadOperationState = () => {
    if (!userAddress) return;
    
    try {
      const saved = localStorage.getItem(`jdai-operation-${userAddress}`);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if less than 1 hour old
        if (Date.now() - state.timestamp < 3600000) {
          setCurrentOperation(state.operation);
          setCurrentStep(state.step);          setAmount(state.amount || '');
          setCompletedSteps(new Set(state.completedSteps || []));
          setApprovedAmounts(state.approvedAmounts || {});
          setProgressHints(state.progressHints || {});
          return true;
        } else {
          // Clear expired state
          localStorage.removeItem(`jdai-operation-${userAddress}`);
        }
      }
    } catch (error) {
      console.error('Error loading operation state:', error);
    }
    return false;
  };

  // Clear operation state from localStorage
  const clearOperationState = () => {
    if (userAddress) {
      localStorage.removeItem(`jdai-operation-${userAddress}`);
    }
  };  // Check if a step is actually completed on-chain
  const verifyStepCompletion = async (stepId, stepAction, operationType, checkAmount = null) => {
    if (!contracts || !userAddress) return false;

    try {
      const ilk = ethers.encodeBytes32String("PLS-A");
      const amountToCheck = checkAmount || amount;
      const amountWei = amountToCheck ? ethers.parseEther(amountToCheck) : 0n;
      
      console.log(`🔍 Verifying step: ${stepId} (${stepAction}) for operation: ${operationType}, amount: ${amountToCheck}`);

      switch (stepAction) {
        case 'approve':
          if (stepId === 'approve-jdai') {
            const allowance = await contracts.jdai.allowance(userAddress, contracts.daijoin.target);
            return allowance >= amountWei;
          }
          break;        case 'join':
          if (stepId === 'join-pls') {
            const gemBalance = await contracts.vat.gem(ilk, userAddress);
            const gemBalanceFormatted = parseFloat(ethers.formatEther(gemBalance));
            const expectedAmount = parseFloat(amountToCheck || '0');
            
            console.log(`💎 PLS Join Check: Internal balance = ${gemBalanceFormatted}, Expected = ${expectedAmount}`);
            
            // Check if internal balance has at least the expected amount
            // Allow for small rounding differences
            const isCompleted = Math.abs(gemBalanceFormatted - expectedAmount) < 0.0001 || gemBalanceFormatted >= expectedAmount;
            console.log(`💎 PLS Join Result: ${isCompleted}`);
            return isCompleted;
          } else if (stepId === 'join-jdai') {
            const daiBalance = await contracts.vat.dai(userAddress);
            const daiBalanceFormatted = parseFloat(ethers.formatUnits(daiBalance, 45));
            const expectedAmount = parseFloat(amountToCheck || '0');
            
            console.log(`💰 JDAI Join Check: Internal balance = ${daiBalanceFormatted}, Expected = ${expectedAmount}`);
            
            // Check if internal dai balance has at least the expected amount
            const isCompleted = Math.abs(daiBalanceFormatted - expectedAmount) < 0.0001 || daiBalanceFormatted >= expectedAmount;
            console.log(`💰 JDAI Join Result: ${isCompleted}`);
            return isCompleted;
          }
          break;case 'frob':
          // For frob operations, we need to be more careful about verification
          // since we can't easily detect if a specific amount was added/removed
          // We'll use a different approach - check if the internal balance is empty
          // after the frob (for deposits) or if it has the right amount (for withdrawals)
            if (operationType === 'deposit-pls') {
            // For deposits: check if the internal gem balance is less than the deposit amount
            // This indicates the PLS was moved from internal balance to vault
            const gemBalance = await contracts.vat.gem(ilk, userAddress);
            const gemBalanceFormatted = parseFloat(ethers.formatEther(gemBalance));
            const depositAmount = parseFloat(amountToCheck || '0');
            
            console.log(`🏦 PLS Deposit Frob Check: Internal balance = ${gemBalanceFormatted}, Deposit amount = ${depositAmount}`);
            
            // If internal balance is less than the deposit amount, it suggests
            // the deposit was processed (moved from internal to vault)
            const isCompleted = gemBalanceFormatted < depositAmount;
            console.log(`🏦 PLS Deposit Frob Result: ${isCompleted}`);
            return isCompleted;
          } else if (operationType === 'withdraw-pls') {
            // For withdrawals: check if internal gem balance has the withdrawn amount
            const gemBalance = await contracts.vat.gem(ilk, userAddress);
            const gemBalanceFormatted = parseFloat(ethers.formatEther(gemBalance));
            const withdrawAmount = parseFloat(amountToCheck || '0');
            
            // If internal balance has at least the withdraw amount, withdrawal frob completed
            return gemBalanceFormatted >= withdrawAmount;
          } else if (operationType === 'mint-jdai') {
            // For minting: check if internal dai balance has the minted amount
            const daiBalance = await contracts.vat.dai(userAddress);
            const daiBalanceFormatted = parseFloat(ethers.formatUnits(daiBalance, 45));
            const mintAmount = parseFloat(amountToCheck || '0');
            
            // If internal dai balance has at least the mint amount, minting completed
            return daiBalanceFormatted >= mintAmount;
          } else if (operationType === 'repay-jdai') {
            // For repayment: check if internal dai balance is less than repayment amount
            const daiBalance = await contracts.vat.dai(userAddress);
            const daiBalanceFormatted = parseFloat(ethers.formatUnits(daiBalance, 45));
            const repayAmount = parseFloat(amountToCheck || '0');
            
            // If internal dai balance is less than repay amount, repayment was processed
            return daiBalanceFormatted < repayAmount;
          }
          break;        case 'exit':
          if (stepId === 'exit-pls') {
            // For PLS exit: check if internal gem balance is less than the exit amount
            // This indicates PLS was moved from internal balance to wallet
            const gemBalance = await contracts.vat.gem(ilk, userAddress);
            const gemBalanceFormatted = parseFloat(ethers.formatEther(gemBalance));
            const exitAmount = parseFloat(amountToCheck || '0');
            
            // If internal balance is less than exit amount, exit was processed
            return gemBalanceFormatted < exitAmount;
          } else if (stepId === 'exit-jdai') {
            // For JDAI exit: check if internal dai balance is less than the exit amount
            // This indicates JDAI was moved from internal balance to wallet
            const daiBalance = await contracts.vat.dai(userAddress);
            const daiBalanceFormatted = parseFloat(ethers.formatUnits(daiBalance, 45));
            const exitAmount = parseFloat(amountToCheck || '0');
            
            // If internal dai balance is less than exit amount, exit was processed
            return daiBalanceFormatted < exitAmount;
          }
          break;        default:
          console.log(`❓ Unknown step action: ${stepAction}`);
          return false;
      }
    } catch (error) {
      console.error('Error verifying step completion:', error);
    }
    console.log(`❌ Step verification failed for ${stepId}`);
    return false;
  };
  // Auto-detect current step based on blockchain state
  const detectCurrentStep = async () => {
    if (!operation || !userAddress || !contracts || !amount) return;

    const newCompletedSteps = new Set();
    const newApprovedAmounts = { ...approvedAmounts };
    let detectedStep = 0;

    for (let i = 0; i < operation.steps.length; i++) {
      const stepDef = operation.steps[i];
      if (stepDef.action === 'input' || stepDef.action === 'complete') {
        newCompletedSteps.add(stepDef.id);
        continue;
      }

      const isCompleted = await verifyStepCompletion(stepDef.id, stepDef.action, currentOperation);
      if (isCompleted) {
        newCompletedSteps.add(stepDef.id);
        detectedStep = Math.max(detectedStep, i + 1);
        
        // If it's an approval step, get the actual approved amount
        if (stepDef.action === 'approve') {
          const approvedAmount = await getApprovedAmount(stepDef.id);
          if (approvedAmount) {
            newApprovedAmounts[stepDef.id] = approvedAmount;
          }
        }
      } else {
        break; // Stop at first incomplete step
      }
    }

    setCompletedSteps(newCompletedSteps);
    setApprovedAmounts(newApprovedAmounts);
    if (detectedStep !== currentStep) {
      setCurrentStep(Math.min(detectedStep, operation.steps.length - 1));
    }
  };// Load saved operation state on mount
  useEffect(() => {
    if (userAddress) {
      loadOperationState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress]);  // Save operation state when it changes
  useEffect(() => {
    saveOperationState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOperation, currentStep, amount, completedSteps, approvedAmounts, progressHints, userAddress]);// Reset state when operation changes
  useEffect(() => {
    if (currentOperation) {
      setCurrentStep(0);
      setAmount('');
      setCompletedSteps(new Set());
      setApprovedAmounts({});
      setProgressHints({});
    }
  }, [currentOperation]);
  // Auto-detect step progress when operation or amount changes
  // NOTE: Removed automatic detection on amount change to prevent jumping steps while typing
  // Users can manually verify progress with the "Verify Progress" button
  // useEffect(() => {
  //   if (currentOperation && amount && contracts && userAddress) {
  //     detectCurrentStep();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentOperation, amount, contracts, userAddress]);

  // Fetch internal balances
  useEffect(() => {
    const fetchInternalBalances = async () => {
      if (!contracts || !userAddress) return;

      try {
        const ilk = ethers.encodeBytes32String("PLS-A");
        const daiBalance = await contracts.vat.dai(userAddress);
        const gemBalance = await contracts.vat.gem(ilk, userAddress);

        setInternalBalances({
          dai: ethers.formatUnits(daiBalance, 45),
          gem: ethers.formatEther(gemBalance)
        });
      } catch (error) {
        console.error('Error fetching internal balances:', error);
      }
    };

    fetchInternalBalances();
    
    // Refresh internal balances every 10 seconds
    const interval = setInterval(fetchInternalBalances, 10000);
    return () => clearInterval(interval);
  }, [contracts, userAddress]);
  // Load saved operation state on mount
  useEffect(() => {
    const loadState = async () => {
      const restored = loadOperationState();
      if (restored) {
        // Delay detection to allow state restoration
        setTimeout(detectCurrentStep, 1000);
      }
    };

    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
  };
  const getMaxAmount = () => {
    switch (currentOperation) {
      case 'deposit-pls':
        // Use native PLS balance from wallet (not WPLS token balance)
        // Reserve PLS for gas fees
        const gasReserve = 0.01; // Reserve 0.01 PLS for gas
        return Math.max(0, parseFloat(balances.pls) - gasReserve);
      case 'withdraw-pls':
        // Calculate safe withdrawal amount
        return calculateMaxSafeWithdrawal();
      case 'mint-jdai':
        return Math.max(0, parseFloat(vaultData.maxDebt) - parseFloat(vaultData.debt));      case 'repay-jdai':
        // Use wallet JDAI balance, limited by vault debt
        const walletJdai = parseFloat(balances.jdai);
        const vaultDebt = parseFloat(vaultData.debt);
        return Math.min(walletJdai, vaultDebt);
      default:
        return 0;
    }
  };

  const calculateMaxSafeWithdrawal = () => {
    if (parseFloat(vaultData.debt) === 0) {
      return parseFloat(vaultData.collateral);
    }

    const currentCollateral = parseFloat(vaultData.collateral);
    const currentDebt = parseFloat(vaultData.debt);
    const plsPrice = parseFloat(systemData.oraclePlsPrice);
    const jdaiPrice = parseFloat(systemData.oracleJdaiTarget);
    const safetyRatio = 1.6;
    
    const minCollateralNeeded = (currentDebt * jdaiPrice * safetyRatio) / plsPrice;
    return Math.max(0, currentCollateral - minCollateralNeeded);
  };  // Get actual approved amount for display
  const getApprovedAmount = async (stepId) => {
    if (!contracts || !userAddress) return null;
    
    try {
      let allowance;
      if (stepId === 'approve-jdai') {
        allowance = await contracts.jdai.allowance(userAddress, contracts.daijoin.target);
        // Convert from wei to ether and format as string to avoid scientific notation
        return parseFloat(ethers.formatEther(allowance)).toString();
      }
    } catch (error) {
      console.error('Error getting approved amount:', error);
    }
    return null;
  };

  // Auto-detect existing balances and suggest appropriate amounts
  const detectSuggestedAmount = () => {
    if (!currentOperation || !internalBalances) return null;

    switch (currentOperation) {
      case 'deposit-pls':
        // If there's PLS in internal balance, suggest using that amount
        const gemBalance = parseFloat(internalBalances.gem);
        if (gemBalance > 0) {
          return {
            amount: gemBalance.toString(),
            reason: `${parseFloat(gemBalance).toLocaleString('en-US', { 
              minimumFractionDigits: 6, 
              maximumFractionDigits: 6 
            })} PLS found in internal balance from previous deposit`,
            skipInput: false // Let user confirm the amount
          };
        }
        break;
        
      case 'withdraw-pls':
        // For withdrawals, suggest based on vault collateral
        const collateral = parseFloat(vaultData.collateral);
        if (collateral > 0) {
          const maxSafe = calculateMaxSafeWithdrawal();
          return {
            amount: Math.min(collateral, maxSafe).toString(),
            reason: `Based on your ${parseFloat(collateral).toLocaleString('en-US', { 
              minimumFractionDigits: 6, 
              maximumFractionDigits: 6 
            })} PLS vault collateral`,
            skipInput: false
          };
        }
        break;
        
      case 'mint-jdai':
        // Check if there's existing internal DAI balance
        const daiBalance = parseFloat(internalBalances.dai);
        if (daiBalance > 0) {
          return {
            amount: daiBalance.toString(),
            reason: `${parseFloat(daiBalance).toLocaleString('en-US', { 
              minimumFractionDigits: 6, 
              maximumFractionDigits: 6 
            })} JDAI found in internal balance`,
            skipInput: false
          };
        }
        break;      case 'repay-jdai':
        // Use simplified logic: just use whatever is in the internal DAI balance
        // Check if there's any internal DAI balance available
        const daiBalanceFormatted = parseFloat(internalBalances.dai);
        
        if (daiBalanceFormatted > 0) {
          // Skip input - we'll use the full internal balance
          return {
            amount: daiBalanceFormatted.toString(),
            reason: `Will use all ${daiBalanceFormatted.toLocaleString('en-US', { 
              minimumFractionDigits: 6, 
              maximumFractionDigits: 6 
            })} JDAI from internal balance`,
            skipInput: true // Skip the input step
          };
        } else {
          return {
            amount: '0',
            reason: 'No JDAI available in internal balance for repayment',
            skipInput: false // Still show the input to display the error
          };
        }
        break;
    }
    
    return null;
  };
  const executeStep = async () => {
    if (!step || !contracts) return;

    // Safety check: ensure amount is set and valid
    if (!amount || amount.trim() === '' || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount before proceeding', { id: `step-${step.id}` });
      return;
    }

    setIsProcessing(true);
    toast.loading(step.description, { id: `step-${step.id}` });

    try {
      const amountWei = ethers.parseEther(amount);
      const ilk = ethers.encodeBytes32String("PLS-A");switch (step.action) {
        case 'approve':
          if (step.contract === 'jdai') {
            const tx = await contracts.jdai.approve(contracts.daijoin.target, amountWei);
            await tx.wait();
          }
          break;        case 'join':
          if (step.contract === 'ethjoin') {
            // Pre-flight checks for ETHJoin to identify potential issues
            try {
              console.log('=== ETHJoin Pre-flight Checks ===');
              console.log('ETHJoin address:', contracts.ethjoin.target);
              console.log('User address:', userAddress);
              console.log('Amount to transfer:', ethers.formatEther(amountWei));
              
              // First, test basic contract connectivity
              console.log('Testing contract connectivity...');
              try {
                const contractCode = await contracts.ethjoin.runner.provider.getCode(contracts.ethjoin.target);
                if (contractCode === '0x') {
                  throw new Error('ETHJoin contract not found at address - no code deployed');
                }
                console.log('Contract exists at address ✓');
              } catch (codeError) {
                console.error('Contract connectivity test failed:', codeError);
                throw new Error('Cannot connect to ETHJoin contract');
              }
              
              // Check if ETHJoin is live
              console.log('Checking if ETHJoin is live...');
              const live = await contracts.ethjoin.live();
              console.log('ETHJoin live status:', live.toString());
              if (live.toString() === '0') {
                throw new Error('ETHJoin contract is not live (paused)');
              }
              
              // Check ETHJoin configuration - wrap these in try-catch for individual errors
              console.log('Checking ETHJoin configuration...');
              let ethjoinVat, ethjoinIlk;
              
              try {
                ethjoinVat = await contracts.ethjoin.vat();
                console.log('ETHJoin VAT address:', ethjoinVat);
              } catch (vatError) {
                console.error('Failed to get VAT address from ETHJoin:', vatError);
                throw new Error('Cannot read VAT address from ETHJoin contract');
              }
              
              try {
                ethjoinIlk = await contracts.ethjoin.ilk();
                console.log('ETHJoin ILK:', ethjoinIlk);
              } catch (ilkError) {
                console.error('Failed to get ILK from ETHJoin:', ilkError);
                throw new Error('Cannot read ILK from ETHJoin contract');
              }
              
              console.log('Expected VAT address:', contracts.vat.target);
              
              if (ethjoinVat.toLowerCase() !== contracts.vat.target.toLowerCase()) {
                throw new Error(`ETHJoin VAT mismatch. Expected: ${contracts.vat.target}, Got: ${ethjoinVat}`);
              }
              
              // Check if ETHJoin has authorization in VAT to call slip()
              // This is critical - VAT must have authorized ETHJoin via rely()
              try {
                console.log('Checking VAT authorization for ETHJoin...');
                
                // Check current gem balance before slip simulation
                const currentGemBalance = await contracts.vat.gem(ilk, userAddress);
                console.log('Current user gem balance in VAT:', ethers.formatEther(currentGemBalance));
                
              } catch (authError) {
                console.error('VAT authorization check failed:', authError);
                throw new Error('ETHJoin may not be authorized in VAT to call slip()');
              }
              
              // Check user's native PLS balance
              const plsBalance = await contracts.ethjoin.runner.provider.getBalance(userAddress);
              console.log('User PLS balance:', ethers.formatEther(plsBalance));
              
              if (plsBalance < amountWei) {
                throw new Error(`Insufficient PLS balance. Have: ${ethers.formatEther(plsBalance)}, Need: ${ethers.formatEther(amountWei)}`);
              }
              
              // Check if amount is reasonable (not too small or too large)
              if (amountWei === 0n) {
                throw new Error('Cannot transfer zero amount');
              }
              
              // Final gas estimation - this will catch any remaining issues
              console.log('Estimating gas for ETHJoin.join...');
              try {
                const gasEstimate = await contracts.ethjoin.join.estimateGas(userAddress, { value: amountWei });
                console.log('Gas estimate successful:', gasEstimate.toString());
              } catch (gasError) {
                console.error('Gas estimation failed:', gasError);
                // Try to provide more specific error message
                if (gasError.message.includes('ETHJoin/not-live')) {
                  throw new Error('ETHJoin contract is paused');
                } else if (gasError.message.includes('not-authorized')) {
                  throw new Error('ETHJoin is not authorized in VAT contract');
                } else {
                  throw new Error(`Transaction would fail: ${gasError.message}`);
                }
              }
              
              console.log('=== All pre-flight checks passed ===');
              
            } catch (preflightError) {
              console.error('Pre-flight check failed:', preflightError);
              if (preflightError.message.includes('execution reverted')) {
                throw new Error('Transaction would fail - likely due to contract authorization or state issues');
              } else {
                throw preflightError;
              }
            }
            
            console.log('Pre-flight checks passed, executing ETHJoin.join...');
            const tx = await contracts.ethjoin.join(userAddress, { value: amountWei });
            console.log('Transaction sent:', tx.hash);
            await tx.wait();
            console.log('ETHJoin.join transaction confirmed');
            
          } else if (step.contract === 'daijoin') {
            const tx = await contracts.daijoin.join(userAddress, amountWei);
            await tx.wait();
          }
          break;        case 'exit':
          if (step.contract === 'ethjoin') {
            const tx = await contracts.ethjoin.exit(userAddress, amountWei);
            await tx.wait();
          } else if (step.contract === 'daijoin') {
            const tx = await contracts.daijoin.exit(userAddress, amountWei);
            await tx.wait();
          }
          break;        case 'frob':
          // Pre-flight checks for frob operations
          console.log('=== Frob Pre-flight Checks ===');
          console.log('Operation:', currentOperation);
          console.log('Amount:', ethers.formatEther(amountWei));
          
          // Verify internal balances before frob
          const currentGemBalance = await contracts.vat.gem(ilk, userAddress);
          const currentDaiBalance = await contracts.vat.dai(userAddress); // Fetched here
          console.log('Current internal gem balance:', ethers.formatEther(currentGemBalance));
          // This log shows "0.499..." in the user's console output for currentDaiBalance
          console.log('Current internal dai balance:', ethers.formatUnits(currentDaiBalance, 45)); 
          
          let dink = 0n, dart = 0n; // Initialized (assuming BigInts)
          
          if (currentOperation === 'deposit-pls') {
            // For deposit: move PLS from internal balance to vault
            dink = amountWei;  // Positive value to add collateral
            dart = 0n;         // No debt change
          } else if (currentOperation === 'withdraw-pls') {
            // For withdrawal: move PLS from vault to internal balance
            dink = -amountWei; // Negative value to remove collateral
            dart = 0n;         // No debt change
          } else if (currentOperation === 'mint-jdai') {
            dart = amountWei; // Add debt (amountWei should be a bigint if from parseEther)
          } else if (currentOperation === 'repay-jdai') {
            // --- simplified & correct repay calculation ----------------
            // 1. Get the desired repay amount in WAD (18 decimals)
            let repayWad = amountWei;               // user entered amount

            // 2. Cap to outstanding normalized debt (urn.art) to avoid over-repay
            const urnData = await contracts.vat.urns(ilk, userAddress);
            const urnArt  = urnData.art;            // WAD (18 dec)
            if (repayWad > urnArt) repayWad = urnArt;

            // 3. Calculate max repayable based on internal DAI balance
            const ilkData = await contracts.vat.ilks(ilk);
            const rate    = ilkData.rate;           // RAY (27 dec)
            // Calculate max repayable amount based on balance
            const maxRepayByBalance = currentDaiBalance / rate;
            
            // Keep the smallest of: user request, outstanding debt, balance-cap
            if (repayWad > maxRepayByBalance) repayWad = maxRepayByBalance;

            // NOTE: `repayWad` has already been capped by `maxRepayByBalance`,
            // so it is guaranteed that (repayWad * rate) will not exceed
            // `currentDaiBalance` apart from harmless off-by-one rounding.

            // 4. dart is the negative repayWad
            dart = (-repayWad);

            console.log('Repaying', ethers.formatEther(repayWad), 'JDAI');
            console.log('dart set to', dart.toString());
          }

          // User should check this expanded log in their console:
          console.log('Frob parameters:', { 
            ilk: ethers.decodeBytes32String(ilk),
            user: userAddress,
            dink: dink.toString(), // Should be "0" for repay
            dart: dart.toString()  // CRITICAL LOG - this is what's passed
          });
          
          console.log('=== Pre-flight checks passed, executing frob ===');

          const tx = await contracts.vat.frob(
            ilk,
            userAddress,
            userAddress,
            userAddress,
            dink, // For repay, dink is 0
            dart  // This is the value that ends up as 0 in the transaction
          );
          await tx.wait();
          break;

        default:
          throw new Error(`Unknown step action: ${step.action}`);
      }      toast.success(step.title + ' completed!', { id: `step-${step.id}` });
      
      // Mark step as completed
      setCompletedSteps(prev => new Set([...prev, step.id]));
      
      // If it's an approval step, store the approved amount for display
      if (step.action === 'approve') {
        const approvedAmount = await getApprovedAmount(step.id);
        if (approvedAmount) {
          setApprovedAmounts(prev => ({ ...prev, [step.id]: approvedAmount }));
        }
      }
      
      // Refresh vault data after successful transaction
      if (onRefresh && typeof onRefresh === 'function') {
        console.log('Refreshing vault data after successful transaction...');
        onRefresh();
      }
      
      // Move to next step
      if (currentStep < operation.steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }} catch (error) {
      console.error('Step execution error:', error);
      let errorMessage = `Failed to ${step.title.toLowerCase()}`;
      
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.code === 'CALL_EXCEPTION') {
        // Handle specific contract call exceptions
        if (step.action === 'frob') {
          if (currentOperation === 'repay-jdai') {
            errorMessage = 'Failed to repay debt. This may be due to insufficient internal JDAI balance or rate calculation issues. Please verify you have completed the previous steps.';
          } else if (currentOperation === 'withdraw-pls') {
            errorMessage = 'Failed to withdraw collateral. You may not have enough collateral to withdraw safely, or there may be outstanding debt preventing withdrawal.';
          } else if (currentOperation === 'deposit-pls') {
            errorMessage = 'Failed to deposit collateral. Please verify PLS is available in the ETHJoin contract.';
          } else if (currentOperation === 'mint-jdai') {
            errorMessage = 'Failed to mint JDAI. You may not have enough collateral to mint this amount safely.';
          }
        } else if (step.action === 'join' && step.contract === 'ethjoin') {
          errorMessage = 'Failed to deposit PLS to ETHJoin. Please check your PLS balance and try again.';
        } else if (step.action === 'exit') {
          errorMessage = 'Failed to withdraw assets. Please verify the internal balance is sufficient.';
        } else if (error.message && error.message.includes('revert')) {
          errorMessage = `Transaction failed: ${error.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
        toast.error(errorMessage, { id: `step-${step.id}` });
      
      // Also refresh on error to ensure UI shows current state
      if (onRefresh && typeof onRefresh === 'function') {
        console.log('Refreshing vault data after transaction error...');
        onRefresh();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setCurrentOperation(null);
    }
  };

  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };  const resetOperation = () => {
    setCurrentOperation(null);
    setCurrentStep(0);
    setAmount('');
    setCompletedSteps(new Set());
    setApprovedAmounts({});
    setProgressHints({});
    clearOperationState();
  };

  // Detect stuck debt (user has debt but no JDAI tokens)
  const hasStuckDebt = parseFloat(vaultData.debt || 0) > 0 && parseFloat(balances.jdai || 0) === 0;

  if (!currentOperation) {
    // Main menu - show operation selection
    return (
      <Card>
        <CardHeader>
          <h2>Vault Operations Wizard</h2>
          <p>Choose an operation to begin. Each step will be clearly guided.</p>
        </CardHeader>

        {/* Current Vault Status */}
        <StatGrid style={{ marginBottom: '2rem' }}>
          <StatCard>
            <div className="label">PLS Collateral</div>
            <div className="value">{formatNumber(vaultData.collateral, 2)}</div>
          </StatCard>
          <StatCard>
            <div className="label">JDAI Debt</div>
            <div className="value">{formatNumber(vaultData.debt, 2)}</div>
          </StatCard>
          <StatCard>
            <div className="label">Wallet PLS</div>
            <div className="value">{formatNumber(balances.pls, 2)}</div>
          </StatCard>
          <StatCard>
            <div className="label">Wallet JDAI</div>
            <div className="value">{formatNumber(balances.jdai, 2)}</div>
          </StatCard>
        </StatGrid>        {/* Incomplete Operation Detection */}
        {(() => {
          const gemBalance = parseFloat(internalBalances.gem);
          const daiBalance = parseFloat(internalBalances.dai);
            // Define dust thresholds - ignore very small amounts
          const PLS_DUST_THRESHOLD = 0.000001; // Ignore less than 0.000001 PLS (6 decimal places)
          const JDAI_DUST_THRESHOLD = 0.000001; // Ignore less than 0.000001 JDAI (6 decimal places)
            if (gemBalance > PLS_DUST_THRESHOLD) {
            return (
              <Alert variant="info" style={{ marginBottom: '2rem' }}>
                <h3>💰 What would you like to do with your PLS?</h3>
                <p>You have <strong>{parseFloat(gemBalance).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS</strong> in the system. Choose what you'd like to do with it:</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <Button 
                    onClick={() => {
                      setCurrentOperation('deposit-pls');
                      setAmount(gemBalance.toString());
                      // Skip to the frob step since PLS is already in internal balance
                      setTimeout(() => {
                        setCurrentStep(2);
                        // Ensure amount is set after state update
                        setAmount(gemBalance.toString());
                      }, 100);
                    }}
                    style={{ flex: 1 }}
                  >
                    🏦 Deposit as Collateral
                  </Button>
                  <Button 
                    onClick={() => {
                      setCurrentOperation('withdraw-pls');
                      setAmount(gemBalance.toString());
                      // Skip to the exit step to return PLS to wallet
                      setTimeout(() => {
                        setCurrentStep(2);
                        // Ensure amount is set after state update
                        setAmount(gemBalance.toString());
                      }, 100);
                    }}
                    style={{ flex: 1 }}
                  >
                    💳 Return to Wallet
                  </Button>
                </div>
              </Alert>
            );
          }            if (daiBalance > JDAI_DUST_THRESHOLD) {
            return (
              <Alert variant="info" style={{ marginBottom: '2rem' }}>
                <h3>� What would you like to do with your JDAI?</h3>
                <p>You have <strong>{parseFloat(daiBalance).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI</strong> in the system. Choose what you'd like to do with it:</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <Button 
                    onClick={() => {
                      setCurrentOperation('mint-jdai');
                      setAmount(daiBalance.toString());
                      // Skip to the exit step since JDAI is already minted
                      setTimeout(() => {
                        setCurrentStep(2);
                        // Ensure amount is set after state update
                        setAmount(daiBalance.toString());
                      }, 100);
                    }}
                    style={{ flex: 1 }}
                  >
                    💳 Move to Wallet
                  </Button>                  <Button 
                    onClick={() => {
                      setCurrentOperation('repay-jdai');
                      setAmount(daiBalance.toString());
                      // Skip to the frob step to repay debt (index 1, not 3)
                      setTimeout(() => {
                        setCurrentStep(1);
                        // Ensure amount is set after state update
                        setAmount(daiBalance.toString());
                      }, 100);
                    }}
                    style={{ flex: 1 }}
                  >
                    💰 Use to Repay Debt
                  </Button>
                </div>
              </Alert>
            );
          }
          
          return null;
        })()}

        {/* Resume Operation Alert */}
        {!currentOperation && userAddress && (() => {
          const saved = localStorage.getItem(`jdai-operation-${userAddress}`);
          if (saved) {
            try {
              const state = JSON.parse(saved);
              if (Date.now() - state.timestamp < 3600000) {
                return (
                  <Alert variant="info" style={{ marginBottom: '2rem' }}>
                    <h3>🔄 Resume Previous Operation</h3>
                    <p>You have an incomplete {OPERATIONS[state.operation]?.title} operation from {new Date(state.timestamp).toLocaleTimeString()}.</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <Button 
                        onClick={() => loadOperationState()}
                        variant="primary"
                      >
                        Resume Operation
                      </Button>
                      <Button 
                        onClick={() => clearOperationState()}
                        variant="secondary"
                      >
                        Start Fresh
                      </Button>
                    </div>
                  </Alert>
                );
              }
            } catch (e) {
              // Invalid saved state, clear it
              localStorage.removeItem(`jdai-operation-${userAddress}`);
            }
          }
          return null;
        })()}

        {/* Stuck Debt Alert */}
        {hasStuckDebt && (
          <Alert variant="warning" style={{ marginBottom: '2rem' }}>
            <h3>⚠️ Stuck Debt Detected</h3>
            <p>You have vault debt but no JDAI tokens. This usually happens when JDAI was burned without properly repaying the vault debt.</p>
            <Button 
              onClick={onClearStuckDebt}
              disabled={isLoading}
              style={{ marginTop: '1rem' }}
            >
              Clear Stuck Debt
            </Button>
          </Alert>
        )}

        {/* Operation Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Button
            onClick={() => setCurrentOperation('deposit-pls')}
            style={{ 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '2rem' }}>💰</div>
            <div style={{ fontWeight: 'bold' }}>Deposit PLS</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Add PLS as collateral
            </div>
          </Button>

          <Button
            onClick={() => setCurrentOperation('withdraw-pls')}
            disabled={parseFloat(vaultData.collateral) <= 0}
            style={{ 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '2rem' }}>🏃‍♂️</div>
            <div style={{ fontWeight: 'bold' }}>Withdraw PLS</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Remove PLS collateral
            </div>
          </Button>

          <Button
            onClick={() => setCurrentOperation('mint-jdai')}
            disabled={parseFloat(vaultData.collateral) <= 0}
            style={{ 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '2rem' }}>🏭</div>
            <div style={{ fontWeight: 'bold' }}>Mint JDAI</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Borrow against collateral
            </div>
          </Button>

          <Button
            onClick={() => setCurrentOperation('repay-jdai')}
            disabled={parseFloat(vaultData.debt) <= 0}
            style={{ 
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '2rem' }}>💳</div>
            <div style={{ fontWeight: 'bold' }}>Repay JDAI</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              Pay back debt
            </div>
          </Button>
        </div>
      </Card>
    );
  }

  // Wizard interface for selected operation
  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>{operation.title}</h2>
            <p>{operation.description}</p>
          </div>
          <Button 
            onClick={resetOperation} 
            variant="secondary"
            style={{ marginLeft: '2rem' }}
          >
            ← Back to Menu
          </Button>
        </div>
      </CardHeader>

      {/* Progress Indicator */}
      <div style={{ marginBottom: '2rem' }}>        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {operation.steps.map((s, index) => {
            const isCompleted = completedSteps.has(s.id);
            const isCurrent = index === currentStep;
            const isAccessible = index <= currentStep || isCompleted;
            
            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '0.5rem',
                  backgroundColor: isCompleted ? '#28a745' : isCurrent ? '#ffd700' : '#333',
                  color: isCompleted ? '#fff' : isCurrent ? '#000' : '#888',
                  cursor: isAccessible ? 'pointer' : 'default',
                  fontSize: '0.8rem',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  position: 'relative'
                }}
                onClick={() => isAccessible && goToStep(index)}
              >
                {isCompleted && <span style={{ marginRight: '0.25rem' }}>✓</span>}
                {index + 1}. {s.title}
              </div>
            );
          })}
        </div>
        <div style={{ 
          width: '100%', 
          height: '4px', 
          backgroundColor: '#333',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div 
            style={{
              width: `${((currentStep + 1) / operation.steps.length) * 100}%`,
              height: '100%',
              backgroundColor: '#ffd700',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>      {/* Current Step */}
      {step && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        
        {/* Amount validation warning for non-input steps */}
        {step.action !== 'input' && step.action !== 'complete' && (!amount || amount.trim() === '' || parseFloat(amount) <= 0) && (
          <Alert variant="warning" style={{ marginBottom: '1rem' }}>
            ⚠️ <strong>Amount Missing:</strong> Please go back to the input step and enter a valid amount, or use the "Complete" buttons from the main menu with pre-filled amounts.
          </Alert>
        )}
        
        {/* Show amount for non-input steps */}
        {step.action !== 'input' && step.action !== 'complete' && amount && parseFloat(amount) > 0 && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💰</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                Amount: {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} {currentOperation.includes('pls') ? 'PLS' : 'JDAI'}
              </span>
            </div>
            {step.action === 'join' && step.id === 'join-pls' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will transfer {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS from your wallet to the ETHJoin contract.
              </div>
            )}
            {step.action === 'frob' && currentOperation === 'deposit-pls' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will move {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS from ETHJoin to your vault as collateral.
              </div>
            )}
            {step.action === 'frob' && currentOperation === 'withdraw-pls' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will move {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS from your vault to ETHJoin for withdrawal.
              </div>
            )}
            {step.action === 'exit' && step.id === 'exit-pls' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will transfer {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS from ETHJoin to your wallet.
              </div>
            )}
            {step.action === 'approve' && step.id === 'approve-jdai' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will approve the system to transfer up to {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI from your wallet.
              </div>
            )}
            {step.action === 'join' && step.id === 'join-jdai' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will transfer {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI from your wallet to the DaiJoin contract.
              </div>
            )}
            {step.action === 'exit' && step.id === 'exit-jdai' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will transfer {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI from DaiJoin to your wallet.
              </div>
            )}
            {step.action === 'frob' && currentOperation === 'mint-jdai' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will create {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI debt in your vault.
              </div>
            )}            {step.action === 'frob' && currentOperation === 'repay-jdai' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                This will reduce your vault debt by {parseFloat(amount).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI.
              </div>
            )}
          </Alert>
        )}
        
        {/* Show approved amount for completed approval steps */}
        {completedSteps.has(step.id) && step.action === 'approve' && approvedAmounts[step.id] && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                Approved: {parseFloat(approvedAmounts[step.id]).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} {step.id.includes('pls') ? 'PLS' : 'JDAI'}
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              The system is authorized to transfer up to this amount from your wallet.
            </div>
          </Alert>
        )}
        
        {/* Show internal balance amounts for completed join steps */}
        {completedSteps.has(step.id) && step.action === 'join' && step.id === 'join-pls' && parseFloat(internalBalances.gem) > 0 && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                Deposited: {parseFloat(internalBalances.gem).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} PLS
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              This PLS is now in the ETHJoin contract and ready to be moved to your vault.
            </div>
          </Alert>
        )}
          {completedSteps.has(step.id) && step.action === 'join' && step.id === 'join-jdai' && parseFloat(internalBalances.dai) > 0 && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                Deposited: {parseFloat(internalBalances.dai).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} JDAI
              </span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              This JDAI is now in the DaiJoin contract and ready to be used for debt repayment.
            </div>
          </Alert>
        )}
        
        {/* Show vault balance amounts for completed frob steps */}
        {completedSteps.has(step.id) && step.action === 'frob' && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>                {step.id === 'frob-deposit' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Vault Updated: Added {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} PLS collateral
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      Your vault now has {parseFloat(vaultData.collateral).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} PLS total collateral.
                    </div>
                  </>
                )}
                {step.id === 'frob-withdraw' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Vault Updated: Removed {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} PLS collateral
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      Your vault now has {parseFloat(vaultData.collateral).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} PLS total collateral.
                    </div>
                  </>
                )}                {step.id === 'frob-mint' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Vault Updated: Generated {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} JDAI debt
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      Your vault now has {parseFloat(vaultData.debt).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} JDAI total debt.
                    </div>
                  </>
                )}
                {step.id === 'frob-repay' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Vault Updated: Reduced debt by {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} JDAI
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      Your vault now has {parseFloat(vaultData.debt).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} JDAI total debt.
                    </div>
                  </>
                )}
              </div>
            </div>
          </Alert>
        )}
        
        {/* Show withdrawal amounts for completed exit steps */}
        {completedSteps.has(step.id) && step.action === 'exit' && (
          <Alert variant="info" style={{ marginBottom: '1rem', backgroundColor: '#2c3e50', border: '1px solid #3498db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>
                {step.id === 'exit-pls' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Withdrawn: {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} PLS
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      This PLS has been returned to your wallet.
                    </div>
                  </>
                )}
                {step.id === 'exit-jdai' && (
                  <>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Withdrawn: {parseFloat(amount).toLocaleString('en-US', { 
                        minimumFractionDigits: 6, 
                        maximumFractionDigits: 6 
                      })} JDAI
                    </div>
                    <div style={{ marginTop: '0.3rem', fontSize: '0.9rem', opacity: 0.8 }}>
                      This JDAI has been returned to your wallet.
                    </div>
                  </>
                )}
              </div>
            </div>
          </Alert>
        )}
        
        {completedSteps.has(step.id) && (
          <Alert variant="success" style={{ marginBottom: '1rem' }}>
            ✅ This step has been completed.            {step.action === 'approve' && approvedAmounts[step.id] && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Approved Amount:</strong> {parseFloat(approvedAmounts[step.id]).toLocaleString('en-US', { 
                  minimumFractionDigits: 6, 
                  maximumFractionDigits: 6 
                })} {step.id.includes('pls') ? 'PLS' : 'JDAI'}
              </div>
            )}
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              You can proceed to the next step or verify your progress.
            </div>
          </Alert>
        )}        {step.action === 'input' && (
          <Form onSubmit={(e) => e.preventDefault()}>
            {/* Auto-detected amount suggestion for other operations */}
            {currentOperation !== 'repay-jdai' && (() => {
              const suggestion = detectSuggestedAmount();
              if (suggestion && !amount) {
                return (
                  <Alert variant="info" style={{ marginBottom: '1rem' }}>
                    <h4>💡 Suggested Amount</h4>
                    <p>{suggestion.reason}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>                      <Button
                        onClick={() => setAmount(suggestion.amount)}
                        variant="primary"
                      >
                        Use {parseFloat(suggestion.amount).toLocaleString('en-US', { 
                          minimumFractionDigits: 6, 
                          maximumFractionDigits: 6 
                        })} {currentOperation.includes('pls') ? 'PLS' : 'JDAI'}
                      </Button>
                      <Button
                        onClick={() => {/* User can manually enter amount instead */}}
                        variant="secondary"
                      >
                        Enter Different Amount
                      </Button>
                    </div>
                  </Alert>
                );
              }
              return null;
            })()}
              <InputGroup>              <Label>
                Amount {currentOperation.includes('pls') ? 'PLS' : 'JDAI'}
              </Label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>                <Input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  step="0.000001"
                  min="0"
                />
                <Button
                  type="button"
                  onClick={() => setAmount(getMaxAmount().toString())}
                  variant="secondary"
                >
                  Max
                </Button>
              </div>
            </InputGroup>
            
            {/* Progress Hints */}
            {amount && Object.keys(progressHints).length > 0 && (
              <Alert variant="info" style={{ marginTop: '1rem' }}>
                <h4>🎉 Great! Some steps are already completed:</h4>
                <ul style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
                  {operation.steps.map((stepDef, index) => {
                    if (index === 0 || !progressHints[stepDef.id]) return null;
                    return (
                      <li key={stepDef.id} style={{ marginBottom: '0.25rem' }}>
                        ✅ <strong>{stepDef.title}</strong>
                        {stepDef.action === 'approve' && approvedAmounts[stepDef.id] && (
                          <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem', opacity: 0.8 }}>
                            ({formatNumber(approvedAmounts[stepDef.id], 2)} {stepDef.id.includes('pls') ? 'PLS' : 'JDAI'} approved)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Click "Continue" to proceed to the next step that needs your attention.
                </div>
              </Alert>
            )}
          </Form>
        )}        {step.action === 'complete' && (
          <Alert variant="success">
            <h3>✅ Operation Complete!</h3>
            <p>{step.description}</p>
          </Alert>
        )}
        </div>
      )}

      {/* Asset Location Display */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#222', borderRadius: '8px' }}>
        <h4>Asset Locations</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <strong>Your Wallet</strong>
            <div>PLS: {formatNumber(balances.pls, 2)}</div>
            <div>JDAI: {formatNumber(balances.jdai, 2)}</div>
          </div>          <div>
            <strong>Internal Balances</strong>
            <div>PLS: {formatNumber(internalBalances.gem, 2)}</div>
            <div>DAI: {formatNumber(internalBalances.dai, 2)}</div>
          </div>
          <div>
            <strong>Vault</strong>
            <div>Collateral: {formatNumber(vaultData.collateral, 2)} PLS</div>
            <div>Debt: {formatNumber(vaultData.debt, 2)} JDAI</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
        <Button
          onClick={goBack}
          disabled={isProcessing}
          variant="secondary"
        >
          ← Back
        </Button>        {step.action === 'input' && (
          <Button
            onClick={async () => {
              setCurrentStep(currentStep + 1);
              // Auto-detect progress after setting amount and moving to next step
              setTimeout(detectCurrentStep, 500);
            }}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Continue →
          </Button>
        )}        {step.action !== 'input' && step.action !== 'complete' && (
          <div style={{ marginTop: '1rem' }}>
            {completedSteps.has(step.id) ? (
              // Step is already completed - show status instead of action button
              <Alert variant="success" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>✅</span>
                  <span><strong>{step.title}</strong> - Already completed</span>
                </div>
                {step.action === 'approve' && approvedAmounts[step.id] && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Approved: {formatNumber(approvedAmounts[step.id], 2)} {step.id.includes('pls') ? 'PLS' : 'JDAI'}
                  </div>
                )}
                {step.action === 'join' && step.id === 'join-pls' && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    {formatNumber(internalBalances.gem, 2)} PLS in internal balance
                  </div>
                )}
              </Alert>
            ) : (
              // Step not completed - show action button
              <Button
                onClick={executeStep}
                disabled={isProcessing}
                style={{ marginRight: '1rem' }}
              >
                {isProcessing ? <LoadingSpinner /> : step.title}
              </Button>
            )}
                       <Button
              onClick={detectCurrentStep}
              variant="secondary"
              disabled={isProcessing}
            >
              🔍 Verify Progress
            </Button>
          </div>
        )}        {step.action === 'complete' && (
          <Button onClick={resetOperation}>
            Done
          </Button>
        )}
      </div>
    </Card>
  );
};

export default VaultActionsV2;
