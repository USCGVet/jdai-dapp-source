# JDAI DApp

A modern, dark-themed React application for interacting with the JDAI stablecoin system on PulseChain.

## Features

- **Wallet Connection**: Connect MetaMask and other Web3 wallets
- **Network Detection**: Automatically detect and switch to PulseChain
- **Vault Management**: Create and manage CDPs (Collateralized Debt Positions)
- **Real-time Data**: Live vault statistics and health monitoring
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern, elegant dark mode interface

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

1. Navigate to the dapp directory:
   ```bash
   cd jdai-dapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

The contract addresses are configured in `src/utils/contracts.js`. Update these with your deployed contract addresses:

```javascript
export const CONTRACTS = {
  VAT: "0x7086692dEe57ebEf0dC66A786198C406CfC259cD",
  SPOTTER: "0x08E744BBe065911F45B86812a0F783bB35fb65eb",
  MEDIANIZER: "0x361630052FfbA8b40473A142264932eBD482426D",
  JDAI: "0x1610E75C9b48BF550137820452dE4049bB22bB72",
  ETHJOIN: "0x7a86c0a6078FA1e2053b0ff9d015B39387570162",
  DAIJOIN: "0xBD767F3Fbdc24c5761e6c2a6C936986683584Ad8",
  JUG: "0xa2817B5a84F0f0fC182D1fB2FAD4Fd7E7dbb762E"
};
```

## Usage

### Creating a Vault

1. Connect your wallet
2. Ensure you're on PulseChain network
3. Enter the amount of PLS you want to deposit as collateral
4. Enter the amount of JDAI you want to mint (optional)
5. Click "Deposit & Mint"

### Managing Your Vault

- **View Health**: Monitor your vault's health ratio and liquidation risk
- **Add Collateral**: Deposit more PLS to improve health ratio
- **Mint More JDAI**: Generate additional debt against your collateral
- **Repay Debt**: Pay back JDAI to reduce liquidation risk
- **Withdraw Collateral**: Remove PLS after repaying sufficient debt

### Safety Features

- **Health Monitoring**: Real-time health ratio calculation
- **Liquidation Warnings**: Visual indicators for risky positions
- **Input Validation**: Prevents invalid transactions
- **Network Verification**: Ensures you're on the correct network

## Architecture

```
src/
├── components/          # React components
│   ├── StyledComponents.js    # Styled components
│   ├── VaultOverview.js       # Vault statistics display
│   └── VaultActions.js        # Vault interaction forms
├── hooks/              # Custom React hooks
│   ├── useWallet.js          # Wallet connection logic
│   └── useVault.js           # Vault data and actions
├── utils/              # Utility functions
│   ├── contracts.js          # Contract addresses and ABIs
│   └── formatters.js         # Number and currency formatting
├── App.js              # Main application component
├── index.js            # Application entry point
└── index.css           # Global styles
```

## Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized files ready for deployment.

## Deployment

The built application can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `build` folder
- **Vercel**: Connect your GitHub repository
- **IPFS**: Upload to decentralized storage
- **Traditional hosting**: Upload files to web server

## Security Considerations

- Always verify contract addresses before interacting
- Keep your private keys secure
- Start with small amounts for testing
- Monitor your vault health regularly
- Understand the risks of liquidation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
