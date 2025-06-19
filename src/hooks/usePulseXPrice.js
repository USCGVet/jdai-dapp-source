import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// PulseX v2 Pair ABI (simplified for price fetching)
const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)"
];

export const usePulseXPrice = (oraclePlsPrice = 0) => {
  const [jdaiPrice, setJdaiPrice] = useState(0);
  const [plsPrice, setPlsPrice] = useState(0);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState(null);

  const JDAI_PLS_PAIR = "0x70658Ce6D6C09acdE646F6ea9C57Ba64f4Dc350f";
  const JDAI_ADDRESS = "0x1610E75C9b48BF550137820452dE4049bB22bB72";
  // const WPLS_ADDRESS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"; // Wrapped PLS - unused

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get provider
        const provider = new ethers.JsonRpcProvider('https://rpc.pulsechain.com');
        
        // Get pair contract
        const pairContract = new ethers.Contract(JDAI_PLS_PAIR, PAIR_ABI, provider);
        
        // Get reserves and token order
        const [reserve0, reserve1] = await pairContract.getReserves();
        const token0 = await pairContract.token0();
        const token1 = await pairContract.token1();
        
        // Get token decimals
        const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
        const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
        
        const decimals0 = await token0Contract.decimals();
        const decimals1 = await token1Contract.decimals();
        
        // Determine which token is JDAI and which is PLS
        let jdaiReserve, plsReserve, jdaiDecimals, plsDecimals;
        
        if (token0.toLowerCase() === JDAI_ADDRESS.toLowerCase()) {
          jdaiReserve = reserve0;
          plsReserve = reserve1;
          jdaiDecimals = decimals0;
          plsDecimals = decimals1;
        } else {
          jdaiReserve = reserve1;
          plsReserve = reserve0;
          jdaiDecimals = decimals1;
          plsDecimals = decimals0;
        }
        
        // Calculate price: 1 JDAI = X PLS
        const jdaiReserveFormatted = Number(ethers.formatUnits(jdaiReserve, jdaiDecimals));
        const plsReserveFormatted = Number(ethers.formatUnits(plsReserve, plsDecimals));        if (jdaiReserveFormatted > 0) {
          const jdaiPriceInPLS = plsReserveFormatted / jdaiReserveFormatted;
          
          // Calculate JDAI USD price using oracle PLS price if available
          let jdaiPriceUSD = 0;
          if (oraclePlsPrice > 0) {
            jdaiPriceUSD = jdaiPriceInPLS * oraclePlsPrice;
          }
          
          console.log('PulseX Data:', {
            jdaiPriceInPLS,
            jdaiPriceUSD: jdaiPriceUSD || 'Waiting for oracle PLS price',
            oraclePlsPrice,
            reserves: { jdai: jdaiReserveFormatted, pls: plsReserveFormatted },
            calculation: `${jdaiPriceInPLS.toFixed(2)} PLS/JDAI × $${oraclePlsPrice} PLS/USD = $${jdaiPriceUSD.toFixed(4)} JDAI/USD`
          });
          
          setJdaiPrice(jdaiPriceUSD);
          setPlsPrice(oraclePlsPrice); // Use oracle PLS price
        }
        
      } catch (err) {
        console.error('Error fetching PulseX prices:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }    };    fetchPrices();
    
    // Update every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    
    // Timeout to ensure loading doesn't stay true forever
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 second max wait
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [oraclePlsPrice]); // Re-run when oracle PLS price changes

  const refresh = () => {
    setLoading(true);
    // The useEffect will handle the actual refresh
  };

  return {
    jdaiPrice,
    plsPrice,
    loading,
    error,
    refresh
  };
};
