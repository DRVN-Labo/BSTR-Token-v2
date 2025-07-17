require("dotenv").config();
const { ethers } = require("hardhat");

const BSTR_TOKEN_ADDRESS = "0xcB64a719D7e7749BFD18dc1815f1EF3C28F083E2"; // Update if needed

async function main() {
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, ethers.provider);
  const bstrToken = await ethers.getContractAt("BSTRToken", BSTR_TOKEN_ADDRESS, deployer);

  // Check contract balance and threshold
  const contractBalance = await bstrToken.balanceOf(BSTR_TOKEN_ADDRESS);
  const totalSupply = await bstrToken.totalSupply();
  const threshold = totalSupply / 10000n;

  console.log(`Contract balance: ${ethers.formatUnits(contractBalance, 9)} BSTR`);
  console.log(`Threshold: ${ethers.formatUnits(threshold, 9)} BSTR`);

  if (contractBalance < threshold) {
    console.log("Threshold not met. processFees will likely revert or do nothing.");
  } else {
    console.log("Threshold met. Calling processFees...");
  }

  // Process only the threshold amount
  const amountToProcess = threshold;
  const minAmountOut = 0n;

  console.log(`Calling processFees with amount: ${ethers.formatUnits(amountToProcess, 9)} BSTR, minAmountOut: ${minAmountOut}`);

  const tx = await bstrToken.processFees(amountToProcess, minAmountOut);
  await tx.wait();
  console.log("processFees transaction sent and confirmed!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
