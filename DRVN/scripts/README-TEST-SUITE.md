# 🧪 BSTR Token Comprehensive Test Suite

This test suite provides comprehensive testing for the BSTR token contract, covering all major functionality including liquidity management, tax collection, fee distribution, and automatic processing.

---

## 📋 Prerequisites

### 1. Environment Variables

Create a `.env` file in your project root with:
```bash
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
TAX_TESTER_PRIVATE_KEY=your_tax_tester_private_key_here
```
- The **deployer** wallet should be the one that deployed the contract and will fund the pool.
- The **tax tester** wallet should have some ETH for gas, and **should not be excluded from fees**.

### 2. Network Configuration

Make sure your `hardhat.config.ts` is configured for Base Sepolia:
```typescript
networks: {
  baseSepolia: {
    url: "https://sepolia.base.org",
    chainId: 84532,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY, process.env.TAX_TESTER_PRIVATE_KEY]
  }
}
```

---

## 🚀 Step-by-Step Workflow

### 1. **Fund the Uniswap Pool**

After deploying your contracts, **run this first** to create and fund the Uniswap pool with 2,000,000 BSTR and 0.08 ETH from the deployer wallet:

```bash
npx hardhat run scripts/test-pool.ts --network baseSepolia
```
- This script will:
  - Create the Uniswap pair if it doesn't exist.
  - Approve the router for the correct BSTR amount.
  - Add liquidity with the specified BSTR and ETH.
  - Register the LP pool with your BSTR token contract.

---

### 2. **Check and Prepare the Test Environment**

Run the setup script to check your environment and print out the current contract state:

```bash
npx hardhat run scripts/setup-test-environment.js --network baseSepolia
```

---

### 3. **Run the Full Test Suite**

Run all tests using the TypeScript test runner (make sure you have `ts-node` installed):

```bash
npx ts-node scripts/test-runner.js all
```
- This will execute all major test flows:
  - Contract state
  - Liquidity
  - Fee exclusions
  - Buys
  - Sells
  - Threshold
  - Auto-processing
  - Fee distribution

---

### 4. **Manually Trigger Fee Processing (if needed)**

If you want to manually process fees (for example, after the threshold is reached), run:

```bash
npx hardhat run scripts/manual-process-fees.js --network baseSepolia
```
- This script will:
  - Check the contract's BSTR balance and threshold.
  - Call `processFees` from the deployer wallet if the threshold is met.

---

## 🛠️ Troubleshooting

### Common Issues

- **"Router not approved for enough BSTR."**
  - The `test-pool.ts` script now automatically approves the router for the correct amount before adding liquidity.

- **"Threshold not reached."**
  - Run more buy transactions or wait for more trading activity.

- **"TAX_TESTER_PRIVATE_KEY not found"**
  - Make sure your `.env` file is set up correctly.

- **"Not enough ETH/BSTR to add liquidity."**
  - Ensure your deployer wallet has sufficient balances.

---

## 📚 Related Scripts

- `test-pool.ts` – Funds the Uniswap pool and registers the LP.
- `setup-test-environment.js` – Checks and prints contract/test environment state.
- `test-runner.js` – Runs the full or individual test flows.
- `manual-process-fees.js` – Manually triggers fee processing from the deployer wallet.

---

## 🎯 Best Practices

- **Always fund the pool first** after deployment.
- **Run the setup script** to verify your environment.
- **Use separate wallets** for deployer and tax tester.
- **Monitor balances** before running tests.
- **Review logs** for detailed step-by-step output.

---

## 📝 Example Full Workflow

```bash
# 1. Fund the Uniswap pool
npx hardhat run scripts/test-pool.ts --network baseSepolia

# 2. Check environment and contract state
npx hardhat run scripts/setup-test-environment.js --network baseSepolia

# 3. Run all tests
npx ts-node scripts/test-runner.js all

# 4. (Optional) Manually process fees
npx hardhat run scripts/manual-process-fees.js --network baseSepolia
```

---

## 📞 Support

If you encounter issues:
- Check the troubleshooting section above.
- Review error messages in the test output.
- Verify your environment and contract addresses.
- Ensure sufficient balances for testing.
- team@decentralbros.xyz

---

**This README now reflects your real, working process and the exact commands you should use after deployment.** 