const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Setting up BSTR Token Test Environment...");
  console.log("=".repeat(50));
  
  // Check environment variables
  console.log("\n📋 Environment Check:");
  const taxTesterKey = process.env.TAX_TESTER_PRIVATE_KEY;
  if (taxTesterKey) {
    console.log("✅ TAX_TESTER_PRIVATE_KEY found");
    const taxTester = new ethers.Wallet(taxTesterKey, ethers.provider);
    console.log(`   Tax Tester Address: ${taxTester.address}`);
  } else {
    console.log("❌ TAX_TESTER_PRIVATE_KEY not found");
    console.log("   Please add TAX_TESTER_PRIVATE_KEY to your .env file");
    console.log("   This wallet will be used to test actual tax payments");
  }
  
  // Check network
  console.log("\n🌐 Network Check:");
  const network = await ethers.provider.getNetwork();
  console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 84532n) { // Base Sepolia
    console.log("⚠️ Warning: Not on Base Sepolia testnet");
    console.log("   Expected Chain ID: 84532 (Base Sepolia)");
    console.log("   Current Chain ID:", network.chainId.toString());
  } else {
    console.log("✅ Connected to Base Sepolia testnet");
  }
  
  // Check signers
  console.log("\n👥 Signer Check:");
  const signers = await ethers.getSigners();
  console.log(`   Available signers: ${signers.length}`);
  
  if (signers.length === 0) {
    console.log("❌ No signers available");
    return;
  }
  
  const deployer = signers[0];
  console.log(`   Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Deployer ETH Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  if (deployerBalance < ethers.parseEther("0.1")) {
    console.log("⚠️ Warning: Deployer has less than 0.1 ETH");
    console.log("   Consider funding the deployer account");
  } else {
    console.log("✅ Deployer has sufficient ETH");
  }
  
  // Check contract
  console.log("\n📄 Contract Check:");
  const BSTR_TOKEN_ADDRESS = "0xcB64a719D7e7749BFD18dc1815f1EF3C28F083E2";
  
  try {
    const bstrToken = await ethers.getContractAt("BSTRToken", BSTR_TOKEN_ADDRESS);
    const totalSupply = await bstrToken.totalSupply();
    const deployerBSTR = await bstrToken.balanceOf(deployer.address);
    
    console.log(`   BSTR Token: ${BSTR_TOKEN_ADDRESS}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 9)} BSTR`);
    console.log(`   Deployer BSTR: ${ethers.formatUnits(deployerBSTR, 9)} BSTR`);
    
    if (deployerBSTR > 0n) {
      console.log("✅ Deployer has BSTR tokens");
    } else {
      console.log("⚠️ Deployer has no BSTR tokens");
    }
    
    // Check contract configuration
    const autoProcessFees = await bstrToken.autoProcessFees();
    const numTokensToSwap = await bstrToken.numTokensToSwap();
    const feeConfig = await bstrToken.feeConfiguration();
    
    console.log(`   Auto Process Fees: ${autoProcessFees ? "ENABLED" : "DISABLED"}`);
    console.log(`   Num Tokens To Swap: ${ethers.formatUnits(numTokensToSwap, 9)} BSTR`);
    console.log(`   Buy Fees: ${Number(feeConfig.buyFees) / 100}%`);
    console.log(`   Sell Fees: ${Number(feeConfig.sellFees) / 100}%`);
    
  } catch (error) {
    console.log(`❌ Failed to connect to BSTR token: ${error.message}`);
    console.log("   Make sure the contract address is correct");
  }
  
  // Check router
  console.log("\n🔄 Router Check:");
  const SWAP_ROUTER = "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602";
  
  try {
    const swapRouter = await ethers.getContractAt("IUniswapV2Router02", SWAP_ROUTER);
    const factoryAddress = await swapRouter.factory();
    const wethAddress = await swapRouter.WETH();
    
    console.log(`   Router: ${SWAP_ROUTER}`);
    console.log(`   Factory: ${factoryAddress}`);
    console.log(`   WETH: ${wethAddress}`);
    console.log("✅ Router connection successful");
    
  } catch (error) {
    console.log(`❌ Failed to connect to router: ${error.message}`);
  }
  
  // Summary
  console.log("\n📊 Setup Summary:");
  console.log("=".repeat(30));
  
  const issues = [];
  if (!taxTesterKey) issues.push("Missing TAX_TESTER_PRIVATE_KEY");
  if (network.chainId !== 84532n) issues.push("Wrong network (should be Base Sepolia)");
  if (deployerBalance < ethers.parseEther("0.08")) issues.push("Low deployer ETH balance");
  
  if (issues.length === 0) {
    console.log("✅ Environment is ready for testing!");
    console.log("\n🚀 You can now run tests with:");
    console.log("   npx hardhat run scripts/test-runner.js all");
    console.log("   npx hardhat run scripts/test-runner.js buys");
    console.log("   npx hardhat run scripts/test-runner.js sells");
  } else {
    console.log("⚠️ Issues found:");
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log("\n🔧 Please fix these issues before running tests");
  }
  
  console.log("\n📚 Available Test Commands:");
  console.log("   npx hardhat run scripts/test-runner.js help");
  console.log("   npx hardhat run scripts/test-runner.js all");
  console.log("   npx hardhat run scripts/test-runner.js contract-state");
  console.log("   npx hardhat run scripts/test-runner.js liquidity");
  console.log("   npx hardhat run scripts/test-runner.js buys");
  console.log("   npx hardhat run scripts/test-runner.js sells");
  console.log("   npx hardhat run scripts/test-runner.js threshold");
  console.log("   npx hardhat run scripts/test-runner.js auto-processing");
  console.log("   npx hardhat run scripts/test-runner.js fee-distribution");
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
}); 