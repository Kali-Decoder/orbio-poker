// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {SafeERC20} from "./lib/SafeERC20.sol";

/**
 * @title GameEscrow
 * @notice Escrow for No-Limit Inference. Poker actions stay off-chain.
 *         Only deposit / settle / withdraw move ERC-20 balances.
 */
contract GameEscrow {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public owner;

    mapping(bytes32 => uint256) public gameEscrow;
    mapping(address => uint256) public withdrawable;

    event Deposited(bytes32 indexed gameId, address indexed from, uint256 amount);
    event Settled(bytes32 indexed gameId, address[] winners, uint256[] amounts);
    event Withdrawn(address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error LengthMismatch();
    error NothingToWithdraw();
    error AlreadySettled();
    error ZeroAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address token_, address owner_) {
        token = IERC20(token_);
        owner = owner_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Pull `amount` of ERC-20 into escrow for `gameId`.
    function deposit(bytes32 gameId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        gameEscrow[gameId] += amount;
        emit Deposited(gameId, msg.sender, amount);
    }

    /**
     * @notice Release escrow to winners (off-chain poker result).
     *         Credits `withdrawable` balances; winners call `withdraw`.
     */
    function settle(
        bytes32 gameId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOwner {
        if (winners.length != amounts.length) revert LengthMismatch();
        uint256 locked = gameEscrow[gameId];
        if (locked == 0) revert AlreadySettled();

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
            withdrawable[winners[i]] += amounts[i];
        }
        require(total == locked, "SettlementMismatch");
        gameEscrow[gameId] = 0;
        emit Settled(gameId, winners, amounts);
    }

    function withdraw(uint256 amount) external {
        uint256 bal = withdrawable[msg.sender];
        if (amount == 0 || amount > bal) revert NothingToWithdraw();
        withdrawable[msg.sender] = bal - amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
}
