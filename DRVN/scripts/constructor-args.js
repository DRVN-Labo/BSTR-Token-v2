const { parseUnits } = require("ethers");

module.exports = [
  parseUnits("1000000000", 9), // initialSupply
  "0xf8492AfeDC885ef3d443F0f51B81B7e70fBCd516", // feeReceiver
  "0x1689E7B1F10000AE47eBfE339a4f69dECd19F602", // swapRouter
  ["0x0FbbDDC39cdb1D089779dC770268B1a995Bc527A"], // collectors
  [100] // shares
]; 