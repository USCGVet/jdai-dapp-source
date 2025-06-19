// WithdrawTrappedJDAI.js - Component to help users withdraw JDAI that's trapped in the system
import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS } from '../utils/contracts';

const WithdrawTrappedJDAI = ({ signer, account, refresh }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [trappedAmount, setTrappedAmount] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const checkTrappedJDAI = async () => {
    if (!signer || !account) return;
    
    setIsChecking(true);
    setError('');
    setSuccess('');
    setTrappedAmount(null);
    
    try {
      // Check if user has internal DAI balance in the VAT
      const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
      const internalDai = await vat.dai(account);
      
      // Convert from RAD (45 decimals) to DAI (18 decimals)
      const formattedAmount = ethers.formatUnits(internalDai, 45);
      const amountFloat = parseFloat(formattedAmount);
      
      setTrappedAmount(formattedAmount);
      
      if (amountFloat === 0) {
        setSuccess('You don\'t have any trapped JDAI in the system.');
      } else if (amountFloat < 0.01) {
        setSuccess(`You have a tiny amount (${amountFloat.toFixed(8)} JDAI) trapped, but it's too small to withdraw.`);
      }
    } catch (err) {
      console.error('Error checking for trapped JDAI:', err);
      setError('Could not check for trapped JDAI: ' + (err?.reason || err?.message || 'Unknown error'));
    } finally {
      setIsChecking(false);
    }
  };
    const withdrawJDAI = async () => {
    if (!signer || !account || !trappedAmount) return;
    
    // Don't attempt to withdraw if amount is too small (less than 0.01 JDAI)
    const amountFloat = parseFloat(trappedAmount);
    if (amountFloat < 0.01) {
      setError('Amount too small to withdraw (less than 0.01 JDAI)');
      return;
    }
    
    setIsWithdrawing(true);
    setError('');
    setSuccess('');
    
    try {
      // First check if DaiJoin is approved
      const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
      const daiJoin = new ethers.Contract(CONTRACTS.DAIJOIN, ABIS.DAIJOIN, signer);
      
      // Check approvals
      const canDaiJoin = await vat.can(account, CONTRACTS.DAIJOIN);
      
      // Approve if needed
      if (canDaiJoin === 0n) {
        setSuccess('Approving DaiJoin contract...');
        const hopeTx = await vat.hope(CONTRACTS.DAIJOIN);
        await hopeTx.wait();
        setSuccess('DaiJoin approved! Now withdrawing JDAI...');
      }
      
      // Round the amount to 2 decimal places to avoid precision errors
      const roundedAmount = Math.floor(amountFloat * 100) / 100;
      const amountToWithdraw = ethers.parseUnits(roundedAmount.toString(), 18);
      
      // Exit JDAI to wallet
      const exitTx = await daiJoin.exit(account, amountToWithdraw);
      await exitTx.wait();
      
      setSuccess(`Successfully withdrew ${roundedAmount} JDAI to your wallet!`);
      setTrappedAmount('0');
      
      // Refresh wallet balances
      if (refresh) {
        await refresh();
      }
    } catch (err) {
      console.error('Error withdrawing trapped JDAI:', err);
      setError('Failed to withdraw JDAI: ' + (err?.reason || err?.message || 'Unknown error'));
    } finally {
      setIsWithdrawing(false);
    }
  };
    return (
    <div className="withdraw-trapped-section" style={{ 
      marginTop: '20px', 
      padding: '25px',
      border: '1px solid #333',
      borderRadius: '12px',
      background: 'rgba(26, 26, 26, 0.8)',
    }}>
      <h4 style={{ 
        fontSize: '1.2rem', 
        marginBottom: '15px',
        color: '#ffd700', 
        fontWeight: '600' 
      }}>Recover Trapped JDAI</h4>
      
      <p style={{ 
        fontSize: '0.9rem',
        marginBottom: '20px',
        color: '#ccc'
      }}>
        If you have JDAI trapped in the system that didn't make it to your wallet, use this tool to recover it.
      </p>
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <button 
          onClick={checkTrappedJDAI} 
          disabled={isChecking || !signer || !account}
          style={{
            background: isChecking ? '#333' : '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '8px',
            color: '#fff',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: '500',
            cursor: isChecking ? 'default' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {isChecking ? 'Checking...' : 'Check for Trapped JDAI'}
        </button>
        
        {trappedAmount !== null && parseFloat(trappedAmount) > 0 && (
          <button 
            onClick={withdrawJDAI} 
            disabled={isWithdrawing || !signer || !account || parseFloat(trappedAmount) < 0.01}
            style={{
              background: parseFloat(trappedAmount) < 0.01 ? '#333' : 
                        isWithdrawing ? '#333' : 
                        'linear-gradient(45deg, #ffd700, #f59e0b)',
              border: 'none',
              borderRadius: '8px',
              color: parseFloat(trappedAmount) < 0.01 ? '#666' : 
                    isWithdrawing ? '#666' : '#000',
              padding: '10px 20px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: (isWithdrawing || parseFloat(trappedAmount) < 0.01) ? 'default' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isWithdrawing ? 'Withdrawing...' : `Withdraw ${parseFloat(trappedAmount) > 0.01 ? parseFloat(trappedAmount).toFixed(2) : '0.00'} JDAI`}
          </button>
        )}      </div>
      
      {error && <div style={{ 
        color: '#ef4444', 
        marginTop: '15px', 
        padding: '10px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '5px',
        fontSize: '0.9rem'
      }}>{error}</div>}
      
      {success && <div style={{ 
        color: '#10b981', 
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '5px',
        fontSize: '0.9rem'
      }}>{success}</div>}
    </div>
  );
};

export default WithdrawTrappedJDAI;
