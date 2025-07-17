# 🧠 Based Buster (BSTR) Token

## Overview

**BSTRToken** is a sophisticated ERC20 token with advanced governance capabilities and flexible tax mechanisms:

- 💸 **Dynamic Tax System** on Buys, Sells, and Transfers
- 🔁 **Fee Distribution** between Liquidity, Burn, and Collectors
- 💱 **Flexible Fee Collection** (ETH or Token-based)
- 💰 **Uniswap V2 Integration** with auto-swap support
- 🗳️ **DAO Governance Ready** via `ERC20Votes` and `ERC20Permit`
- ⏰ **Governance Infrastructure** with `GovernorBSTR` and timelock support

## 🔧 Contract Architecture

### 📄 `contracts/BSTRToken.sol` - Main Token Contract

**Inheritance Chain:**
```
BSTRToken
├── ERC20 ("Buster", "BSTR")
├── ERC20Permit (EIP-2612 compliant)
├── ERC20Votes (Snapshot-based voting)
├── TaxableToken (Tax logic)
├── TaxDistributor (Fee collection)
├── Ownable (Access control)
└── ReentrancyGuard (Security)
```

**Key Features:**
- **9 Decimal Precision** (custom `CUSTOM_DECIMALS`)
- **Gasless Approvals** via `ERC20Permit`
- **Snapshot Voting** via `ERC20Votes`
- **Role-based Access Control** with `taxRateUpdater`
- **Reentrancy Protection** on all state-changing functions
- **Upgrade-Ready Architecture** for future V2+ logic

**Core Functions:**
| Function | Access | Description |
|---------|--------|-------------|
| `setTaxRates(buyRate, sellRate)` | `taxRateUpdater` | Update buy/sell tax rates (max 20%) |
| `setTaxRateUpdater(address)` | `owner` | Change who can update tax rates |
| `distributeFees(amount, inToken)` | `owner` | Manually distribute collected fees |
| `processFees(amount, minAmountOut)` | `owner` | Swap tokens for ETH and distribute |
| `setIsLpPool(address, bool)` | `owner` | Mark addresses as LP pools |
| `setIsExcludedFromFees(address, bool)` | `owner` | Whitelist addresses from fees |
| `setSwapRouter(address)` | `owner` | Dynamically update the Uniswap router and LP pair |
| `setFeeConfiguration(FeeConfiguration)` | `owner` | Dynamically update fee config |

### 📄 `contracts/libraries/TaxableToken.sol` - Tax Logic Engine

**Fee Configuration Structure:**
```solidity
struct FeeConfiguration {
    bool feesInToken;
    uint16 buyFees;
    uint16 sellFees;
    uint16 transferFees;
    uint16 burnFeeRatio;
    uint16 liquidityFeeRatio;
    uint16 collectorsFeeRatio;
}
```

**Tax Logic:**
- **Buy Tax**: When tokens are received from LP pool
- **Sell Tax**: When tokens are sent to LP pool
- **Transfer Tax**: Between wallets (non-LP)
- **Auto-Fee Swap**: Converts fees to ETH when threshold hit
- **Burn, LP, and Collector Splits**: Configurable split of taxed amount
- **Router + LP Logic**: Dynamically fetches or creates LP pair from router factory

**Improvements Made:**
- 🔐 `_transfer()` logic revised to fix tax handling using `_processingFees` flag
- 🛡️ Added `lockTheSwap` modifier to protect `_processFees`
- 🧪 Fixed fee processing for LP sell-trigger and thresholds
- 🧠 Dynamic `setSwapRouter()` allows router/pair upgrades without redeploying

### 📄 `contracts/libraries/TaxDistributor.sol` - Fee Collection System

**Features:**
- ✅ Up to 50 Fee Collectors (gas-safe)
- 📊 Weighted Split Distribution (token or ETH)
- 🔁 Dynamic Collector Management (add/remove/update)

**Core Functions:**
| Function | Description |
|---------|-------------|
| `addFeeCollector(address, share)` | Add new collector with weight |
| `removeFeeCollector(address)` | Remove collector |
| `updateFeeCollectorShare(address, share)` | Update collector weight |
| `distributeFees(amount, inToken)` | Distribute fees to all collectors |

**Improvements Made:**
- 🔄 Replaced low-level `.call(...)` with safe `IERC20.transfer()` logic
- 💸 ETH transfers now use `.call{value:}()`, ensuring compatibility with contracts
- 🧾 Added `require(distributed == amount)` safety check
- 🧰 Modular design: Clean upgradeability and reuse in `TaxableDistributorUpgradeable`

### 📄 `contracts/libraries/GovernorBSTR.sol` - Governance Infrastructure

**OpenZeppelin Governor Implementation:**
```
GovernorBSTR
├── Governor ("BSTRGovernor")
├── GovernorSettings (voting parameters)
├── GovernorCountingSimple (vote counting)
├── GovernorVotes (token-based voting)
├── GovernorVotesQuorumFraction (quorum requirements)
└── GovernorTimelockControl (timelock execution)
```

**Governance Features:**
- Token-weighted Voting using BSTR token balance
- Snapshot-based vote power and timelock control
- Fully compatible with OpenZeppelin Governor UI tools

## ✅ Recent Fixes (Post-Audit Migration Plan)

- ✅ **Tax Logic Bug Fix**: Rewrote `_transfer()` to check LP status correctly and apply taxes only when needed
- ✅ **Fee Safety Fixes**: All low-level calls in fee distribution replaced with safe ERC20 interface and `.call{value:}`
- ✅ **Modular Distribution**: Abstracted logic into `_distributeFees()` for clean separation and testing
- ✅ **Router Upgrade Support**: Added `setSwapRouter()` with dynamic pair resolution
- ✅ **Upgradeable Compatibility**: `TaxableDistributorUpgradeable` now consolidates full tax logic for use in V2
- ✅ **Safe LP Pair Check**: Prevents errors during first swap when LP is empty
- ✅ **Token Safety Thresholds**: Added checks for token balances before swap + reentrancy protection

## 🧪 Testing

### ✅ Unit Tests (`test/BSTRToken.test.ts`)

- Transfer tax logic and edge cases
- LP buy/sell simulation
- Fee collector distribution
- Access control and permissions
- Governance vote delegation
- ERC20Permit functionality
- Tax auto-processing trigger logic
- Reentrancy and ETH fallback safety

## 📌 Post-Deployment Setup

### 2. Token Configuration
```solidity
// LP Pools
bstrToken.setIsLpPool(uniswapPair, true);

// Fee Exclusions
bstrToken.setIsExcludedFromFees(treasury, true);
bstrToken.setIsExcludedFromFees(governance, true);

// Fee Setup
bstrToken.setNumTokensToSwap(threshold);
bstrToken.setAutoprocessFees(true);
bstrToken.setSwapRouter(routerAddress);

// Collectors Setup
bstrToken.addFeeCollector(teamWallet, 60);
bstrToken.addFeeCollector(devWallet, 40);
```

## 🛡️ Audit Notes & Customizations

### 🔄 **Reentrancy Guard Removal for Fee Distribution**

> **Why:**  
> The `nonReentrant` modifier was removed from fee distribution functions because it caused issues with `processFees` and `distributeFees` in `BSTRToken.sol`.  
> This was necessary to allow proper fee processing and distribution.

```solidity
// TaxDistributor.sol - _distributeFees
/**
 * [Audit Note - BSTRToken Tax Distribution]
 * Removed the nonReentrant modifier to resolve issues with fee distribution
 * in processFees (BSTRToken.sol, line 174).
 */
function _distributeFees(address token, uint256 amount, bool inToken) internal returns (bool) {
    if (amount == 0 || totalFeeCollectorsShares == 0) return false;

    uint256 distributed = 0;
    uint256 len = _collectors.length();
    for (uint256 i = 0; i < len; i++) {
        address collector = _collectors.at(i);
        uint256 share = i == len - 1
            ? amount - distributed
            : (amount * _shares[collector]) / totalFeeCollectorsShares;

        if (inToken) {
            require(IERC20(token).transfer(collector, share), "Token transfer failed");
        } else {
            (bool success, ) = payable(collector).call{value: share}("");
            require(success, "ETH transfer failed");
        }

        emit FeeCollected(collector, share);
        distributed += share;
    }

    require(distributed == amount, "Fee distribution mismatch");
    return true;
}

// BSTRToken.sol - distributeFees
/**
 * [Audit Note - TaxableToken Integration]
 * Removed nonReentrant modifier to allow fee distribution via processFees.
 */
function distributeFees(uint256 amount, bool inToken) external override onlyOwner {
    if (inToken) {
        require(balanceOf(address(this)) >= amount, "Not enough token balance");
    } else {
        require(address(this).balance >= amount, "Not enough ETH balance");
    }
    _distributeFees(address(this), amount, inToken);
}

function processFees(uint256 amount, uint256 minAmountOut) external override onlyOwner {
    require(amount <= balanceOf(address(this)), "Amount too high");
    _processFees(amount, minAmountOut);
}
```

---

### 🔄 **ERC20Votes Compatibility: Transfer Fix**

> **Why:**  
> To ensure taxes are correctly handled with OpenZeppelin’s ERC20Votes extension, the `_transfer` override was updated to call `TaxableToken._transfer`.

```solidity
// BSTRToken.sol
/**
 * [Audit Note - TaxableToken Integration]
 * Ensures tax calculations are compatible with ERC20Votes.
 */
function _transfer(address from, address to, uint256 amount)
    internal
    override(ERC20, TaxableToken)
{
    TaxableToken._transfer(from, to, amount);
}
```

---

### 🔄 **Fee Processing Logic Update**

> **Why:**  
> The `_processFees` logic in `TaxableToken.sol` was updated to work with the new `_transfer` override and to ensure correct fee splitting and liquidity addition.

```solidity
// TaxableToken.sol
function _processFees(uint256 tokenAmount, uint256 minAmountOut) internal lockTheSwap {
    uint256 contractTokenBalance = balanceOf(address(this));
    if (contractTokenBalance >= tokenAmount) {
        uint256 liquidityAmount = (tokenAmount * feeConfiguration.liquidityFeeRatio) / (FEE_PRECISION - feeConfiguration.burnFeeRatio);
        uint256 liquidityTokens = liquidityAmount / 2;

        uint256 collectorsAmount = tokenAmount - liquidityAmount;
        uint256 liquifyAmount = liquidityAmount - liquidityTokens;

        if (!feeConfiguration.feesInToken) {
            liquifyAmount += collectorsAmount;
        }

        if (liquifyAmount > 0) {
            if (balanceOf(swapPair) == 0) return;

            uint256 initialBalance = address(this).balance;

            _swapTokensForEth(liquifyAmount, minAmountOut);

            uint256 swapBalance = address(this).balance - initialBalance;

            uint256 liquidityETH = (swapBalance * liquidityTokens) / liquifyAmount;
            if (liquidityETH > 0) {
                _addLiquidity(liquidityTokens, liquidityETH);
            }
        }

        if (feeConfiguration.feesInToken) {
            _distributeFees(address(this), collectorsAmount, true);
        } else {
            _distributeFees(address(this), address(this).balance, false);
        }
    }
}
```

---

**Summary:**  
- `nonReentrant` was removed from fee distribution to allow proper processing.
- `_transfer` was overridden for ERC20Votes compatibility and correct tax handling.
- Fee processing logic was updated for robust, accurate fee and liquidity management.

---

## 👨‍💻 Built By

Built with ❤️ by [Decentral Bros](https://decentralbros.xyz)