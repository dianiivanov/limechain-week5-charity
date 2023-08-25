import {ethers} from "hardhat";

export async function deployCharityFund(addressPk:string, targetAmount:string, fundCause:string, timeframe:string) {
    const CharityFundFactory = await ethers.getContractFactory("CharityFund");
    const wallet = new ethers.Wallet(addressPk, ethers.provider);
    const charityFund = await CharityFundFactory.connect(wallet).deploy(targetAmount, fundCause, timeframe);
    await charityFund.waitForDeployment();

    const tx = await charityFund.deploymentTransaction();
    console.log(`The CharityFund contract is deployed to ${charityFund.target}`);
    console.log(`Owner=${tx?.from}, transaction hash: ${tx?.hash}`)
    return tx;
}


