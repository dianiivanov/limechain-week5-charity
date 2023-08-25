import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from 'bignumber.js';
import {Signer} from "ethers";
import * as Contracts from "../typechain-types/";

describe("CharityFund", function () {
  let charityOwner: Signer;
  let charityUser: Signer;
  let charityFund: Contracts.CharityFund;
  let charityFundFactory: Contracts.CharityFund__factory;
    
  const TWO_DAYS_IN_SECS = BigNumber(3 * 24 * 60 * 60);;
  const ONE_DAY_IN_SECS = BigNumber(1 * 24 * 60 * 60);
  const ONE_GWEI = 1_000_000_000;
  const targetAmount = BigNumber(ONE_GWEI);
  const fundCause = "Any fund cause";
  let latestTime: any;
  let lastDeployedCharityTimeframe: BigNumber;

  async function deployCharityFund(givenTargetAmount: BigNumber, givenFundCause: string, timeWindow: BigNumber, ) {
    
    lastDeployedCharityTimeframe = BigNumber(latestTime).plus(timeWindow);
    charityFundFactory = await ethers.getContractFactory("CharityFund");
    const charityFund = await charityFundFactory.connect(charityOwner).deploy(givenTargetAmount.toString(), givenFundCause, lastDeployedCharityTimeframe.toString());

    return charityFund;
  }

  before(async() => {
    [charityOwner, charityUser] = await ethers.getSigners();
    latestTime = await time.latest();
    charityFund = await deployCharityFund(targetAmount, fundCause, TWO_DAYS_IN_SECS);
  });

  describe("Deployment", async function () {
    it("Should set the right targetAmount, fundCause, timeFrame", async function () {
      expect(await charityFund.targetAmount()).to.equal(targetAmount);
      expect(await charityFund.fundCause()).to.equal(fundCause);
      expect(await charityFund.timeframe()).to.equal(lastDeployedCharityTimeframe);
    });

    it("Should set the right owner", async function () {
      expect(await charityFund.owner()).to.equal(await charityOwner.getAddress());
    });


      it("Should revert with ZeroTargetAmountError", async function () {
        const zeroTargetAmount = BigNumber(0);
        await expect(deployCharityFund(zeroTargetAmount, fundCause, ONE_DAY_IN_SECS)).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "ZeroTargetAmountError");
      });


    it("Should revert with TimeframeNotEnoughError", async function () {
      await expect(deployCharityFund(targetAmount, fundCause, ONE_DAY_IN_SECS)).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "TimeframeNotEnoughError");
    });
  });

  describe("Donating", async function () {
    it("Should revert with ZeroDonationAmountError", async function () {
      await expect(charityFund.connect(charityUser).donate({value:0})).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "ZeroDonationAmountError");
    });

    it("Should revert with FundTargetExceeded", async function () {
      const exceedingTargetAmount: string = targetAmount.plus(BigNumber(23)).toString();
      await expect(charityFund.connect(charityUser).donate({value: exceedingTargetAmount})).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "FundTargetExceeded");
    });
    
    it("Should donate", async function () {
      const expectedRemainingAmount = BigNumber(233);
      const amountToDonate = targetAmount.minus(expectedRemainingAmount);
      await charityFund.connect(charityUser).donate({value: amountToDonate.toString()});

      expect(await charityFund.connect(charityUser).remainingAmount()).to.equal(expectedRemainingAmount);
      expect(await charityFund.connect(charityUser).donatedAmountFrom(charityUser)).to.equal(amountToDonate.toString());
      expect(await charityFund.connect(charityUser).isClosed()).to.equal(false);
      expect(await charityFund.connect(charityUser).isOpen()).to.equal(true);
    });

    it("Should revert with not owned on withdraw", async function () {
      await expect(charityFund.connect(charityUser).withdraw()).to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should revert with CharityIsNotFinished on withdraw", async function () {
      await expect(charityFund.connect(charityOwner).withdraw()).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "CharityIsNotFinished");
    });

    it("Should donate again", async function () {
      const expectedRemainingAmount = BigNumber(100);
      const amountToDonate = BigNumber((await charityFund.remainingAmount()).toString()).minus(expectedRemainingAmount);
      const amountDonatedBeforeDonation = BigNumber((await charityFund.connect(charityUser).donatedAmountFrom(charityUser)).toString());
      const expectedAmountDonatedAfterDonation = amountDonatedBeforeDonation.plus(amountToDonate).toString();

      await charityFund.connect(charityUser).donate({value: amountToDonate.toString()});

      expect(await charityFund.connect(charityUser).remainingAmount()).to.equal(expectedRemainingAmount);
      expect(await charityFund.connect(charityUser).donatedAmountFrom(charityUser)).to.equal(expectedAmountDonatedAfterDonation);
      expect(await charityFund.connect(charityUser).isClosed()).to.equal(false);
      expect(await charityFund.connect(charityUser).isOpen()).to.equal(true);
    });
    
    it("Should revert with CharityIsNotFinished on withdraw", async function () {
      await expect(charityFund.connect(charityOwner).withdraw()).to.be.revertedWithCustomError({interface: charityFundFactory.interface}, "CharityIsNotFinished");
    });
        
    it("Should revert with RefundIsNotYetAllowed on refund", async function () {
      await expect(charityFund.connect(charityUser).refund()).to.be.revertedWithCustomError(charityFund, "RefundIsNotYetAllowed");
    });
    
    it("Should donate and close the charity", async function () {
      const expectedRemainingAmount = BigNumber(0);
      const amountToDonate = BigNumber((await charityFund.remainingAmount()).toString());
      const amountDonatedBeforeDonation = BigNumber((await charityFund.connect(charityUser).donatedAmountFrom(charityUser)).toString());
      const expectedAmountDonatedAfterDonation = amountDonatedBeforeDonation.plus(amountToDonate).toString();

      await charityFund.connect(charityUser).donate({value: amountToDonate.toString()});

      expect(await charityFund.connect(charityUser).remainingAmount()).to.equal(expectedRemainingAmount);
      expect(await charityFund.connect(charityUser).donatedAmountFrom(charityUser)).to.equal(expectedAmountDonatedAfterDonation);
      expect(await charityFund.connect(charityUser).isClosed()).to.equal(true);
      expect(await charityFund.connect(charityUser).isOpen()).to.equal(false);
    });
 
    it("Should withdraw", async function () {
      const contractBalanceBeforeWithdraw = BigNumber((await ethers.provider.getBalance(charityFund.getAddress())).toString());
      await charityFund.connect(charityOwner).withdraw();
      const contractBalanceAfterWithdraw = BigNumber((await ethers.provider.getBalance(charityFund.getAddress())).toString());
      const targetAmount = BigNumber((await charityFund.connect(charityOwner).targetAmount()).toString());

      expect(contractBalanceAfterWithdraw).to.equal(contractBalanceBeforeWithdraw.minus(targetAmount));
    });
    
    it("Should revert with CharityIsFinished on donate", async function () {
      const amountToDonate = BigNumber(10);

      await expect(charityFund.connect(charityUser).donate({value: amountToDonate.toString()})).to.be.revertedWithCustomError(charityFund, "CharityIsFinished");
    });
        
    it("Should revert with CharityIsFinished on refund", async function () {
      await expect(charityFund.connect(charityUser).refund()).to.be.revertedWithCustomError(charityFund, "CharityIsFinished");
    });

    it("Should refund", async function() {
      latestTime = await time.latest();
      const charityFundToRefund = await deployCharityFund(targetAmount, fundCause, TWO_DAYS_IN_SECS);

      const amountToDonate = BigNumber(233);
      await charityFundToRefund.connect(charityUser).donate({value: amountToDonate.toString()});

      await network.provider.send("evm_setNextBlockTimestamp", [Number((await charityFundToRefund.timeframe())) + 1]);
      expect(await charityFundToRefund.connect(charityUser).donatedAmountFrom(charityUser.getAddress())).to.equal(amountToDonate);
      
      const contractBalanceBeforeRefund = BigNumber((await ethers.provider.getBalance(charityFundToRefund.getAddress())).toString());
      await charityFundToRefund.connect(charityUser).refund();
      const contractBalanceAfterRefund = BigNumber((await ethers.provider.getBalance(charityFundToRefund.getAddress())).toString());
      
      expect(contractBalanceAfterRefund).to.equal(contractBalanceBeforeRefund.minus(amountToDonate));
      expect(await charityFundToRefund.connect(charityUser).donatedAmountFrom(charityUser.getAddress())).to.equal(0);
    });
  });
});
