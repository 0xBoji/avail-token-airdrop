// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AvailToken is ERC20, Ownable {
    constructor() ERC20("AVAIL FAKE", "AVAIL") Ownable(msg.sender) {
        // Mint 1 million tokens to the deployer
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
} 