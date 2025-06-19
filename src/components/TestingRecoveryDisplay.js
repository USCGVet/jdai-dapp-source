// Temporary modification for testing - add this to your main vault component

const VaultComponent = ({ signer, account }) => {
  const { vaultData, systemData, balances, refresh } = useVault(signer, account);
  
  // TESTING: Force show recovery tool (remove this line in production)
  const forceShowRecovery = true;
  
  return (
    <div className="space-y-6">
      {/* Testing Banner */}
      {forceShowRecovery && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-purple-800 font-medium">🧪 Testing Mode</h3>
          <p className="text-purple-600 text-sm">Recovery tool is force-displayed for testing</p>
        </div>
      )}

      {/* Always show recovery option for connected users */}
      {account && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">PLS Recovery Tool</h3>
              <p className="text-sm text-blue-600">
                Missing PLS from a deposit? Our recovery tool can help.
              </p>
            </div>
            <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Show Recovery Tool
            </button>
          </div>
        </div>
      )}

      {/* Force show recovery tool for testing */}
      {(forceShowRecovery || account) && (
        <PLSRecovery 
          signer={signer} 
          account={account} 
          onRecoveryComplete={refresh}
        />
      )}

      {/* ...existing vault UI... */}
    </div>
  );
};