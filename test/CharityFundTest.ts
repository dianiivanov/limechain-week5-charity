import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CharityFund } from "../typechain-types";
import { BigNumber } from 'bignumber.js';
import {Signer} from "ethers";

describe("CharityFund", async function () {
  // let charityOwner: Signer;
  // let charityUser: Signer;
  let charityFund: CharityFund;
    
  const TWO_DAYS_IN_SECS = BigNumber(2 * 24 * 60 * 60);;
  const ONE_DAY_IN_SECS = 2 * 24 * 60 * 60;
  const ONE_GWEI = 1_000_000_000;
  const targetAmount = ONE_GWEI;
  const fundCause = "Any fund cause";
  const latestTime = await time.latest();
  let lastDeployedCharityTimeframe: BigNumber;

  async function deployCharityFund( daysInSec: BigNumber) {
    
    lastDeployedCharityTimeframe = BigNumber(latestTime).plus(daysInSec);
    const CharityFundFactory = await ethers.getContractFactory("CharityFund");
    const charityFund = await CharityFundFactory.deploy(targetAmount, fundCause, lastDeployedCharityTimeframe.toString());

    return charityFund;
  }

  before(async() => {
    const [charityOwner, charityUser] = await ethers.getSigners();
    charityFund = await deployCharityFund(TWO_DAYS_IN_SECS);
  });

  describe("Deployment", async function () {
    it("Should set the right targetAmount, fundCause, timeFrame", async function () {
      console.log(await charityFund.targetAmount(), " vs ", targetAmount);
      expect(await charityFund.targetAmount()).to.equal(targetAmount);
      expect(await charityFund.fundCause()).to.equal(fundCause);
      expect(await charityFund.timeframe()).to.equal(lastDeployedCharityTimeframe);
    });

    it("Should set the right owner", async function () {
      const [charityOwner, charityUser] = await ethers.getSigners();
      expect(await charityFund.owner()).to.equal(charityOwner.getAddress());
    });

  //   it("Should receive and store the funds to lock", async function () {
  //     const { lock, lockedAmount } = await loadFixture(
  //       deployOneYearLockFixture
  //     );

  //     expect(await ethers.provider.getBalance(lock.target)).to.equal(
  //       lockedAmount
  //     );
  //   });

  //   it("Should fail if the unlockTime is not in the future", async function () {
  //     // We don't use the fixture here because we want a different deployment
  //     const latestTime = await time.latest();
  //     const Lock = await ethers.getContractFactory("Lock");
  //     await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
  //       "Unlock time should be in the future"
  //     );
  //   });
  // });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  });
});
