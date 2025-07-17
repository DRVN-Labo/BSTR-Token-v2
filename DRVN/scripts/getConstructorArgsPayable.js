const { ethers } = require("hardhat");

async function main() {
  const { parseUnits } = ethers;
  
  const initialSupply = parseUnits("1000000000", 9); // 1 billion tokens with 9 decimals
  const feeReceiver = "0xf8492AfeDC885ef3d443F0f51B81B7e70fBCd516";
  const swapRouter = "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602";
  const collectors = ["0x0FbbDDC39cdb1D089779dC770268B1a995Bc527A"];
  const shares = [100];

  // Create interface for payable constructor
  const iface = new ethers.Interface([
    "constructor(uint256,address,address,address[],uint256[]) payable"
  ]);

  // Encode constructor arguments
  const encoded = iface.encodeDeploy([initialSupply, feeReceiver, swapRouter, collectors, shares]);
  
  console.log("=== COPY THIS SINGLE LINE FOR BASESCAN ===");
  console.log(encoded.slice(2)); // Remove '0x' prefix
  console.log("=== END COPY ===");
  
  console.log("\nVerification details:");
  console.log("- Contract Address: 0xcB64a719D7e7749BFD18dc1815f1EF3C28F083E2");
  console.log("- Compiler Version: 0.8.20");
  console.log("- Optimization: Yes, 200 runs");
  console.log("- Constructor Arguments (ABI-encoded): Use the line above");
  console.log("- Note: Constructor is payable but no ETH was sent during deployment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 