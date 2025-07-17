const { ethers } = require("hardhat");

// Import the comprehensive test suite
const ComprehensiveTestSuite = require("./comprehensive-test-suite.js").ComprehensiveTestSuite;

// ===== COMMAND LINE ARGUMENTS =====
const args = process.argv.slice(2);
const command = args[0] || "all";

// ===== AVAILABLE TESTS =====
const AVAILABLE_TESTS = {
  "contract-state": "Test contract state and configuration",
  "liquidity": "Test liquidity setup and pool creation",
  "fee-exclusions": "Test fee exclusion configuration",
  "buys": "Test buy transactions and tax collection",
  "sells": "Test sell transactions and tax collection",
  "threshold": "Test threshold triggering mechanism",
  "auto-processing": "Test automatic fee processing",
  "fee-distribution": "Test manual fee distribution",
  "all": "Run all tests in sequence"
};

// ===== HELP FUNCTION =====
function showHelp() {
  console.log("🚀 BSTR Token Test Runner");
  console.log("==========================");
  console.log("");
  console.log("Usage: npx hardhat run scripts/test-runner.js [test-name]");
  console.log("");
  console.log("Available tests:");
  Object.entries(AVAILABLE_TESTS).forEach(([test, description]) => {
    console.log(`  ${test.padEnd(20)} - ${description}`);
  });
  console.log("");
  console.log("Examples:");
  console.log("  npx hardhat run scripts/test-runner.js all");
  console.log("  npx hardhat run scripts/test-runner.js buys");
  console.log("  npx hardhat run scripts/test-runner.js sells");
  console.log("");
  console.log("Environment Variables:");
  console.log("  TAX_TESTER_PRIVATE_KEY - Required for tax testing");
  console.log("");
}

// ===== MAIN EXECUTION =====
async function main() {
  // Show help if requested
  if (command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  // Validate command
  if (!AVAILABLE_TESTS[command]) {
    console.error(`❌ Unknown test: ${command}`);
    console.log("");
    showHelp();
    process.exit(1);
  }

  // Check for required environment variables
  if (!process.env.TAX_TESTER_PRIVATE_KEY) {
    console.error("❌ TAX_TESTER_PRIVATE_KEY not found in environment variables!");
    console.log("Please add TAX_TESTER_PRIVATE_KEY to your .env file");
    console.log("This wallet will be used to test actual tax payments.");
    process.exit(1);
  }

  console.log(`🎯 Running test: ${command}`);
  console.log(`📝 Description: ${AVAILABLE_TESTS[command]}`);
  console.log("");

  try {
    const testSuite = new ComprehensiveTestSuite();
    
    if (command === "all") {
      // Run all tests
      await testSuite.runAllTests();
    } else {
      // Run specific test
      await testSuite.initialize();
      
      switch (command) {
        case "contract-state":
          await testSuite.testContractState();
          break;
        case "liquidity":
          await testSuite.testLiquiditySetup();
          break;
        case "fee-exclusions":
          await testSuite.testFeeExclusions();
          break;
        case "buys":
          await testSuite.testBuyTransactions();
          break;
        case "sells":
          await testSuite.testSellTransactions();
          break;
        case "threshold":
          await testSuite.testThresholdTrigger();
          break;
        case "auto-processing":
          await testSuite.testAutomaticProcessing();
          break;
        case "fee-distribution":
          await testSuite.testFeeDistribution();
          break;
        default:
          throw new Error(`Unknown test: ${command}`);
      }
      
      await testSuite.printResults();
    }
    
  } catch (error) {
    console.error(`❌ Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { ComprehensiveTestSuite };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Test runner failed:", error);
    process.exit(1);
  });
} 