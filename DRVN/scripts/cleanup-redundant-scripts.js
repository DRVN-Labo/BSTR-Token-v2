const fs = require('fs');
const path = require('path');

// Scripts to remove (redundant with comprehensive test suite)
const REDUNDANT_SCRIPTS = [
  // Test scripts replaced by comprehensive suite
  'test-threshold-trigger.js',
  'test-small-sell.js',
  'test-liquidity-and-swaps.js',
  'test-liquidity-and-swaps-with-taxes.js',
  'test-distribute-fees.js',
  'test-automatic-processing.js',
  'manual-fee-processing.js',
  'test-base-sepolia-router.js',
  
  // Check scripts integrated into comprehensive suite
  'check-contract-state.js',
  'check-contract-balance.js',
  'check-liquidity.js',
  'check-transaction.js',
  'check-recent-transactions.js',
  'check-base-sepolia-dexes.js',
  'check-alternative-dexes.js',
  'verify-signers.js'
];

// Scripts to keep (essential or still useful)
const KEEP_SCRIPTS = [
  // New comprehensive test suite
  'comprehensive-test-suite.js',
  'test-runner.js',
  'setup-test-environment.js',
  'README-TEST-SUITE.md',
  
  // Utility scripts
  'listAccount.ts',
  'generateAccount.ts.ts',
  'test-pool.ts',
  'test-fork.ts',
  
  // Constructor/deployment scripts
  'getConstructorArgs.js',
  'getConstructorArgsPayable.js',
  'getConstructorArgsSingleLine.js',
  'constructor-args.js',
  
  // Cleanup script itself
  'cleanup-redundant-scripts.js'
];

function cleanupScripts() {
  console.log("🧹 Cleaning up redundant scripts...");
  console.log("=".repeat(50));
  
  const scriptsDir = __dirname;
  let removedCount = 0;
  let skippedCount = 0;
  
  console.log("\n📋 Scripts to remove:");
  REDUNDANT_SCRIPTS.forEach(script => {
    const scriptPath = path.join(scriptsDir, script);
    if (fs.existsSync(scriptPath)) {
      try {
        fs.unlinkSync(scriptPath);
        console.log(`  ✅ Removed: ${script}`);
        removedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to remove ${script}: ${error.message}`);
      }
    } else {
      console.log(`  ⏭️ Skipped: ${script} (not found)`);
      skippedCount++;
    }
  });
  
  console.log("\n📋 Scripts to keep:");
  KEEP_SCRIPTS.forEach(script => {
    const scriptPath = path.join(scriptsDir, script);
    if (fs.existsSync(scriptPath)) {
      console.log(`  ✅ Keeping: ${script}`);
    } else {
      console.log(`  ⚠️ Warning: ${script} not found`);
    }
  });
  
  console.log("\n📊 Cleanup Summary:");
  console.log(`  ✅ Removed: ${removedCount} scripts`);
  console.log(`  ⏭️ Skipped: ${skippedCount} scripts (not found)`);
  console.log(`  📁 Total scripts removed: ${removedCount + skippedCount}`);
  
  console.log("\n🎯 What's left:");
  console.log("  - Comprehensive test suite (comprehensive-test-suite.js)");
  console.log("  - Test runner (test-runner.js)");
  console.log("  - Environment setup (setup-test-environment.js)");
  console.log("  - Documentation (README-TEST-SUITE.md)");
  console.log("  - Utility scripts (listAccount.ts, generateAccount.ts.ts)");
  console.log("  - Constructor scripts (getConstructorArgs*.js)");
  console.log("  - Original TypeScript test (test-pool.ts)");
  console.log("  - Fork test (test-fork.ts)");
  
  console.log("\n🚀 You can now use the comprehensive test suite:");
  console.log("  npx hardhat run scripts/test-runner.js all");
  console.log("  npx hardhat run scripts/test-runner.js help");
}

// Run cleanup
cleanupScripts(); 