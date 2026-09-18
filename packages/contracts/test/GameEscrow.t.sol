// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GameEscrow} from "../src/GameEscrow.sol";
import {MockERC20} from "./MockERC20.sol";

contract GameEscrowTest is Test {
    MockERC20 token;
    GameEscrow escrow;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        token = new MockERC20("Test", "TST", 18);
        escrow = new GameEscrow(address(token), address(this));
        token.mint(alice, 1_000 ether);
        token.mint(bob, 1_000 ether);
    }

    function testDepositAndSettle() public {
        bytes32 gameId = keccak256("game-1");
        vm.startPrank(alice);
        token.approve(address(escrow), 100 ether);
        escrow.deposit(gameId, 100 ether);
        vm.stopPrank();

        address[] memory winners = new address[](1);
        winners[0] = bob;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;
        escrow.settle(gameId, winners, amounts);

        vm.prank(bob);
        escrow.withdraw(100 ether);
        assertEq(token.balanceOf(bob), 1_100 ether);
    }
}
