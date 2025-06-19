import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS, ILK } from '../utils/contracts';
import { formatEther, formatUnits } from '../utils/formatters';
import { usePulseXPrice } from './usePulseXPrice';

export const useVault = (signer, account) => {
  const [oraclePlsPriceForPulseX, setOraclePlsPriceForPulseX] = useState(0);
  const { jdaiPrice: marketJdaiPrice, plsPrice: marketPlsPrice, loading: priceLoading } = usePulseXPrice(oraclePlsPriceForPulseX);
  
  const [vaultData, setVaultData] = useState({
    collateral: '0',
    debt: '0',
    healthRatio: 0,
    maxDebt: '0',
    liquidationPrice: '0',
    isLoading: true
  });
  const [systemData, setSystemData] = useState({
    plsPrice: '0',
    jdaiPrice: '0',
    liquidationRatio: '1.5',
    stabilityFee: '0.5',
    debtCeiling: '0',
    totalDebt: '0',
    availableDebt: '0',
    minDebt: '10',
    plsRequiredForMinDebt: '0',
    isLoading: true
  });

  const [balances, setBalances] = useState({
    pls: '0',
    jdai: '0',
    isLoading: true
  });

  // Fetch vault data
  const fetchVaultData = async () => {
    if (!signer || !account) {
      setVaultData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
      const spotter = new ethers.Contract(CONTRACTS.SPOTTER, ABIS.SPOTTER, signer);      // Get vault (urn) data
      const [ink, art] = await vat.urns(ILK, account);
      const [totalDebt, , spot, debtCeiling, minDebt] = await vat.ilks(ILK);
        // Get system parameters
      const par = await spotter.par();
      const [, mat] = await spotter.ilks(ILK);      // Add timing debug - check when spotter was last poked
      try {
        const spotterAddress = '0x08E744BBe065911F45B86812a0F783bB35fb65eb';
        const spotterAbi = [
          'function poke(bytes32 ilk) external',
          'event Poke(bytes32 indexed ilk, bytes32 val, uint256 spot)'
        ];
        const spotterContract = new ethers.Contract(spotterAddress, spotterAbi, signer.provider);
        
        // Get recent Poke events to see when spotter was last updated
        const currentBlock = await signer.provider.getBlockNumber();
        const fromBlock = currentBlock - 1000; // Check last ~1000 blocks
        
        const filter = spotterContract.filters.Poke(ILK);
        const events = await spotterContract.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length > 0) {
          const lastPoke = events[events.length - 1];
          const block = await signer.provider.getBlock(lastPoke.blockNumber);
          const pokeTime = new Date(block.timestamp * 1000);
          console.log('Last Spotter Poke:', pokeTime.toISOString(), '(block:', lastPoke.blockNumber + ')');
          console.log('Poke event args:', {
            val: lastPoke.args.val?.toString(),
            spot: lastPoke.args.spot?.toString()
          });
        } else {
          console.log('No recent Poke events found in last 1000 blocks');
        }
      } catch (e) {
        console.log('Could not check Spotter poke history:', e.message);
      }// Calculate oracle PLS price from VAT spot price
      // MakerDAO formula: spot = price / (mat × par)
      // Therefore: price = spot × mat × par
      let oraclePlsPrice = '0';
      try {
        console.log('=== ORACLE PRICE DEBUG ===');
        console.log('VAT Debug - spot:', spot.toString(), 'mat:', mat.toString(), 'par:', par.toString());
          // Also try to read directly from medianizer for comparison
        try {
          const medianizerAddress = '0x361630052FfbA8b40473A142264932eBD482426D';
          const medianizerAbi = ['function read() external view returns (bytes32)'];
          const medianizer = new ethers.Contract(medianizerAddress, medianizerAbi, signer.provider);
          const directPrice = await medianizer.read();
          const directPriceFormatted = ethers.formatUnits(directPrice, 18);
          console.log('Direct Medianizer Price:', directPriceFormatted);
        } catch (e) {
          console.log('Could not read from medianizer directly:', e.message);
        }
        
        if (spot > 0 && mat > 0 && par > 0) {
          // Convert from ray (1e27) precision - handle BigInt properly
          const spotValue = Number(spot) / 1e27;  // Convert BigInt to number and divide by 1e27
          const matValue = Number(mat) / 1e27;    // Convert BigInt to number and divide by 1e27
          const parValue = Number(par) / 1e27;    // Convert BigInt to number and divide by 1e27
          
          console.log('VAT Debug - spotValue:', spotValue, 'matValue:', matValue, 'parValue:', parValue);
            // Calculate actual PLS price: spot × mat × par  
          if (spotValue > 0 && matValue > 0 && parValue > 0) {
            oraclePlsPrice = (spotValue * matValue * parValue).toString();            console.log('Oracle PLS price calculated from VAT spot:', oraclePlsPrice);
            console.log('Expected latest price should be around: $0.00002946');
            
            // Update the oracle price for PulseX hook to use
            console.log('Setting oracle PLS price for PulseX hook:', parseFloat(oraclePlsPrice));
            setOraclePlsPriceForPulseX(parseFloat(oraclePlsPrice));
          } else {
            console.log('Calculated values are zero after conversion');
          }
        } else {
          console.log('No oracle price available - spot price not set in VAT (spot=' + spot.toString() + ')');
          console.log('This suggests the Spotter has not been poked after the medianizer update');
          
          // Fallback: If we have market data, use a reasonable oracle estimate
          // This happens when the spotter hasn't been poked recently
          if (marketPlsPrice > 0) {
            console.log('Using market price as oracle fallback');
            oraclePlsPrice = marketPlsPrice.toString();
          }
        }
        console.log('=== END ORACLE PRICE DEBUG ===');
      } catch (error) {
        console.log('Could not calculate PLS price from VAT/Spotter:', error);
      }      // Use PulseX market price if available, otherwise use oracle price
      const effectivePlsPrice = marketPlsPrice > 0 ? marketPlsPrice.toString() : oraclePlsPrice;
      const effectiveJdaiPrice = marketJdaiPrice > 0 ? marketJdaiPrice.toString() : formatUnits(par, 27);

      // Calculate what JDAI should be worth based on gold (oracle target)
      const jdaiOracleTarget = parseFloat(formatUnits(par, 27));
      
      console.log('Price Analysis:', {
        oracle: { 
          pls: oraclePlsPrice, 
          jdaiTarget: jdaiOracleTarget,
          goldBased: `$${jdaiOracleTarget.toFixed(4)} (Gold/1000)`
        },
        market: { 
          pls: marketPlsPrice, 
          jdai: marketJdaiPrice,
          premium: marketJdaiPrice > 0 ? `${((marketJdaiPrice / jdaiOracleTarget - 1) * 100).toFixed(1)}%` : 'N/A'
        },
        effective: { pls: effectivePlsPrice, jdai: effectiveJdaiPrice },        uiDisplay: {
          plsOracleInfo: oraclePlsPrice, // This should be shown in "PLS Oracle Info"
          plsForCalculations: effectivePlsPrice, // This is used for health ratio calculations
          jdaiPriceDebug: {
            marketJdaiPrice,
            marketJdaiPriceNumber: Number(marketJdaiPrice),
            willUseMarket: marketJdaiPrice > 0,
            oracleTarget: jdaiOracleTarget,
            finalChoice: marketJdaiPrice > 0 ? 'market' : 'oracle'
          }
        }
      });      // Calculate values
      const collateralAmount = formatEther(ink);
      const debtAmount = formatUnits(art, 18);
      
      // const spotPrice = parseFloat(formatUnits(spot, 27)); // unused
      const liquidationRatio = parseFloat(formatUnits(mat, 27));// Calculate health ratio using oracle target price for accurate vault metrics
      // Use oracle-based debt value for consistent health calculations
      const oracleBasedDebtValue = parseFloat(debtAmount) * jdaiOracleTarget;
      const collateralValue = parseFloat(collateralAmount) * parseFloat(effectivePlsPrice); // Use effective price for better UX
      
      const healthRatio = parseFloat(debtAmount) > 0 && jdaiOracleTarget > 0
        ? collateralValue / oracleBasedDebtValue
        : Infinity;// Calculate liquidation price
      // For an active vault: liquidation happens when PLS price drops to debt_value / (collateral * liquidation_ratio)
      // For planning purposes (empty vault): show the PLS price that would liquidate minimum debt
      let liquidationPrice = 0;
      
      if (parseFloat(collateralAmount) > 0 && parseFloat(debtAmount) > 0) {
        // Active vault: actual liquidation price based on current debt/collateral
        liquidationPrice = (parseFloat(debtAmount) * jdaiOracleTarget) / (parseFloat(collateralAmount) * liquidationRatio);
      } else if (liquidationRatio > 0 && jdaiOracleTarget > 0) {
        // Empty vault: show liquidation price for minimum viable vault
        // If user deposits enough PLS for minimum debt, at what PLS price would it liquidate?
        // minDebt = 10 JDAI, collateral needed = minDebt * liquidationRatio / plsPrice  
        // liquidationPrice = minDebt * jdaiOracleTarget / (collateral_for_min_debt * liquidationRatio)
        // Simplified: liquidationPrice = plsPrice / liquidationRatio (the break-even price)
        liquidationPrice = parseFloat(effectivePlsPrice) / liquidationRatio;
      }// Calculate max debt at oracle target price (what you can actually mint)
      const maxDebtAtOraclePrice = jdaiOracleTarget > 0 ? 
        (collateralValue / liquidationRatio) / jdaiOracleTarget : 0;

      setVaultData({
        collateral: collateralAmount,
        debt: debtAmount,
        healthRatio: healthRatio,
        maxDebt: maxDebtAtOraclePrice.toFixed(4),
        liquidationPrice: liquidationPrice.toFixed(8),
        isLoading: false
      });      setSystemData({
        plsPrice: oraclePlsPrice, // Show oracle price in "PLS Oracle Info"
        jdaiPrice: marketJdaiPrice > 0 ? marketJdaiPrice.toString() : formatUnits(par, 27), // Use market price when available
        liquidationRatio: liquidationRatio.toString(),
        stabilityFee: '0.5', // Static for now
        debtCeiling: formatUnits(debtCeiling, 45), // ILK-specific debt ceiling
        totalDebt: formatUnits(totalDebt, 18), // Current total debt for this ILK
        availableDebt: (parseFloat(formatUnits(debtCeiling, 45)) - parseFloat(formatUnits(totalDebt, 18))).toString(),
        minDebt: formatUnits(minDebt, 45), // Minimum debt per vault        // Calculate PLS required for minimum debt
        // minDebt is in rad (45 decimals), spot is in ray (27 decimals)
        // We want: (minDebt / 10^45) / (spot / 10^27) = (minDebt * 10^27) / (spot * 10^45) = minDebt / (spot * 10^18)
        plsRequiredForMinDebt: spot > 0 && minDebt > 0 ? 
          (Number(minDebt) / (Number(spot) * Math.pow(10, 18))).toString() : '0',
        marketPlsPrice: marketPlsPrice.toString(),
        marketJdaiPrice: marketJdaiPrice.toString(),
        oraclePlsPrice: oraclePlsPrice,
        oracleJdaiTarget: jdaiOracleTarget.toString(),
        goldBasedTarget: jdaiOracleTarget.toString(),
        jdaiPremium: marketJdaiPrice > 0 && jdaiOracleTarget > 0 ? 
          ((marketJdaiPrice / jdaiOracleTarget - 1) * 100).toString() : '0',
        effectivePlsPrice: effectivePlsPrice, // For calculations that should use market price when available
        isLoading: false
      });

    } catch (error) {
      console.error('Error fetching vault data:', error);
      setVaultData(prev => ({ ...prev, isLoading: false }));
      setSystemData(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch balances
  const fetchBalances = async () => {
    if (!signer || !account) {
      setBalances(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const provider = signer.provider;
      const jdai = new ethers.Contract(CONTRACTS.JDAI, ABIS.JDAI, signer);

      // Get PLS balance
      const plsBalance = await provider.getBalance(account);
      
      // Get JDAI balance
      const jdaiBalance = await jdai.balanceOf(account);

      setBalances({
        pls: formatEther(plsBalance),
        jdai: formatEther(jdaiBalance),
        isLoading: false
      });

    } catch (error) {
      console.error('Error fetching balances:', error);
      setBalances(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Deposit PLS and mint JDAI
  const depositAndMint = async (plsAmount, jdaiAmount) => {
    if (!signer) throw new Error('Wallet not connected');

    const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
    const ethJoin = new ethers.Contract(CONTRACTS.ETHJOIN, ABIS.ETHJOIN, signer);
    const daiJoin = new ethers.Contract(CONTRACTS.DAIJOIN, ABIS.DAIJOIN, signer);

    // Check approvals
    const canEthJoin = await vat.can(account, CONTRACTS.ETHJOIN);
    const canDaiJoin = await vat.can(account, CONTRACTS.DAIJOIN);

    const transactions = [];

    // Approve if needed
    if (canEthJoin === 0n) {
      const hopeTx = await vat.hope(CONTRACTS.ETHJOIN);
      transactions.push(hopeTx);
      await hopeTx.wait();
    }

    if (canDaiJoin === 0n) {
      const hopeTx = await vat.hope(CONTRACTS.DAIJOIN);
      transactions.push(hopeTx);
      await hopeTx.wait();
    }    // Deposit PLS
    const plsWei = ethers.parseEther(plsAmount);
    const joinTx = await ethJoin.join(account, { value: plsWei });
    transactions.push(joinTx);
    await joinTx.wait();

    // Always call frob to register collateral in vault, with or without debt
    const jdaiWei = parseFloat(jdaiAmount) > 0 ? ethers.parseUnits(jdaiAmount, 18) : 0;
    const frobTx = await vat.frob(ILK, account, account, account, plsWei, jdaiWei);
    transactions.push(frobTx);
    await frobTx.wait();

    // Exit JDAI to wallet if minting
    if (parseFloat(jdaiAmount) > 0) {
      const exitTx = await daiJoin.exit(account, jdaiWei);
      transactions.push(exitTx);
      await exitTx.wait();
    }

    return transactions;
  };
  // Repay JDAI and withdraw PLS
  const repayAndWithdraw = async (jdaiAmount, plsAmount) => {
    if (!signer) throw new Error('Wallet not connected');

    const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
    const ethJoin = new ethers.Contract(CONTRACTS.ETHJOIN, ABIS.ETHJOIN, signer);
    const daiJoin = new ethers.Contract(CONTRACTS.DAIJOIN, ABIS.DAIJOIN, signer);
    const jdai = new ethers.Contract(CONTRACTS.JDAI, ABIS.JDAI, signer);

    const transactions = [];    // Repay JDAI if amount > 0
    if (parseFloat(jdaiAmount) > 0) {
      const jdaiWei = ethers.parseUnits(jdaiAmount, 18);
      
      // Approve JDAI spending
      const allowance = await jdai.allowance(account, CONTRACTS.DAIJOIN);
      if (allowance < jdaiWei) {
        const approveTx = await jdai.approve(CONTRACTS.DAIJOIN, jdaiWei);
        transactions.push(approveTx);
        await approveTx.wait();
      }

      // Join JDAI to system (burns external JDAI, creates internal DAI balance)
      const joinTx = await daiJoin.join(account, jdaiWei);
      transactions.push(joinTx);
      await joinTx.wait();

      // *** FIX: Add missing wipe() call to actually clear the debt ***
      const wipeTx = await vat.wipe(ILK, account, jdaiWei);
      transactions.push(wipeTx);
      await wipeTx.wait();
    }

    // Always modify vault if there's any change (debt or collateral)
    const plsWei = parseFloat(plsAmount) > 0 ? ethers.parseEther(plsAmount) : 0;
    const jdaiWei = parseFloat(jdaiAmount) > 0 ? ethers.parseUnits(jdaiAmount, 18) : 0;
    
    // Only call frob if there's actually something to change
    if (plsWei > 0 || jdaiWei > 0) {
      const frobTx = await vat.frob(
        ILK, 
        account, 
        account, 
        account, 
        plsWei > 0 ? -plsWei : 0,  // negative for withdrawal
        jdaiWei > 0 ? -jdaiWei : 0 // negative for debt reduction
      );
      transactions.push(frobTx);
      await frobTx.wait();
    }

    // Withdraw PLS if amount > 0
    if (parseFloat(plsAmount) > 0) {
      const exitTx = await ethJoin.exit(account, plsWei);
      transactions.push(exitTx);
      await exitTx.wait();
    }

    return transactions;
  };  // Recovery function for users with PLS stuck in gem (moves gem to urn via frob)
  const recoverSpecificAmount = async (plsAmountStuck) => {
    if (!signer || !account) throw new Error('Wallet not connected');

    const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);
    
    // Check approval
    const canEthJoin = await vat.can(account, CONTRACTS.ETHJOIN);
    if (canEthJoin === 0n) {
      const hopeTx = await vat.hope(CONTRACTS.ETHJOIN);
      await hopeTx.wait();
    }

    // Move stuck PLS from ETHJoin to user's vault
    const plsWei = ethers.parseEther(plsAmountStuck);
    const frobTx = await vat.frob(ILK, account, account, account, plsWei, 0);
    await frobTx.wait();
      return frobTx;
  };
  // Clear debt using existing internal DAI balance (for users who burned JDAI but still have debt)
  const clearDebtWithInternalBalance = async () => {
    if (!signer || !account) throw new Error('Wallet not connected');

    const vat = new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer);

    try {
      // Get current debt amount
      const [, art] = await vat.urns(ILK, account);
      console.log('Current debt (art):', art.toString());

      if (art === 0n) {
        throw new Error('No debt to clear');
      }
      
      // Get current internal DAI balance (in RAD - 45 decimals)
      const daiBalance = await vat.dai(account);
      console.log('Internal DAI balance:', daiBalance.toString());
      
      // Convert art (wad) to tab (rad) for comparison
      const ilkData = await vat.ilks(ILK);
      const rate = ilkData.rate;
      console.log('Rate:', rate.toString());
      
      const debtInRad = art * rate;
      console.log('Debt in RAD:', debtInRad.toString());
      
      if (daiBalance < debtInRad) {
        throw new Error(`Insufficient internal DAI balance. Need: ${ethers.formatUnits(debtInRad, 45)} DAI, Have: ${ethers.formatUnits(daiBalance, 45)} DAI`);
      }

      console.log('Calling frob with negative dart:', (-art).toString());
      
      // Use frob to clear debt (negative dart reduces debt)
      const frobTx = await vat.frob(
        ILK,            // ilk: PLS-A
        account,        // u: urn owner
        account,        // v: collateral source (not used)
        account,        // w: debt destination
        0,              // dink: no collateral change
        -art            // dart: negative to reduce debt (art is already BigInt)
      );
      await frobTx.wait();
      
      return frobTx;
    } catch (error) {
      console.error('Error in clearDebtWithInternalBalance:', error);
      throw error;
    }
  };// Refresh all data
  const refresh = async () => {
    await Promise.all([
      fetchVaultData(),
      fetchBalances()
    ]);
  };

  // Auto-refresh on account/signer change
  useEffect(() => {
    // Only load vault data after PulseX prices have been fetched (or failed to load)
    if (signer && account && !priceLoading) {
      refresh();    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, account, priceLoading, marketJdaiPrice, marketPlsPrice]);
  // Contract instances for the wizard
  const contracts = signer ? {
    vat: new ethers.Contract(CONTRACTS.VAT, ABIS.VAT, signer),
    pls: new ethers.Contract(CONTRACTS.PLS, ABIS.PLS, signer),
    jdai: new ethers.Contract(CONTRACTS.JDAI, ABIS.JDAI, signer),
    ethjoin: new ethers.Contract(CONTRACTS.ETHJOIN, ABIS.ETHJOIN, signer),
    daijoin: new ethers.Contract(CONTRACTS.DAIJOIN, ABIS.DAIJOIN, signer)
  } : null;

  return {
    vaultData,
    systemData,
    balances,
    contracts,
    depositAndMint,
    repayAndWithdraw,
    recoverSpecificAmount,
    clearDebtWithInternalBalance,
    refresh
  };
};
