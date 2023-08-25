import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { BigNumber } from 'bignumber.js';
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_SEPOLIA_URL = `${process.env.INFURA_SEPOLIA_URL}${process.env.INFURA_API_KEY}`
const INFURA_GOERLI_URL = `${process.env.INFURA_GOERLI_URL}${process.env.INFURA_API_KEY}`;
const LOCALHOST_URL = process.env.LOCALHOST_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const MAX_UINT256 = new BigNumber('115792089237316195423570985008687907853269984665640564039457584007913129639935');

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: INFURA_SEPOLIA_URL,
      chainId: 11155111,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
    goerli: {
      url: INFURA_GOERLI_URL,
      chainId: 5,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
    },
    localhost: {
      url: LOCALHOST_URL,
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
};

  
function validateForSolidity(initialSupply: string) {
  const result = new BigNumber(initialSupply);
  if (result.isGreaterThan(MAX_UINT256)) {
    throw new Error('Value exceeds maximum uint256');
  }
}

const lazyImport = async (module: any) => {
  return await import(module);
};

const verifyContract = async (args: any, contractAddress: string, hre: any) => {
  console.log("Verifying contract: ", contractAddress);
  try {
      await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [args.targetAmount, args.fundCause, args.timeframe],
      });
      console.log(`Contract with address ${contractAddress} was successfully verified!`);
  } catch (e: any) {
      if(e.message.toLowerCase().includes("already verified")) {
          console.log(`Contract with address ${contractAddress} is already verified!`);
      } else {
          console.log(e);
      }
  }
}

task("deploy", "Deploys contract")
  .addParam("privateKey", "Please provide the private key of the owner")
  .addParam("targetAmount", "Please provide the fund's target amount in WEI")
  .addParam("fundCause", "Please provide the fund's cause")
  .addParam("timeframe", "Please provide the fund's timeframe")
  .setAction(async (args, hre) => {
    validateForSolidity(args.targetAmount);
    validateForSolidity(args.timeframe);
    const {deployCharityFund} = await lazyImport("./scripts/deploy-charityFund");
    await hre.run('compile');
    await deployCharityFund(args.privateKey, args.targetAmount, args.fundCause, args.timeframe);
  });

task("deploy-and-verify", "Deploys and verifies contract")
  .addParam("privateKey", "Please provide the private key of the owner")
  .addParam("targetAmount", "Please provide the fund's target amount in WEI")
  .addParam("fundCause", "Please provide the fund's cause")
  .addParam("timeframe", "Please provide the fund's timeframe")
  .setAction(async (args, hre) => {
    validateForSolidity(args.targetAmount);
    validateForSolidity(args.timeframe);
    const {deployCharityFund} = await lazyImport("./scripts/deploy-charityFund");
    await hre.run('compile');
    const tx = await deployCharityFund(args.privateKey, args.targetAmount, args.fundCause, args.timeframe);

    const receipt = await tx?.wait(5);
    await verifyContract(args, receipt.contractAddress, hre);
  });

export default config;
