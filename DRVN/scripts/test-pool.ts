import { ethers } from "hardhat";
import { BSTRToken__factory, IUniswapV2Router02__factory, IUniswapV2Factory__factory } from "../typechain-types";
import IUniswapV2PairAbi from "@uniswap/v2-core/build/IUniswapV2Pair.json";

const BSTR_TOKEN_ADDRESS = "0xcB64a719D7e7749BFD18dc1815f1EF3C28F083E2";
const ROUTER_ADDRESS = "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

async function main() {
  const [deployer] = await ethers.getSigners();
  const bstr = BSTRToken__factory.connect(BSTR_TOKEN_ADDRESS, deployer);
  const router = IUniswapV2Router02__factory.connect(ROUTER_ADDRESS, deployer);
  const FACTORY_ADDRESS = "0x7ae58f10f7849ca6f5fb71b7f45cb416c9204b1e";
  const factory = IUniswapV2Factory__factory.connect(FACTORY_ADDRESS, deployer);

  // 1. Check if pair exists
  let pairAddress = await factory.getPair(BSTR_TOKEN_ADDRESS, WETH_ADDRESS);
  if (pairAddress === ethers.ZeroAddress) {
    console.log("Pair does not exist. Creating pair...");
    const tx = await factory.createPair(BSTR_TOKEN_ADDRESS, WETH_ADDRESS);
    await tx.wait();
    pairAddress = await factory.getPair(BSTR_TOKEN_ADDRESS, WETH_ADDRESS);
    console.log("Pair created at:", pairAddress);
  } else {
    console.log("Pair already exists at:", pairAddress);
  }

  // 2. Check if pair contract is deployed
  const code = await ethers.provider.getCode(pairAddress);
  if (code === "0x") {
    console.log("Pair contract not deployed at:", pairAddress);
    return;
  }

  // 3. Check reserves
  const pair = new ethers.Contract(pairAddress, IUniswapV2PairAbi.abi, deployer);
  const reserves = await pair.getReserves();
  console.log("Raw reserves object:", reserves);

  let reserve0, reserve1;
  if (Array.isArray(reserves)) {
    reserve0 = reserves[0];
    reserve1 = reserves[1];
  } else if (reserves && typeof reserves === 'object') {
    reserve0 = reserves._reserve0 ?? reserves[0];
    reserve1 = reserves._reserve1 ?? reserves[1];
  } else {
    throw new Error("Unexpected reserves return value");
  }
  console.log("Parsed reserves:", reserve0?.toString(), reserve1?.toString());

  if (reserve0 === 0n && reserve1 === 0n) {
    console.log("Pair is empty. Adding liquidity...");
    const bstrAmount = ethers.parseUnits("2000000", 9); // 2M BSTR
    const ethAmount = ethers.parseEther("0.08"); // 0.08 ETH
    const deployerBSTR = await bstr.balanceOf(deployer.address);
    console.log("Deployer BSTR balance:", deployerBSTR.toString());
    if (deployerBSTR < bstrAmount) {
      throw new Error("Not enough BSTR tokens to add liquidity.");
    }
    const deployerEth = await ethers.provider.getBalance(deployer.address);
    if (deployerEth < ethAmount) {
      console.log("Not enough ETH to add liquidity.");
      return;
    }
    // Always approve router for the required BSTR amount before adding liquidity
    const currentAllowance = await bstr.allowance(deployer.address, ROUTER_ADDRESS);
    if (currentAllowance < bstrAmount) {
      console.log(`Approving router for ${bstrAmount.toString()} BSTR...`);
      const approveTx = await bstr.approve(ROUTER_ADDRESS, bstrAmount);
      await approveTx.wait();
      console.log("Router approved.");
    } else {
      console.log("Router already approved for sufficient BSTR.");
    }
    const allowance = await bstr.allowance(deployer.address, ROUTER_ADDRESS);
    console.log("Router allowance:", allowance.toString());
    if (allowance < bstrAmount) {
      throw new Error("Router not approved for enough BSTR.");
    }
    // Add liquidity
    const addLiqTx = await router.addLiquidityETH(
      BSTR_TOKEN_ADDRESS,
      bstrAmount,
      bstrAmount,
      ethAmount,
      deployer.address,
      Math.floor(Date.now() / 1000) + 300,
      { value: ethAmount }
    );
    await addLiqTx.wait();
    console.log("Liquidity added to pair:", pairAddress);
  } else {
    console.log("Pair already funded. Reserves:", reserve0?.toString(), reserve1?.toString());
  }

  // 4. Assign the pair to the BSTR token if needed
  const currentSwapPair = await bstr.swapPair();
  if (currentSwapPair.toLowerCase() !== pairAddress.toLowerCase()) {
    // If your contract supports setSwapRouter or setIsLpPool, call it here
    // await (await bstr.setSwapRouter(ROUTER_ADDRESS)).wait();
    await (await bstr.setIsLpPool(pairAddress, true)).wait();
    console.log("Assigned new pair as LP pool on BSTR token.");
  } else {
    console.log("BSTR token already points to the correct swap pair.");
  }

  console.log("=== DONE ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
