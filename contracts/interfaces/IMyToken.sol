//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title IMyToken
 * @author justchillinghere
 * @dev Interface for the my implementation of a ERC20 token.
 */
interface IMyToken is IERC20, IERC20Metadata, IAccessControl {
    /**
     * @dev Adds minter role to the specified address.
     *
     * Requirement: Only address with admin role can call this function.
     */
    function addMinterRole(address newMinter) external;

    /**
     *
     * @dev Mints new tokens and assigns them to the specified address.
     *
     * Requirement: Only address with minter role can call this function.
     */
    function mint(address to, uint256 amount) external;
}
