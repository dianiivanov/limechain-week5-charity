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
error ZeroDonationAmountError(address donator, uint256 amount);
error FundTargetExceeded(address donator, uint256 amount);
error CharityIsFinished(address donator);
error CharityIsNotFinished(address sender);
error RefundIsNotYetAllowed(address sender);

contract CharityFund is Ownable {
    uint256 public constant MIN_TIMEFRAME_IN_DAYS = 2 days;
    uint256 public immutable targetAmount;
    string public fundCause;
    uint256 public immutable timeframe;
    mapping(address => uint256) public donatedAmountFrom;
    bool public isClosed;
    uint256 private _donatedAmount;

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
        if (isClosed) {
            revert CharityIsFinished(msg.sender);
        }
        _;
    }

    function donate() public payable onlyForCharityNotFinished {
        if (msg.value == 0) {
            revert ZeroDonationAmountError(msg.sender, msg.value);
        }
        if (_donatedAmount + msg.value > targetAmount) {
            revert FundTargetExceeded(msg.sender, msg.value);
        }
        _donatedAmount += msg.value;
        donatedAmountFrom[msg.sender] += msg.value;
        emit Donate(msg.sender, msg.value, _donatedAmount);
        if (_donatedAmount == targetAmount) {
            isClosed = true;
            emit Closed(msg.sender, msg.value);
        }
    }

    function remainingAmount() public view returns (uint256) {
        return targetAmount - _donatedAmount;
    }

    function isOpen() public view returns (bool) {
        return !isClosed;
    }

    function withdraw() public onlyOwner {
        if (isOpen()) {
            revert CharityIsNotFinished(msg.sender);
        }
        payable(msg.sender).transfer(_donatedAmount);
        emit Withdraw(msg.sender, _donatedAmount);
        _donatedAmount = 0;
    }

    function refund() public onlyForCharityNotFinished {
        if (block.timestamp < timeframe) {
            revert RefundIsNotYetAllowed(msg.sender);
        }
        payable(msg.sender).transfer(donatedAmountFrom[msg.sender]);
        _donatedAmount -= donatedAmountFrom[msg.sender];
        emit Refund(msg.sender, donatedAmountFrom[msg.sender], _donatedAmount);
        donatedAmountFrom[msg.sender] = 0;
    }

    fallback() external payable {
        emit FallbackCalled(msg.sender, msg.value);
        donate();
    }

    receive() external payable {
        emit ReceiveCalled(msg.sender, msg.value);
        donate();
    }
}
