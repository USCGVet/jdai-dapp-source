import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Card, CardHeader, RefreshButton, StatGrid, StatCard, LoadingSpinner, HealthBar } from './StyledComponents';
import { formatNumber, formatCurrency, formatJDAI } from '../utils/formatters';

const VaultOverview = ({ vaultData, systemData, onRefresh, isLoading }) => {
  const getHealthStatus = (ratio) => {
    if (ratio < 1.2) return 'danger';
    if (ratio < 1.5) return 'warning';
    return 'success';
  };

  const getHealthText = (ratio) => {
    if (ratio === Infinity) return 'No Debt';
    if (ratio < 1.2) return 'Critical';
    if (ratio < 1.5) return 'Risky';
    if (ratio < 2.0) return 'Safe';
    return 'Very Safe';
  };

  return (
    <Card>
      <CardHeader>
        <h2>Your Vault</h2>
        <RefreshButton onClick={onRefresh} disabled={isLoading}>
          <FiRefreshCw style={{ 
            animation: isLoading ? 'spin 1s linear infinite' : 'none' 
          }} />
        </RefreshButton>
      </CardHeader>

      {vaultData.isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '1rem', color: '#888' }}>Loading vault data...</p>
        </div>
      ) : (
        <>
          <StatGrid>            <StatCard>
              <div className="label">Collateral (PLS)</div>
              <div className="value">{formatNumber(vaultData.collateral, 3)}</div>
            </StatCard>
            
            <StatCard>
              <div className="label">Debt (JDAI)</div>
              <div className="value">{formatNumber(vaultData.debt, 2)}</div>
            </StatCard>
            
            <StatCard type={getHealthStatus(vaultData.healthRatio)}>
              <div className="label">Health Ratio</div>
              <div className="value">
                {vaultData.healthRatio === Infinity ? '∞' : formatNumber(vaultData.healthRatio, 2)}
              </div>
              <div style={{ 
                fontSize: '0.7rem', 
                marginTop: '0.25rem',
                color: '#888' 
              }}>
                {getHealthText(vaultData.healthRatio)}
              </div>
              {vaultData.healthRatio !== Infinity && (
                <HealthBar ratio={vaultData.healthRatio}>
                  <div className="fill" />
                </HealthBar>
              )}
            </StatCard>
            
            <StatCard>
              <div className="label">Max Debt</div>
              <div className="value">{formatJDAI(vaultData.maxDebt)}</div>
            </StatCard>
          </StatGrid>

          <StatGrid>            <StatCard>
              <div className="label">Liquidation Price</div>
              <div className="value">{formatCurrency(vaultData.liquidationPrice, 6)}</div>
              <div className="sub-value" style={{fontSize: '0.8rem', color: '#888'}}>
                PLS price that triggers liquidation
              </div>
            </StatCard>            <StatCard>
              <div className="label">PLS Oracle Info</div>
              <div className="value">{formatCurrency(systemData.plsPrice, 6)}</div>
              {systemData.marketPlsPrice && parseFloat(systemData.marketPlsPrice) > 0 && (
                <div className="sub-value" style={{fontSize: '0.8rem', color: '#888'}}>
                  Market: {formatCurrency(systemData.marketPlsPrice, 6)}
                </div>
              )}
            </StatCard>
              <StatCard>
              <div className="label">JDAI Price</div>
              <div className="value">{formatCurrency(systemData.jdaiPrice, 4)}</div>
              <div style={{fontSize: '0.8rem', color: '#888', marginTop: '0.5rem'}}>
                <div>🏛️ Oracle Target: {formatCurrency(systemData.goldBasedTarget, 4)} (Gold÷1000)</div>
                {systemData.marketJdaiPrice && parseFloat(systemData.marketJdaiPrice) > 0 && (
                  <>
                    <div>📈 Market Price: {formatCurrency(systemData.marketJdaiPrice, 4)}</div>
                    <div style={{
                      color: parseFloat(systemData.jdaiPremium) > 0 ? '#4ade80' : '#f87171',
                      fontWeight: 'bold'
                    }}>
                      Premium: {parseFloat(systemData.jdaiPremium) > 0 ? '+' : ''}{parseFloat(systemData.jdaiPremium).toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </StatCard>            <StatCard>
              <div className="label">Gold Oracle Info</div>
              <div className="value" style={{fontSize: '0.9rem'}}>
                {systemData.goldBasedTarget && (
                  <>
                    <div>🥇 Implied Gold: ${(parseFloat(systemData.goldBasedTarget) * 1000).toFixed(0)}/oz</div>
                    <div style={{color: '#d4af37', fontSize: '0.8rem', marginTop: '0.3rem'}}>
                      JDAI Target: {formatCurrency(systemData.goldBasedTarget, 4)}
                    </div>
                  </>
                )}
              </div>
            </StatCard>
            
            <StatCard>
              <div className="label">Stability Fee</div>
              <div className="value">{systemData.stabilityFee}% APY</div>
            </StatCard>
          </StatGrid>

          {parseFloat(vaultData.debt) > 0 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'rgba(16, 16, 16, 0.5)',
              borderRadius: '8px',
              border: '1px solid #2a2a2a'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffd700' }}>Vault Health</h4>              <p style={{ margin: '0', fontSize: '0.9rem', color: '#ccc' }}>
                Your vault will be liquidated if PLS price falls below {formatCurrency(vaultData.liquidationPrice, 6)} USD.
                This calculation uses the same formula as the on-chain liquidation contract.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default VaultOverview;
