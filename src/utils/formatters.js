import { ethers } from 'ethers';

// Format numbers for display with US number formatting (commas as thousand separators)
export const formatNumber = (value, decimals = 2, suffix = '') => {
  if (!value || isNaN(value)) return '0';
  const num = parseFloat(value);
  if (num === 0) return '0';
  
  // Use US number formatting with commas for all numbers
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: decimals 
  }) + suffix;
};

// Format currency
export const formatCurrency = (value, decimals = 2) => {
  return '$' + formatNumber(value, decimals);
};

// Format PLS amounts
export const formatPLS = (value, decimals = 2) => {
  return formatNumber(value, decimals) + ' PLS';
};

// Format JDAI amounts
export const formatJDAI = (value, decimals = 2) => {
  return formatNumber(value, decimals) + ' JDAI';
};

// Format ethers values
export const formatEther = (value, decimals = 4) => {
  if (!value) return '0';
  return parseFloat(ethers.formatEther(value)).toFixed(decimals);
};

// Format units with custom decimals
export const formatUnits = (value, unitDecimals, displayDecimals = 4) => {
  if (!value) return '0';
  return parseFloat(ethers.formatUnits(value, unitDecimals)).toFixed(displayDecimals);
};

// Parse input values
export const parseEther = (value) => {
  if (!value || value === '') return ethers.parseEther('0');
  try {
    return ethers.parseEther(value.toString());
  } catch (error) {
    return ethers.parseEther('0');
  }
};

// Parse units with custom decimals
export const parseUnits = (value, decimals) => {
  if (!value || value === '') return ethers.parseUnits('0', decimals);
  try {
    return ethers.parseUnits(value.toString(), decimals);
  } catch (error) {
    return ethers.parseUnits('0', decimals);
  }
};

// Calculate health ratio
export const calculateHealthRatio = (collateralValue, debtValue) => {
  if (!debtValue || debtValue === 0) return Infinity;
  return collateralValue / debtValue;
};

// Calculate liquidation price
export const calculateLiquidationPrice = (debt, collateral, liquidationRatio) => {
  if (!collateral || collateral === 0) return 0;
  return (debt * liquidationRatio) / collateral;
};

// Validate input
export const validateInput = (value, max = null) => {
  if (!value || value === '') return true;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return false;
  if (max !== null && num > max) return false;
  return true;
};

// Truncate address
export const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Check if value is safe (above liquidation threshold)
export const isSafeRatio = (ratio, threshold = 1.5) => {
  return ratio > threshold;
};

// Calculate percentage
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
};

// Format numbers with commas (no abbreviations)
export const formatNumberWithCommas = (value, decimals = 2, suffix = '') => {
  if (!value || isNaN(value)) return '0';
  const num = parseFloat(value);
  if (num === 0) return '0';
  
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: decimals 
  }) + suffix;
};
