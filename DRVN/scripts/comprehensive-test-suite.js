const { ethers } = require("hardhat");
const { parseUnits, parseEther } = require("ethers");
const IUniswapV2PairABI = require('@uniswap/v2-core/build/IUniswapV2Pair.json').abi;

// ===== CONFIGURATION =====
const CONFIG = {
  // Contract addresses
  BSTR_TOKEN_ADDRESS: "0xcB64a719D7e7749BFD18dc1815f1EF3C28F083E2", // Updated address
  SWAP_ROUTER: "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602",
  WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
  COLLECTOR_ADDRESS: "0x0FbbDDC39cdb1D089779dC770268B1a995Bc527A",
  
  // Test parameters
  LIQUIDITY: {
    BSTR_AMOUNT: "2000000", // 2M BSTR
    ETH_AMOUNT: "0.08",   // 0.08 ETH
  },
  
  TRADING: {
    BUY_ETH_AMOUNT: "0.004", // 0.004 ETH per buy
    SELL_PERCENTAGE: 10,     // 10% of balance to sell
    NUM_BUYS: 3,             // Number of test buys
    DELAY_BETWEEN_BUYS: 10000, // 10 seconds
  },
  
  THRESHOLD: {
    MAX_TRADES: 35,          // Max trades to reach threshold
    BUY_AMOUNT_PER_TRADE: "0.01", // ETH per trade
  }
};

// ===== TEST SUITE CLASS =====
class ComprehensiveTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.bstrToken = null;
    this.swapRouter = null;
    this.deployer = null;
    this.taxTester = null;
    this.liquidityProvider = null;
  }

  async log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : type === "warning" ? "⚠️" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async logTestResult(testName, passed, details = "") {
    const result = {
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    
    if (passed) {
      this.results.passed++;
      await this.log(`${testName}: PASSED`, "success");
    } else {
      this.results.failed++;
      await this.log(`${testName}: FAILED - ${details}`, "error");
    }
  }

  async initialize() {
    await this.log("🚀 Initializing Comprehensive Test Suite...");
    
    // Get signers
    const signers = await ethers.getSigners();
    this.deployer = signers[0];
    this.liquidityProvider = signers[1] || signers[0];
    
    // Create tax tester wallet
    const taxTesterPrivateKey = process.env.TAX_TESTER_PRIVATE_KEY;
    if (!taxTesterPrivateKey) {
      throw new Error("TAX_TESTER_PRIVATE_KEY not found in environment variables!");
    }
    this.taxTester = new ethers.Wallet(taxTesterPrivateKey, ethers.provider);
    
    // Get contract instances
    this.bstrToken = await ethers.getContractAt("BSTRToken", CONFIG.BSTR_TOKEN_ADDRESS);
    this.swapRouter = await ethers.getContractAt("IUniswapV2Router02", CONFIG.SWAP_ROUTER);
    
    await this.log("✅ Test suite initialized successfully");
    await this.log(`Deployer: ${this.deployer.address}`);
    await this.log(`Tax Tester: ${this.taxTester.address}`);
    await this.log(`Liquidity Provider: ${this.liquidityProvider.address}`);
  }

  async testContractState() {
    await this.log("🔍 Testing Contract State...");
    
    try {
      const contractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const totalSupply = await this.bstrToken.totalSupply();
      const threshold = totalSupply / 10000n;
      const autoProcessFees = await this.bstrToken.autoProcessFees();
      const numTokensToSwap = await this.bstrToken.numTokensToSwap();
      
      await this.log(`Contract Balance: ${ethers.formatUnits(contractBalance, 9)} BSTR`);
      await this.log(`Threshold: ${ethers.formatUnits(threshold, 9)} BSTR`);
      await this.log(`Auto Process Fees: ${autoProcessFees ? "ENABLED" : "DISABLED"}`);
      await this.log(`Num Tokens To Swap: ${ethers.formatUnits(numTokensToSwap, 9)} BSTR`);
      
      await this.logTestResult("Contract State Check", true, "Contract state retrieved successfully");
      return { contractBalance, threshold, autoProcessFees };
    } catch (error) {
      await this.logTestResult("Contract State Check", false, error.message);
      throw error;
    }
  }

  async testLiquiditySetup() {
    await this.log("🏊‍♂️ Checking Liquidity Setup...");
    try {
      const swapPair = await this.bstrToken.swapPair();
      console.log(`Swap Pair: ${swapPair}`);

      let pairExists = false;
      if (swapPair !== ethers.ZeroAddress) {
        const code = await ethers.provider.getCode(swapPair);
        if (code !== "0x") {
          pairExists = true;
        }
      }

      if (!pairExists) {
        await this.logTestResult("Liquidity Setup", false, "Pair does not exist or is not deployed. Please fund the pool before running tests.");
        throw new Error("Pair does not exist or is not deployed. Please fund the pool before running tests.");
      } else {
        // Now it's safe to call getReserves()
        const pair = new ethers.Contract(swapPair, IUniswapV2PairABI, ethers.provider);
        const reserves = await pair.getReserves();
        await this.log(`Current pool reserves: reserve0=${reserves[0].toString()}, reserve1=${reserves[1].toString()}`);
        if (reserves[0] === 0n && reserves[1] === 0n) {
          await this.logTestResult("Liquidity Setup", false, "Pool exists but has zero liquidity. Please fund the pool before running tests.");
          throw new Error("Pool exists but has zero liquidity. Please fund the pool before running tests.");
        } else {
          await this.logTestResult("Liquidity Setup", true, "Liquidity is present in the pool.");
        }
      }
    } catch (error) {
      await this.logTestResult("Liquidity Setup", false, error.message);
      throw error;
    }
  }

  async testFeeExclusions() {
    await this.log("🔒 Testing Fee Exclusions...");
    
    try {
      // Remove test user from fee exclusions
      const isExcludedTestUser = await this.bstrToken.isExcludedFromFees(this.taxTester.address);
      if (isExcludedTestUser) {
        await this.bstrToken.setIsExcludedFromFees(this.taxTester.address, false);
        await this.log("Removed tax tester from fee exclusions");
      }
      
      // Ensure router is not excluded
      const isExcludedRouter = await this.bstrToken.isExcludedFromFees(CONFIG.SWAP_ROUTER);
      if (isExcludedRouter) {
        await this.bstrToken.setIsExcludedFromFees(CONFIG.SWAP_ROUTER, false);
        await this.log("Removed router from fee exclusions");
      }
      
      await this.logTestResult("Fee Exclusions", true, "Fee exclusions configured correctly");
    } catch (error) {
      await this.logTestResult("Fee Exclusions", false, error.message);
      throw error;
    }
  }

  async testBuyTransactions() {
    await this.log("📈 Testing Buy Transactions...");
    
    try {
      const buyAmount = parseEther(CONFIG.TRADING.BUY_ETH_AMOUNT);
      const path = [CONFIG.WETH_ADDRESS, CONFIG.BSTR_TOKEN_ADDRESS];
      const routerTestUser = this.swapRouter.connect(this.taxTester);
      
      let totalTaxCollected = 0n;
      const initialContractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      
      for (let i = 1; i <= CONFIG.TRADING.NUM_BUYS; i++) {
        await this.log(`Buy ${i}/${CONFIG.TRADING.NUM_BUYS}...`);
        
        const contractBalanceBefore = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
        const userBalanceBefore = await this.bstrToken.balanceOf(this.taxTester.address);
        
        const swapTx = await routerTestUser.swapExactETHForTokensSupportingFeeOnTransferTokens(
          0n,
          path,
          this.taxTester.address,
          Math.floor(Date.now() / 1000) + 300,
          { value: buyAmount }
        );
        
        await swapTx.wait();
        
        const contractBalanceAfter = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
        const userBalanceAfter = await this.bstrToken.balanceOf(this.taxTester.address);
        
        const taxCollected = contractBalanceAfter - contractBalanceBefore;
        const tokensReceived = userBalanceAfter - userBalanceBefore;
        
        totalTaxCollected += taxCollected;
        
        await this.log(`Buy ${i} complete - Tax: ${ethers.formatUnits(taxCollected, 9)} BSTR, Received: ${ethers.formatUnits(tokensReceived, 9)} BSTR`);
        
        if (i < CONFIG.TRADING.NUM_BUYS) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.TRADING.DELAY_BETWEEN_BUYS));
        }
      }
      
      await this.log(`Total tax collected: ${ethers.formatUnits(totalTaxCollected, 9)} BSTR`);
      await this.logTestResult("Buy Transactions", true, `${CONFIG.TRADING.NUM_BUYS} buy transactions completed`);
      
      return totalTaxCollected;
    } catch (error) {
      await this.logTestResult("Buy Transactions", false, error.message);
      throw error;
    }
  }

  async testSellTransactions() {
    await this.log("📉 Testing Sell Transactions...");
    
    try {
      const userBalance = await this.bstrToken.balanceOf(this.taxTester.address);
      if (userBalance === 0n) {
        throw new Error("No BSTR tokens to sell");
      }
      
      const sellAmount = userBalance / BigInt(CONFIG.TRADING.SELL_PERCENTAGE);
      const path = [CONFIG.BSTR_TOKEN_ADDRESS, CONFIG.WETH_ADDRESS];
      const routerTestUser = this.swapRouter.connect(this.taxTester);
      const bstrTestUser = this.bstrToken.connect(this.taxTester);
      
      // Clear and set approval
      await bstrTestUser.approve(CONFIG.SWAP_ROUTER, 0n);
      await bstrTestUser.approve(CONFIG.SWAP_ROUTER, sellAmount);
      
      const contractBalanceBefore = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      
      const sellTx = await routerTestUser.swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmount,
        0n,
        path,
        this.taxTester.address,
        Math.floor(Date.now() / 1000) + 300
      );
      
      await sellTx.wait();
      
      const contractBalanceAfter = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const taxCollected = contractBalanceAfter - contractBalanceBefore;
      
      await this.log(`Sell complete - Tax collected: ${ethers.formatUnits(taxCollected, 9)} BSTR`);
      await this.logTestResult("Sell Transactions", true, "Sell transaction completed successfully");
      
      return taxCollected;
    } catch (error) {
      await this.logTestResult("Sell Transactions", false, error.message);
      // Do NOT throw error, just log and continue
      await this.log("Continuing to next test despite sell transaction failure.", "warning");
      return null;
    }
  }

  async testThresholdTrigger() {
    await this.log("🎯 Testing Threshold Trigger...");
    
    try {
      const contractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const totalSupply = await this.bstrToken.totalSupply();
      const threshold = totalSupply / 10000n;
      
      await this.log(`Current balance: ${ethers.formatUnits(contractBalance, 9)} BSTR`);
      await this.log(`Threshold: ${ethers.formatUnits(threshold, 9)} BSTR`);
      await this.log(`Progress: ${((Number(contractBalance) / Number(threshold)) * 100).toFixed(2)}%`);
      
      if (contractBalance >= threshold) {
        await this.log("Threshold already reached!");
        await this.logTestResult("Threshold Trigger", true, "Threshold already reached");
        return true;
      }
      
      // Perform trades to reach threshold
      const buyAmount = parseEther(CONFIG.THRESHOLD.BUY_AMOUNT_PER_TRADE);
      const path = [CONFIG.WETH_ADDRESS, CONFIG.BSTR_TOKEN_ADDRESS];
      const routerTestUser = this.swapRouter.connect(this.taxTester);
      
      let tradeCount = 0;
      let currentBalance = contractBalance;
      
      while (currentBalance < threshold && tradeCount < CONFIG.THRESHOLD.MAX_TRADES) {
        tradeCount++;
        await this.log(`Trade #${tradeCount} - Reaching threshold...`);
        
        const balanceBefore = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
        
        const swapTx = await routerTestUser.swapExactETHForTokensSupportingFeeOnTransferTokens(
          0n,
          path,
          this.taxTester.address,
          Math.floor(Date.now() / 1000) + 300,
          { value: buyAmount }
        );
        
        await swapTx.wait();
        
        const balanceAfter = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
        currentBalance = balanceAfter;
        
        await this.log(`Progress: ${((Number(balanceAfter) / Number(threshold)) * 100).toFixed(2)}%`);
        
        if (balanceAfter >= threshold) {
          await this.log("🎉 Threshold reached!");
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const finalBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const thresholdReached = finalBalance >= threshold;
      
      await this.logTestResult("Threshold Trigger", thresholdReached, 
        thresholdReached ? "Threshold reached successfully" : `Only reached ${ethers.formatUnits(finalBalance, 9)}/${ethers.formatUnits(threshold, 9)} BSTR`);
      
      return thresholdReached;
    } catch (error) {
      await this.logTestResult("Threshold Trigger", false, error.message);
      throw error;
    }
  }

  async testAutomaticProcessing() {
    await this.log("⚡ Testing Automatic Fee Processing...");
    
    try {
      const contractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const totalSupply = await this.bstrToken.totalSupply();
      const threshold = totalSupply / 10000n;
      
      if (contractBalance < threshold) {
        await this.log("Threshold not reached, skipping automatic processing test");
        await this.logTestResult("Automatic Processing", true, "Skipped - threshold not reached");
        return false;
      }
      
      // Perform a sell to trigger automatic processing
      const userBalance = await this.bstrToken.balanceOf(this.taxTester.address);
      if (userBalance === 0n) {
        throw new Error("No BSTR tokens to sell for automatic processing test");
      }
      
      const sellAmount = userBalance / 100n; // Sell 1%
      const path = [CONFIG.BSTR_TOKEN_ADDRESS, CONFIG.WETH_ADDRESS];
      const routerTestUser = this.swapRouter.connect(this.taxTester);
      const bstrTestUser = this.bstrToken.connect(this.taxTester);
      
      // Set approval
      await bstrTestUser.approve(CONFIG.SWAP_ROUTER, sellAmount);
      
      const balanceBefore = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      
      const sellTx = await routerTestUser.swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmount,
        0n,
        path,
        this.taxTester.address,
        Math.floor(Date.now() / 1000) + 300
      );
      
      await sellTx.wait();
      
      const balanceAfter = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const processingTriggered = balanceAfter < balanceBefore;
      
      if (processingTriggered) {
        await this.log("🎉 Automatic fee processing triggered!");
        await this.log(`Contract balance decreased by: ${ethers.formatUnits(balanceBefore - balanceAfter, 9)} BSTR`);
      } else {
        await this.log("⚠️ No automatic processing detected");
      }
      
      await this.logTestResult("Automatic Processing", processingTriggered, 
        processingTriggered ? "Automatic processing triggered successfully" : "No automatic processing detected");
      
      return processingTriggered;
    } catch (error) {
      await this.logTestResult("Automatic Processing", false, error.message);
      throw error;
    }
  }

  async testFeeDistribution() {
    await this.log("💰 Testing Fee Distribution...");
    
    try {
      const contractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const collectorBalance = await this.bstrToken.balanceOf(CONFIG.COLLECTOR_ADDRESS);
      
      if (contractBalance === 0n) {
        await this.log("No fees to distribute");
        await this.logTestResult("Fee Distribution", true, "No fees to distribute");
        return false;
      }
      
      // Try to distribute a small amount
      const distributeAmount = contractBalance / 10n; // 10% of current balance
      
      await this.log(`Attempting to distribute ${ethers.formatUnits(distributeAmount, 9)} BSTR...`);
      
      const tx = await this.bstrToken.distributeFees(distributeAmount, true);
      await tx.wait();
      
      const newContractBalance = await this.bstrToken.balanceOf(CONFIG.BSTR_TOKEN_ADDRESS);
      const newCollectorBalance = await this.bstrToken.balanceOf(CONFIG.COLLECTOR_ADDRESS);
      
      const amountDistributed = contractBalance - newContractBalance;
      const collectorReceived = newCollectorBalance - collectorBalance;
      
      await this.log(`Amount distributed: ${ethers.formatUnits(amountDistributed, 9)} BSTR`);
      await this.log(`Collector received: ${ethers.formatUnits(collectorReceived, 9)} BSTR`);
      
      const distributionSuccessful = amountDistributed > 0n && collectorReceived > 0n;
      
      await this.logTestResult("Fee Distribution", distributionSuccessful, 
        distributionSuccessful ? "Fee distribution successful" : "Fee distribution failed");
      
      return distributionSuccessful;
    } catch (error) {
      await this.logTestResult("Fee Distribution", false, error.message);
      throw error;
    }
  }

  async runAllTests() {
    await this.log("🎯 Starting Comprehensive Test Suite...");
    
    try {
      await this.initialize();
      
      // Run all tests in sequence
      await this.testContractState();
      await this.testLiquiditySetup();
      await this.testFeeExclusions();
      await this.testBuyTransactions();
      await this.testSellTransactions();
      await this.testThresholdTrigger();
      await this.testAutomaticProcessing();
      await this.testFeeDistribution();
      
      // Print final results
      await this.printResults();
      
    } catch (error) {
      await this.log(`❌ Test suite failed: ${error.message}`, "error");
      await this.printResults();
      throw error;
    }
  }

  async printResults() {
    await this.log("\n📊 TEST SUITE RESULTS");
    await this.log("=".repeat(50));
    await this.log(`✅ Passed: ${this.results.passed}`);
    await this.log(`❌ Failed: ${this.results.failed}`);
    await this.log(`⏭️ Skipped: ${this.results.skipped}`);
    await this.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    
    await this.log("\n📋 Detailed Results:");
    for (const test of this.results.tests) {
      const status = test.passed ? "✅" : "❌";
      await this.log(`${status} ${test.name}: ${test.details}`);
    }
    
    if (this.results.failed === 0) {
      await this.log("\n🎉 ALL TESTS PASSED! Your BSTR token is working correctly!", "success");
    } else {
      await this.log(`\n⚠️ ${this.results.failed} test(s) failed. Please check the details above.`, "warning");
    }
  }
}

// ===== MAIN EXECUTION =====
async function main() {
  const testSuite = new ComprehensiveTestSuite();
  await testSuite.runAllTests();
}

// Export the class for use in other scripts
module.exports = { ComprehensiveTestSuite };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Test suite execution failed:", error);
    process.exit(1);
  });
} 