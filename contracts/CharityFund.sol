// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;
import "@openzeppelin/contracts/access/Ownable.sol";

error TimeframeNotEnoughError(
    address charityCreator,
    uint256 targetAmount,
    string fundCause,
    uint256 timeframe
);
error ZeroTargetAmountError(
    address charityCreator,
    uint256 targetAmount,
    string fundCause,
    uint256 timeframe
);
error EtherNotSentError(address to, uint256 amount);
error ZeroDonationAmountError(address sender, uint256 amount);
error FundTargetExceeded(address sender, uint256 amount);
error CharityIsFinished(address sender);
error CharityIsNotFinished(address sender);
error RefundIsNotYetAllowed(address sender);

contract CharityFund is Ownable {
    uint256 public constant MIN_TIMEFRAME_IN_DAYS = 2 days;
    uint256 public immutable targetAmount;
    string public fundCause;
    uint256 public immutable timeframe;
    mapping(address => uint256) public donatedAmountFrom;
    uint256 public donatedAmount;

    event Withdraw(address indexed sender, uint256 amount);
    event Refund(
        address indexed sender,
        uint256 amount,
        uint256 newDonatedAmount
    );
    event Donate(
        address indexed sender,
        uint256 amount,
        uint256 newDonatedAmount
    );
    event Closed(address indexed sender, uint256 amount);
    event FallbackCalled(address indexed sender, uint256 amount);
    event ReceiveCalled(address indexed sender, uint256 amount);

    constructor(
        uint256 targetAmount_,
        string memory fundCause_,
        uint256 timeframe_
    ) {
        if (targetAmount_ == 0) {
            revert ZeroTargetAmountError(
                msg.sender,
                targetAmount_,
                fundCause_,
                timeframe_
            );
        }
        if (timeframe_ <= block.timestamp + MIN_TIMEFRAME_IN_DAYS) {
            revert TimeframeNotEnoughError(
                msg.sender,
                targetAmount_,
                fundCause_,
                timeframe_
            );
        }
        targetAmount = targetAmount_;
        fundCause = fundCause_;
        timeframe = timeframe_;
    }

    modifier onlyForCharityNotFinished() {
        if (isClosed()) {
            revert CharityIsFinished(msg.sender);
        }
        _;
    }

    function donate() public payable onlyForCharityNotFinished {
        if (msg.value == 0) {
            revert ZeroDonationAmountError(msg.sender, msg.value);
        }
        if (msg.value > targetAmount - donatedAmount) {
            revert FundTargetExceeded(msg.sender, msg.value);
        }
        donatedAmount += msg.value;
        donatedAmountFrom[msg.sender] += msg.value;
        emit Donate(msg.sender, msg.value, donatedAmount);
        if (isClosed()) {
            emit Closed(msg.sender, msg.value);
        }
    }

    function remainingAmount() public view returns (uint256) {
        return targetAmount - donatedAmount;
    }

    function isOpen() public view returns (bool) {
        return !isClosed();
    }

    function isClosed() public view returns (bool) {
        return donatedAmount == targetAmount;
    }

    function withdraw() public onlyOwner {
        if (isOpen()) {
            revert CharityIsNotFinished(msg.sender);
        }
        (bool success, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        if (!success) {
            revert EtherNotSentError(msg.sender, address(this).balance);
        }
        emit Withdraw(msg.sender, address(this).balance);
    }

    function refund() public onlyForCharityNotFinished {
        if (block.timestamp < timeframe) {
            revert RefundIsNotYetAllowed(msg.sender);
        }
        uint256 amountToRefund = donatedAmountFrom[msg.sender];
        donatedAmountFrom[msg.sender] = 0;
        donatedAmount -= amountToRefund;
        (bool success, ) = payable(msg.sender).call{value: amountToRefund}("");
        if (!success) {
            revert EtherNotSentError(msg.sender, amountToRefund);
        }
        emit Refund(msg.sender, amountToRefund, donatedAmount);
    }
}
