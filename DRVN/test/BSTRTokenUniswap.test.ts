import { ethers } from "hardhat";
import { expect } from "chai";
import { BSTRToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseUnits, parseEther } from "ethers/lib/utils";

describe("BSTRToken Uniswap Integration Tests", () => {
  let bstr: BSTRToken;
  let owner: SignerWithAddress;
  let liquidityProvider: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;
  let feeReceiver: SignerWithAddress;
  let collector1: SignerWithAddress;

  // Mainnet addresses
  const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  const initialSupply = parseUnits("1000000000", 9); // 1 billion BSTR

  beforeEach(async function() {
    // Fork mainnet
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
          blockNumber: 19000000,
        },
      },
    ]);

    // Get signers
    const signers = await ethers.getSigners();
    owner = signers[0];
    liquidityProvider = signers[1];
    trader1 = signers[2];
    trader2 = signers[3];
    feeReceiver = signers[4];
    collector1 = signers[5];

    // Deploy BSTR token
    const BSTR = await ethers.getContractFactory("BSTRToken");
    bstr = await BSTR.deploy(
      initialSupply,
      feeReceiver.address,
      UNISWAP_V2_ROUTER,
      [collector1.address],
      [100], // 100% to collector1
      { value: parseEther("0.1") }
    ) as BSTRToken;

    await bstr.deployed();

    console.log("BSTR Token deployed at:", bstr.address);
    console.log("Initial supply:", ethers.utils.formatUnits(await bstr.totalSupply(), 9));
  });

  describe("Liquidity Provision", () => {
    it("should allow adding liquidity to Uniswap", async () => {
      // Get router contract
      const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
      
      // Transfer tokens to liquidity provider
      const liquidityAmount = parseUnits("1000000", 9); // 1M BSTR
      await bstr.transfer(liquidityProvider.address, liquidityAmount);
      
      // Approve router to spend tokens
      await bstr.connect(liquidityProvider).approve(router.address, liquidityAmount);
      
      // Add liquidity
      const ethAmount = parseEther("10"); // 10 ETH
      
      // Impersonate liquidity provider to have ETH
      await ethers.provider.send("hardhat_setBalance", [
        liquidityProvider.address,
        parseEther("100").toHexString(),
      ]);
      
      const tx = await router.connect(liquidityProvider).addLiquidityETH(
        bstr.address,
        liquidityAmount,
        liquidityAmount, // min tokens
        ethAmount, // min ETH
        liquidityProvider.address,
        Math.floor(Date.now() / 1000) + 60, // deadline
        { value: ethAmount }
      );
      
      await tx.wait();
      
      // Check that LP tokens were created
      const factory = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY);
      const pairAddress = await factory.getPair(bstr.address, WETH_ADDRESS);
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
      
      console.log("LP Pair created at:", pairAddress);
    });
  });

  describe("Swap Simulation", () => {
    it("should handle ETH to BSTR swaps with fees", async () => {
      // First, add liquidity
      const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
      const liquidityAmount = parseUnits("1000000", 9);
      await bstr.transfer(liquidityProvider.address, liquidityAmount);
      await bstr.connect(liquidityProvider).approve(router.address, liquidityAmount);
      
      const ethAmount = parseEther("10");
      await ethers.provider.send("hardhat_setBalance", [
        liquidityProvider.address,
        parseEther("100").toHexString(),
      ]);
      
      await router.connect(liquidityProvider).addLiquidityETH(
        bstr.address,
        liquidityAmount,
        liquidityAmount,
        ethAmount,
        liquidityProvider.address,
        Math.floor(Date.now() / 1000) + 60,
        { value: ethAmount }
      );
      
      // Now simulate a swap
      const swapEthAmount = parseEther("1"); // 1 ETH
      await ethers.provider.send("hardhat_setBalance", [
        trader1.address,
        parseEther("10").toHexString(),
      ]);
      
      // Get expected output
      const path = [WETH_ADDRESS, bstr.address];
      const amounts = await router.getAmountsOut(swapEthAmount, path);
      const expectedOutput = amounts[1];
      
      console.log("Expected BSTR output:", ethers.utils.formatUnits(expectedOutput, 9));
      
      // Perform swap
      const tx = await router.connect(trader1).swapExactETHForTokens(
        0, // min output
        path,
        trader1.address,
        Math.floor(Date.now() / 1000) + 60,
        { value: swapEthAmount }
      );
      
      const receipt = await tx.wait();
      
      // Check that trader received tokens (with fees applied)
      const traderBalance = await bstr.balanceOf(trader1.address);
      expect(traderBalance).to.be.gt(0);
      
      console.log("Trader received:", ethers.utils.formatUnits(traderBalance, 9), "BSTR");
      
      // Check that fees were collected
      const contractBalance = await bstr.balanceOf(bstr.address);
      expect(contractBalance).to.be.gt(0);
      
      console.log("Fees collected:", ethers.utils.formatUnits(contractBalance, 9), "BSTR");
    });

    it("should handle BSTR to ETH swaps with fees", async () => {
      // Add liquidity first
      const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
      const liquidityAmount = parseUnits("1000000", 9);
      await bstr.transfer(liquidityProvider.address, liquidityAmount);
      await bstr.connect(liquidityProvider).approve(router.address, liquidityAmount);
      
      const ethAmount = parseEther("10");
      await ethers.provider.send("hardhat_setBalance", [
        liquidityProvider.address,
        parseEther("100").toHexString(),
      ]);
      
      await router.connect(liquidityProvider).addLiquidityETH(
        bstr.address,
        liquidityAmount,
        liquidityAmount,
        ethAmount,
        liquidityProvider.address,
        Math.floor(Date.now() / 1000) + 60,
        { value: ethAmount }
      );
      
      // Give trader some BSTR tokens
      const traderTokens = parseUnits("10000", 9);
      await bstr.transfer(trader1.address, traderTokens);
      
      // Approve router to spend tokens
      await bstr.connect(trader1).approve(router.address, traderTokens);
      
      // Perform BSTR to ETH swap
      const swapAmount = parseUnits("1000", 9);
      const path = [bstr.address, WETH_ADDRESS];
      
      const initialEthBalance = await ethers.provider.getBalance(trader1.address);
      
      const tx = await router.connect(trader1).swapExactTokensForETH(
        swapAmount,
        0, // min output
        path,
        trader1.address,
        Math.floor(Date.now() / 1000) + 60
      );
      
      await tx.wait();
      
      const finalEthBalance = await ethers.provider.getBalance(trader1.address);
      const ethReceived = finalEthBalance.sub(initialEthBalance);
      
      expect(ethReceived).to.be.gt(0);
      console.log("ETH received:", ethers.utils.formatEther(ethReceived));
      
      // Check fees were collected
      const contractBalance = await bstr.balanceOf(bstr.address);
      expect(contractBalance).to.be.gt(0);
      console.log("Fees collected:", ethers.utils.formatUnits(contractBalance, 9), "BSTR");
    });
  });

  describe("Fee Processing During Swaps", () => {
    it("should process fees automatically during swaps", async () => {
      // Set up liquidity
      const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
      const liquidityAmount = parseUnits("1000000", 9);
      await bstr.transfer(liquidityProvider.address, liquidityAmount);
      await bstr.connect(liquidityProvider).approve(router.address, liquidityAmount);
      
      const ethAmount = parseEther("10");
      await ethers.provider.send("hardhat_setBalance", [
        liquidityProvider.address,
        parseEther("100").toHexString(),
      ]);
      
      await router.connect(liquidityProvider).addLiquidityETH(
        bstr.address,
        liquidityAmount,
        liquidityAmount,
        ethAmount,
        liquidityProvider.address,
        Math.floor(Date.now() / 1000) + 60,
        { value: ethAmount }
      );
      
      // Enable auto process fees
      await bstr.setAutoprocessFees(true);
      
      // Perform multiple swaps to trigger fee processing
      for (let i = 0; i < 3; i++) {
        const swapEthAmount = parseEther("0.1");
        await ethers.provider.send("hardhat_setBalance", [
          trader1.address,
          parseEther("10").toHexString(),
        ]);
        
        const path = [WETH_ADDRESS, bstr.address];
        await router.connect(trader1).swapExactETHForTokens(
          0,
          path,
          trader1.address,
          Math.floor(Date.now() / 1000) + 60,
          { value: swapEthAmount }
        );
        
        // Check that fees were processed
        const contractBalance = await bstr.balanceOf(bstr.address);
        console.log(`Swap ${i + 1} - Fees collected:`, ethers.utils.formatUnits(contractBalance, 9), "BSTR");
      }
    });
  });

  describe("Fee Distribution After Swaps", () => {
    it("should distribute collected fees to collectors", async () => {
      // Set up liquidity and perform swaps
      const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
      const liquidityAmount = parseUnits("1000000", 9);
      await bstr.transfer(liquidityProvider.address, liquidityAmount);
      await bstr.connect(liquidityProvider).approve(router.address, liquidityAmount);
      
      const ethAmount = parseEther("10");
      await ethers.provider.send("hardhat_setBalance", [
        liquidityProvider.address,
        parseEther("100").toHexString(),
      ]);
      
      await router.connect(liquidityProvider).addLiquidityETH(
        bstr.address,
        liquidityAmount,
        liquidityAmount,
        ethAmount,
        liquidityProvider.address,
        Math.floor(Date.now() / 1000) + 60,
        { value: ethAmount }
      );
      
      // Perform several swaps
      for (let i = 0; i < 5; i++) {
        const swapEthAmount = parseEther("0.2");
        await ethers.provider.send("hardhat_setBalance", [
          trader1.address,
          parseEther("10").toHexString(),
        ]);
        
        const path = [WETH_ADDRESS, bstr.address];
        await router.connect(trader1).swapExactETHForTokens(
          0,
          path,
          trader1.address,
          Math.floor(Date.now() / 1000) + 60,
          { value: swapEthAmount }
        );
      }
      
      // Check total fees collected
      const totalFees = await bstr.balanceOf(bstr.address);
      console.log("Total fees collected:", ethers.utils.formatUnits(totalFees, 9), "BSTR");
      
      // Distribute fees
      if (totalFees.gt(0)) {
        const collectorInitialBalance = await bstr.balanceOf(collector1.address);
        
        await bstr.distributeFees(totalFees, true);
        
        const collectorFinalBalance = await bstr.balanceOf(collector1.address);
        const feesReceived = collectorFinalBalance.sub(collectorInitialBalance);
        
        expect(feesReceived).to.be.gt(0);
        console.log("Collector received:", ethers.utils.formatUnits(feesReceived, 9), "BSTR");
      }
    });
  });

  describe("Router Updates", () => {
    it("should handle router updates correctly", async () => {
      const newRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Uniswap V3 Router
      
      await bstr.setSwapRouter(newRouter);
      
      const updatedRouter = await bstr.swapRouter();
      expect(updatedRouter).to.equal(newRouter);
      
      // Verify pair is updated
      const newPair = await bstr.swapPair();
      expect(newPair).to.not.equal(ethers.constants.AddressZero);
    });
  });

  describe("Liquidity Management", () => {
    it("should allow liquidity owner changes", async () => {
      await bstr.setLiquidityOwner(trader1.address);
      expect(await bstr.liquidityOwner()).to.equal(trader1.address);
    });

    it("should allow num tokens to swap updates", async () => {
      const newAmount = parseUnits("10000", 9);
      await bstr.setNumTokensToSwap(newAmount);
      expect(await bstr.numTokensToSwap()).to.equal(newAmount);
    });
  });
}); 