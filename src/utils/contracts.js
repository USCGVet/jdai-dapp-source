// Contract addresses - Update these with your deployed contracts
export const CONTRACTS = {
  VAT: "0x7086692dEe57ebEf0dC66A786198C406CfC259cD",
  SPOTTER: "0x08E744BBe065911F45B86812a0F783bB35fb65eb",
  MEDIANIZER: "0x361630052FfbA8b40473A142264932eBD482426D",
  JDAI: "0x1610E75C9b48BF550137820452dE4049bB22bB72",
  PLS: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27", // Wrapped PLS (WPLS) - NOT USED with ETHJoin
  ETHJOIN: "0x7a86c0a6078FA1e2053b0ff9d015B39387570162", // This is actually an ETHJoin for native PLS
  DAIJOIN: "0xBD767F3Fbdc24c5761e6c2a6C936986683584Ad8",
  JUG: "0xa2817B5a84F0f0fC182D1fB2FAD4Fd7E7dbb762E"
};

// PulseChain network configuration
export const PULSECHAIN_CONFIG = {
  chainId: 369,
  chainName: "PulseChain",
  rpcUrls: ["https://rpc.pulsechain.com"],
  blockExplorerUrls: ["https://scan.mypinata.cloud/ipfs/bafybeidn64pd2u525lmoipjl4nh3ooa2imd7huionjsdepdsphl5slfowy/"],
  nativeCurrency: {
    name: "PLS",
    symbol: "PLS",
    decimals: 18
  }
};

// ILK identifier for PLS collateral
export const ILK = "0x504c532d41000000000000000000000000000000000000000000000000000000"; // "PLS-A"

// Contract ABIs
export const ABIS = {  VAT: [
    "function hope(address usr) external",
    "function can(address,address) external view returns (uint256)",
    "function ilks(bytes32) external view returns (uint256 Art, uint256 rate, uint256 spot, uint256 line, uint256 dust)",
    "function urns(bytes32,address) external view returns (uint256 ink, uint256 art)",
    "function frob(bytes32 i, address u, address v, address w, int dink, int dart) external",
    "function wipe(bytes32 i, address u, uint256 rad) external",
    "function dai(address) external view returns (uint256)",
    "function gem(bytes32,address) external view returns (uint256)",
    "function Line() external view returns (uint256)",
    "function live() external view returns (uint256)",
    "function debt() external view returns (uint256)",
    "function vice() external view returns (uint256)"
  ],    ETHJOIN: [
    "function join(address usr) external payable",
    "function exit(address payable usr, uint wad) external",
    "function vat() external view returns (address)",
    "function ilk() external view returns (bytes32)",
    "function live() external view returns (uint256)",
    "function wards(address) external view returns (uint256)",
    "function rely(address usr) external",
    "function deny(address usr) external",
    "function cage() external"
  ],
  
  DAIJOIN: [
    "function join(address usr, uint wad) external",
    "function exit(address usr, uint wad) external",
    "function vat() external view returns (address)",
    "function dai() external view returns (address)"
  ],
    JDAI: [
    "function balanceOf(address) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)"
  ],

  PLS: [
    "function balanceOf(address) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)"
  ],
    SPOTTER: [
    "function par() external view returns (uint256)",
    "function ilks(bytes32) external view returns (address pip, uint256 mat)",
    "function poke(bytes32 ilk) external",
    "function live() external view returns (uint256)"
  ],
  
  MEDIANIZER: [
    "function read() external view returns (bytes32)",
    "function peek() external view returns (bytes32, bool)"
  ]
};
