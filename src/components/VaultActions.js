import React, { useState, useMemo } from 'react';
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
import { formatNumber, formatNumberWithCommas, validateInput } from '../utils/formatters';

const VaultActions = ({ vaultData, systemData, balances, onDeposit, onWithdraw, onClearStuckDebt, isLoading, userAddress }) => {  const [activeTab, setActiveTab] = useState('deposit');
  const [plsAmount, setPlsAmount] = useState('');
  const [jdaiAmount, setJdaiAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFixingVault, setIsFixingVault] = useState(false);

  // Users who need vault repairs
  const REPAIR_USERS = {
    "0x5D45d3A944A1FcBF9e7c5d3D42b168C8dfc14A58": {
      amount: "3000000",
      description: "Partial frob() calls - 3M PLS never moved to vault",
      type: "pls" // PLS collateral issue
    }
  };
  // Fix the lookup to be case-insensitive
  const currentUserRepair = userAddress ? 
    Object.entries(REPAIR_USERS).find(([addr]) => 
      addr.toUpperCase() === userAddress.toUpperCase()
    )?.[1] : null;
  const ADMIN_ADDRESS = "0x40a030B7287A3aADb2C5a4595A58500AA6Fb4a62";
  const VAT_ADDRESS = "0x7086692dEe57ebEf0dC66A786198C406CfC259cD";
  
  // Detect stuck debt (user has debt but no JDAI tokens - likely burned JDAI without wipe)
  const hasStuckDebt = parseFloat(vaultData.debt || 0) > 0 && parseFloat(balances.jdai || 0) === 0;
    // Check if current user needs repairs (case-insensitive)
  const isAdmin = userAddress && userAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  
  // Check if current user should see the fix button (only for PLS issues, not debt issues)
  const shouldShowFixButton = (currentUserRepair && currentUserRepair.type === "pls") || isAdmin;

  const handlePlsChange = (e) => {
    const value = e.target.value;
    if (validateInput(value, parseFloat(balances.pls))) {
      setPlsAmount(value);
      
      // Auto-calculate max JDAI if depositing
      if (activeTab === 'deposit' && value) {
        const spotPrice = parseFloat(systemData.plsPrice) / parseFloat(systemData.jdaiPrice) * 
                         (1 / parseFloat(systemData.liquidationRatio));
        const maxJdai = parseFloat(value) * spotPrice;
        const safeMaxJdai = Math.max(0, maxJdai - parseFloat(systemData.minDebt));
        
        if (safeMaxJdai >= parseFloat(systemData.minDebt)) {
          setJdaiAmount(safeMaxJdai.toFixed(2));
        }
      }
    }
  };

  const handleJdaiChange = (e) => {
    const value = e.target.value;
    const maxJdai = activeTab === 'deposit' ? 
      parseFloat(vaultData.maxDebt) : 
      parseFloat(vaultData.debt);
    
    if (validateInput(value, maxJdai)) {
      setJdaiAmount(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!plsAmount && !jdaiAmount) {
      toast.error('Please enter an amount');
      return;
    }

    // Validation
    if (activeTab === 'deposit') {
      if (parseFloat(plsAmount || 0) > parseFloat(balances.pls)) {
        toast.error('Insufficient PLS balance');
        return;
      }
      
      // For existing vaults, if minting JDAI, enforce minimum debt
      if (parseFloat(vaultData.collateral || 0) > 0 && parseFloat(jdaiAmount || 0) > 0) {
        const totalDebtAfterMint = parseFloat(vaultData.debt || 0) + parseFloat(jdaiAmount || 0);
        if (totalDebtAfterMint < parseFloat(systemData.minDebt) && totalDebtAfterMint > 0) {
          toast.error(`Total vault debt must be at least ${systemData.minDebt} JDAI`);
          return;
        }
      }
    } else {
      // Withdrawal tab validation
      if (parseFloat(jdaiAmount || 0) > parseFloat(balances.jdai)) {
        toast.error('Insufficient JDAI balance');
        return;
      }
      
      if (parseFloat(plsAmount || 0) > parseFloat(vaultData.collateral)) {
        toast.error('Cannot withdraw more than deposited');
        return;
      }      // If withdrawing PLS without repaying JDAI, check health ratio using oracle prices (same as contracts)
      if (parseFloat(plsAmount || 0) > 0 && parseFloat(jdaiAmount || 0) === 0 && parseFloat(vaultData.debt) > 0) {
        const remainingCollateral = parseFloat(vaultData.collateral) - parseFloat(plsAmount);
        // Use oracle prices (same as contract liquidation logic), not market prices
        const plsPrice = parseFloat(systemData.oraclePlsPrice);
        const jdaiPrice = parseFloat(systemData.oracleJdaiTarget);
        const collateralValue = remainingCollateral * plsPrice;
        const debtValue = parseFloat(vaultData.debt) * jdaiPrice;
        const newHealthRatio = debtValue > 0 ? collateralValue / debtValue : Infinity;
        
        if (newHealthRatio < 1.6) { // Add some safety margin above 1.5 liquidation threshold
          toast.error(`Withdrawing ${formatNumber(plsAmount, 1)} PLS would reduce health ratio to ${newHealthRatio.toFixed(2)}. Keep ratio above 1.6 for safety.`);
          return;
        }
      }
    }

    setIsProcessing(true);
    
    try {
      if (activeTab === 'deposit') {
        await onDeposit(plsAmount || '0', jdaiAmount || '0');
        // Dynamic success message based on what was done
        if (parseFloat(plsAmount || 0) > 0 && parseFloat(jdaiAmount || 0) > 0) {
          toast.success('Successfully deposited PLS and minted JDAI!');
        } else if (parseFloat(plsAmount || 0) > 0) {
          toast.success('Successfully deposited PLS collateral!');
        } else if (parseFloat(jdaiAmount || 0) > 0) {
          toast.success('Successfully minted JDAI!');
        }
      } else {
        await onWithdraw(jdaiAmount || '0', plsAmount || '0');
        toast.success('Successfully repaid and withdrawn!');
      }
      
      // Reset form
      setPlsAmount('');
      setJdaiAmount('');
      
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const setMaxPls = () => {
    if (activeTab === 'deposit') {
      // Reserve PLS for gas fees - keep at least 1000 PLS for multiple transactions
      const gasReserve = 1000;
      const availablePls = Math.max(0, parseFloat(balances.pls) - gasReserve);
      setPlsAmount(availablePls.toString());
    } else {
      setPlsAmount(vaultData.collateral);
    }
  };

  const setMaxJdai = () => {
    if (activeTab === 'deposit') {
      const availableDebt = Math.max(0, parseFloat(vaultData.maxDebt) - parseFloat(vaultData.debt));
      setJdaiAmount(availableDebt.toFixed(2));
    } else {
      setJdaiAmount(Math.min(parseFloat(balances.jdai), parseFloat(vaultData.debt)).toFixed(2));
    }
  };

  // Calculate maximum safe PLS withdrawal without repaying JDAI  // Memoize the safe withdrawal calculation to avoid repeated console logs
  const maxSafePlsWithdrawal = useMemo(() => {
    if (parseFloat(vaultData.debt) === 0) {
      return parseFloat(vaultData.collateral); // No debt, can withdraw all
    }

    const currentCollateral = parseFloat(vaultData.collateral);
    const currentDebt = parseFloat(vaultData.debt);
    // Use oracle price (same as contract liquidation logic), not market price
    const plsPrice = parseFloat(systemData.oraclePlsPrice);
    const jdaiPrice = parseFloat(systemData.oracleJdaiTarget);
    const safetyRatio = 1.6; // Same as our UI safety check
    
    // Calculate minimum collateral needed to maintain safety ratio
    // healthRatio = (collateral * plsPrice) / (debt * jdaiPrice) >= safetyRatio
    // collateral * plsPrice >= debt * jdaiPrice * safetyRatio
    // collateral >= (debt * jdaiPrice * safetyRatio) / plsPrice
    const minCollateralNeeded = (currentDebt * jdaiPrice * safetyRatio) / plsPrice;
    
    // Maximum we can withdraw while staying safe
    const maxWithdrawable = Math.max(0, currentCollateral - minCollateralNeeded);
    
    return maxWithdrawable;
  }, [vaultData.collateral, vaultData.debt, systemData.oraclePlsPrice, systemData.oracleJdaiTarget]);

  const setMaxSafePls = () => {
    // Show debug info only when user clicks "Safe Max"
    console.log('=== Safe Withdrawal Calculation ===');
    console.log('Current collateral:', parseFloat(vaultData.collateral), 'PLS');
    console.log('Current debt:', parseFloat(vaultData.debt), 'JDAI');
    console.log('Oracle PLS price:', parseFloat(systemData.oraclePlsPrice));
    console.log('Oracle JDAI target:', parseFloat(systemData.oracleJdaiTarget));
    console.log('Current health ratio:', 
      (parseFloat(vaultData.collateral) * parseFloat(systemData.oraclePlsPrice)) / 
      (parseFloat(vaultData.debt) * parseFloat(systemData.oracleJdaiTarget))
    );
    console.log('Max safely withdrawable:', maxSafePlsWithdrawal, 'PLS');
    
    setPlsAmount(maxSafePlsWithdrawal.toFixed(6));
  };

  const handleClearStuckDebt = async () => {
    if (!onClearStuckDebt) {
      toast.error('Debt clearing function not available');
      return;
    }

    try {
      setIsProcessing(true);
      toast.loading('Clearing debt with internal balance...', { id: 'clear-debt' });
      
      await onClearStuckDebt();
      
      toast.success(`Successfully cleared ${vaultData.debt} JDAI debt!`, { id: 'clear-debt' });
      
      // Auto-refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Clear debt error:', error);
      let errorMessage = 'Failed to clear debt';
      if (error.message.includes('No debt to clear')) {
        errorMessage = 'No debt found to clear';
      } else if (error.message.includes('Insufficient internal DAI balance')) {
        errorMessage = 'Insufficient internal DAI balance to clear debt';
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: 'clear-debt' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFixVault = async () => {
    // ...early guards...
    setIsFixingVault(true);

    try {
      // --- setup (MetaMask, signer, vat, etc.) ---
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const vatAbi = [
        "function frob(bytes32,address,address,address,int256,int256)",
        "function flux(bytes32,address,address,uint256)"
      ];      
      const vat = new ethers.Contract(VAT_ADDRESS, vatAbi, signer);

      const repairAmount = currentUserRepair ? currentUserRepair.amount : '3000000';

      // Regular repair: User has PLS that was deposited but not credited to vault
      toast.loading(`Moving ${repairAmount} PLS from gem balance into your vault...`, { id: 'fix-vault' });
      
      const frobTx = await vat.frob(
        ethers.encodeBytes32String("PLS-A"),
        userAddress,
        userAddress,
        userAddress,
        ethers.parseEther(repairAmount),
        0
      );
      
      toast.loading('Transaction submitted... Waiting for confirmation', { id: 'fix-vault' });
      await frobTx.wait();
      
      toast.success(`Repair complete! ${repairAmount} PLS is now in your vault. Please refresh the page.`, { 
        duration: 8000,
        id: 'fix-vault'
      });
        // Auto-refresh after 3 seconds to show updated balances
      setTimeout(() => {
        window.location.reload();      }, 3000);

    } catch (error) {
      console.error('Fix vault error:', error);
      
      let errorMessage = 'Failed to fix vault';
      if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: 'fix-vault' });    } finally {
      setIsFixingVault(false);
    }
  };
        //--------------------------------------------
        // Standard “move PLS from gem to vault” fix
        //--------------------------------------------

  return (
    <Card>
      <CardHeader>
        <h2>Vault Actions</h2>
      </CardHeader>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '2rem',
        borderBottom: '1px solid #333'
      }}>
        <button
          style={{
            background: activeTab === 'deposit' ? '#ffd700' : 'transparent',
            color: activeTab === 'deposit' ? '#000' : '#888',
            border: 'none',
            padding: '1rem 2rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setActiveTab('deposit')}
        >
          Deposit & Mint
        </button>
        <button
          style={{
            background: activeTab === 'withdraw' ? '#ffd700' : 'transparent',
            color: activeTab === 'withdraw' ? '#000' : '#888',
            border: 'none',
            padding: '1rem 2rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            fontWeight: '600',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setActiveTab('withdraw')}
        >
          Repay & Withdraw
        </button>
      </div>

      {/* Balances */}
      <StatGrid style={{ marginBottom: '2rem' }}>
        <StatCard>
          <div className="label">PLS Balance</div>
          <div className="value">{formatNumber(balances.pls, 2)}</div>
        </StatCard>
        
        <StatCard>
          <div className="label">JDAI Balance</div>
          <div className="value">{formatNumber(balances.jdai, 2)}</div>
        </StatCard>
      </StatGrid>

      {/* System Requirements & Limits */}
      <Alert type="info" style={{ marginBottom: '2rem' }}>
        <div className="title">System Requirements & Limits</div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginTop: '1rem',
          fontSize: '0.9rem'
        }}>
          <div>
            <strong>Minimum Vault:</strong><br />
            {formatNumber(systemData.minDebt || '10', 1)} JDAI<br />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>
              Requires ~{formatNumberWithCommas(systemData.plsRequiredForMinDebt || '0', 0)} PLS
            </span>
          </div>
          
          <div>
            <strong>Debt Capacity:</strong><br />
            {formatNumber(systemData.availableDebt || '0', 0)} / {formatNumber(systemData.debtCeiling || '0', 0)} JDAI<br />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>
              Available to mint
            </span>
          </div>
          
          <div>
            <strong>Collateral Ratio:</strong><br />
            {parseFloat(systemData.liquidationRatio || '1.5') * 100}% minimum<br />
            <span style={{ color: '#888', fontSize: '0.8rem' }}>
              Liquidation threshold
            </span>
          </div>

          <div>
            <strong>Your Status:</strong><br />
            <div style={{ fontSize: '0.85rem', lineHeight: '1.3' }}>
              <span style={{ color: parseFloat(balances.pls) >= parseFloat(systemData.plsRequiredForMinDebt || '0') ? '#4ade80' : '#ef4444' }}>
                {parseFloat(balances.pls) >= parseFloat(systemData.plsRequiredForMinDebt || '0') ? '✅' : '❌'} Wallet: {formatNumberWithCommas(balances.pls, 0)} PLS {parseFloat(balances.pls) >= parseFloat(systemData.plsRequiredForMinDebt || '0') ? '(sufficient)' : '(need more)'}
              </span><br />
              <span style={{ color: parseFloat(vaultData.collateral) > 0 ? '#4ade80' : '#ef4444' }}>
                {parseFloat(vaultData.collateral) > 0 ? '✅' : '❌'} Vault: {parseFloat(vaultData.collateral) > 0 ? `${formatNumberWithCommas(vaultData.collateral, 0)} PLS deposited` : 'No collateral'}
              </span>
            </div>
          </div>
        </div>
      </Alert>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading...</p>
        </div>
      ) : (
        <Form onSubmit={handleSubmit}>
          {activeTab === 'deposit' ? (
            <>
              {parseFloat(vaultData.collateral || 0) === 0 ? (
                // Step 1: Collateral-only deposit for new vaults
                <>                  <Alert type="info">
                    <div className="title">Step 1: Deposit PLS Collateral</div>
                    <div className="message">
                      First, deposit PLS as collateral. After the deposit is confirmed, 
                      you'll see exactly how much JDAI you can mint from your vault.
                    </div>
                  </Alert>

                  <Alert type="warning" style={{ marginBottom: '1rem' }}>
                    <div className="title">⚠️ IMPORTANT: Multi-Signature Process</div>
                    <div className="message">
                      <strong>This transaction requires 4-6 MetaMask signatures.</strong><br />
                      • DO NOT refresh the page during the process<br />
                      • DO NOT switch wallets/accounts during the process<br />
                      • DO NOT close or navigate away from this page<br />
                      • Keep this tab active until all signatures are complete<br />
                      <br />
                      <em>Interrupting the process can result in your PLS being credited to the wrong account, requiring manual recovery.</em>
                    </div>
                  </Alert>

                  <InputGroup>
                    <Label>PLS Amount to Deposit</Label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Input
                        type="number"
                        placeholder="Enter PLS amount"
                        value={plsAmount}
                        onChange={handlePlsChange}
                        step="any"
                      />
                      <Button type="button" variant="secondary" onClick={setMaxPls}>
                        Max
                      </Button>
                    </div>
                  </InputGroup>

                  <Button 
                    type="submit" 
                    disabled={isProcessing || !plsAmount}
                  >
                    {isProcessing ? <LoadingSpinner /> : 'Deposit PLS Collateral'}
                  </Button>
                </>
              ) : (
                // Step 2: Mint JDAI from existing collateral
                <>                  <Alert type="success">
                    <div className="title">Step 2: Mint JDAI (Optional)</div>
                    <div className="message">
                      Your vault has {formatNumberWithCommas(vaultData.collateral, 0)} PLS collateral. 
                      You can mint up to {formatNumber(vaultData.maxDebt, 2)} JDAI, or add more collateral first.
                    </div>
                  </Alert>

                  {(plsAmount || jdaiAmount) && (
                    <Alert type="warning" style={{ marginBottom: '1rem' }}>
                      <div className="title">⚠️ Multi-Signature Process</div>
                      <div className="message">
                        <strong>This will require multiple MetaMask signatures.</strong> Keep this tab active and DO NOT switch wallets during the process.
                      </div>
                    </Alert>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <InputGroup>
                      <Label>Add More PLS (Optional)</Label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={plsAmount}
                          onChange={handlePlsChange}
                          step="any"
                        />
                        <Button type="button" variant="secondary" onClick={setMaxPls}>
                          Max
                        </Button>
                      </div>
                    </InputGroup>

                    <InputGroup>
                      <Label>JDAI Amount to Mint</Label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={jdaiAmount}
                          onChange={handleJdaiChange}
                          step="any"
                        />
                        <Button type="button" variant="secondary" onClick={setMaxJdai}>
                          Max
                        </Button>
                      </div>
                    </InputGroup>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isProcessing || (!plsAmount && !jdaiAmount)}
                  >
                    {isProcessing ? <LoadingSpinner /> : 
                     (plsAmount && jdaiAmount) ? 'Add Collateral & Mint JDAI' :
                     plsAmount ? 'Add More Collateral' : 
                     jdaiAmount ? 'Mint JDAI' : 'Select Action'}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Alert type="warning">
                <div className="title">Repay JDAI & Withdraw PLS</div>
                <div className="message">
                  Repay JDAI debt to withdraw PLS collateral. 
                  You can also withdraw PLS without repaying if your health ratio stays above 1.6.
                </div>
              </Alert>              {/* Safe Withdrawal Info */}
              {parseFloat(vaultData.debt) > 0 && (
                <Alert type="info" style={{ marginBottom: '1rem' }}>
                  <div className="title">💡 Safe Withdrawal Without Repaying</div>                  <div className="message">
                    You can safely withdraw up to <strong>{formatNumber(maxSafePlsWithdrawal, 2)} PLS</strong> 
                    (<strong>{formatNumberWithCommas(maxSafePlsWithdrawal, 0)} PLS</strong>) without 
                    repaying any JDAI while maintaining a safe health ratio of 1.6+
                  </div>
                </Alert>
              )}

              {(plsAmount || jdaiAmount) && (
                <Alert type="warning" style={{ marginBottom: '1rem' }}>
                  <div className="title">⚠️ Multi-Signature Process</div>
                  <div className="message">
                    <strong>Withdrawals require multiple MetaMask signatures.</strong> Keep this tab active and DO NOT switch wallets during the process.
                  </div>
                </Alert>
              )}

              <InputGroup>
                <Label>JDAI Amount to Repay (Optional)</Label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Input
                    type="number"
                    placeholder="0.0 (leave blank if not repaying)"
                    value={jdaiAmount}
                    onChange={handleJdaiChange}
                    step="any"
                  />
                  <Button type="button" variant="secondary" onClick={setMaxJdai}>
                    Max
                  </Button>
                </div>
              </InputGroup>

              <InputGroup>
                <Label>PLS Amount to Withdraw</Label>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={plsAmount}
                    onChange={handlePlsChange}
                    step="any"
                  />
                  <Button type="button" variant="secondary" onClick={setMaxPls}>
                    All
                  </Button>
                  {parseFloat(vaultData.debt) > 0 && (
                    <Button type="button" variant="secondary" onClick={setMaxSafePls} title="Maximum safe withdrawal without repaying JDAI">
                      Safe Max
                    </Button>
                  )}
                </div>                {parseFloat(vaultData.debt) > 0 && parseFloat(plsAmount || 0) > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                    After withdrawing {formatNumber(plsAmount || 0, 2)} PLS, your health ratio would be: {
                      (() => {
                        const remainingCollateral = parseFloat(vaultData.collateral) - parseFloat(plsAmount || 0);
                        // Use oracle prices to match contract logic and our safety calculations
                        const plsPrice = parseFloat(systemData.oraclePlsPrice);
                        const jdaiPrice = parseFloat(systemData.oracleJdaiTarget);
                        const collateralValue = remainingCollateral * plsPrice;
                        const debtValue = parseFloat(vaultData.debt) * jdaiPrice;
                        const newRatio = debtValue > 0 ? collateralValue / debtValue : Infinity;
                        return newRatio === Infinity ? '∞' : newRatio.toFixed(2);
                      })()
                    }
                  </div>
                )}
              </InputGroup>

              <Button 
                type="submit" 
                variant="danger"
                disabled={isProcessing || (!plsAmount && !jdaiAmount)}
              >
                {isProcessing ? <LoadingSpinner /> : 'Repay & Withdraw'}
              </Button>
            </>
          )}
        </Form>
      )}

      {/* Stuck Debt Warning - Show if user has debt but no JDAI tokens */}
      {hasStuckDebt && (
        <Card style={{ marginTop: '1rem', backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }}>
          <CardHeader style={{ backgroundColor: '#dc3545', color: '#fff' }}>
            ⚠️ Stuck Debt Detected
          </CardHeader>
          <div style={{ padding: '1rem' }}>
            <Alert style={{ backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24', marginBottom: '1rem' }}>
              <strong>You have {vaultData.debt} JDAI debt but no JDAI tokens in your wallet.</strong><br />
              This usually happens when you burned JDAI tokens directly (called `join()`) but didn't complete the debt clearing process (missing `wipe()` call). 
              Your JDAI was converted to internal DAI balance, but your vault debt wasn't cleared.
            </Alert>
            
            <div style={{ backgroundColor: '#d1ecf1', borderColor: '#bee5eb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <strong>How this happened:</strong><br />
              1. ✅ You called `DaiJoin.join()` - burned {vaultData.debt} JDAI tokens<br />
              2. ❌ Missing `vat.wipe()` call - debt not cleared from your vault<br />
              <br />
              <strong>The fix:</strong> Use your internal DAI balance to clear the vault debt.
            </div>
            
            <Button 
              onClick={handleClearStuckDebt}
              disabled={isProcessing}
              variant="danger"
              style={{ marginTop: '1rem', backgroundColor: '#dc3545' }}
            >
              {isProcessing ? 'Clearing Debt...' : `Clear ${vaultData.debt} JDAI Debt with Internal Balance`}
            </Button>
            
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              This will use your internal DAI balance to clear the vault debt. No additional JDAI tokens needed.
            </div>
          </div>
        </Card>
      )}

      {/* Fix Vault Button - Only shown for users who need repairs */}
      {shouldShowFixButton && (
        <Card style={{ marginTop: '1rem', backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }}>
          <CardHeader style={{ backgroundColor: '#ffd93d', color: '#333' }}>
            🔧 Vault Repair Available
            {isAdmin && (
              <span style={{ fontSize: '0.8rem', marginLeft: '10px' }}>(Admin View)</span>
            )}
          </CardHeader>
          <div style={{ padding: '1rem' }}>            <Alert style={{ backgroundColor: '#e7f3ff', borderColor: '#bee5eb', color: '#0c5460', marginBottom: '1rem' }}>
              <strong>
                {isAdmin 
                  ? `Admin: Multiple users need vault repairs`
                  : 'We detected stuck PLS in your vault!'
                }
              </strong><br />
              {isAdmin ? (
                `Multiple users need repairs. Each user must connect their wallet and execute the fix themselves.`
              ) : currentUserRepair ? (
                `You have ${currentUserRepair.amount} PLS that was deposited but not properly credited to your vault. ${currentUserRepair.description}`
              ) : (
                `Multiple users need repairs. Each user must connect their wallet and execute the fix themselves.`
              )}
              {currentUserRepair && !isAdmin && ` Click the button below to fix this and make the PLS available for withdrawal.`}
            </Alert>
            
            <Button 
              onClick={handleFixVault}
              disabled={isFixingVault}
              variant="warning"
              style={{ marginTop: '1rem' }}
            >              {isFixingVault ? 'Processing...' : 'Fix Vault'}
            </Button>
            
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
              {isAdmin 
                ? 'Admin can view this button but only the actual user can execute the fix.'
                : 'This will move your stuck PLS into your vault so you can withdraw it normally. No fees required - just gas for the transaction.'
              }
            </div>
          </div>        </Card>
      )}
    </Card>
  );
};

export default VaultActions;
