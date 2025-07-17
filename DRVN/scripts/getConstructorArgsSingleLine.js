const { ethers } = require("hardhat");

async function main() {
  const { parseUnits } = ethers;
  
  const initialSupply = parseUnits("1000000000", 9); // 1 billion tokens with 9 decimals
  const feeReceiver = "0xf8492AfeDC885ef3d443F0f51B81B7e70fBCd516";
  const swapRouter = "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602";
  const collectors = ["0x0FbbDDC39cdb1D089779dC770268B1a995Bc527A"];
  const shares = [100];

  // Create interface for constructor
  const iface = new ethers.Interface([
    "constructor(uint256,address,address,address[],uint256[])"
  ]);

  // Encode constructor arguments
  const encoded = iface.encodeDeploy([initialSupply, feeReceiver, swapRouter, collectors, shares]);
  
  // Output as single line without any formatting
  process.stdout.write(encoded.slice(2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 