//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

/**
 * @title IMyDAO
 * @author justchillinghere
 * @dev Interface for the simple DAO implementation.
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMyDAO {
    // События
    event Deposited(address indexed user, uint256 amount);
    event ProposalAdded(
        uint256 indexed proposalId,
        address recipient,
        string description
    );
    event Voted(address indexed user, uint256 proposalId, bool inFavor);
    event ProposalFinished(uint256 indexed proposalId, bool passed);
    event Withdrawn(address indexed user, uint256 amount);

    // Функции для DAO

    // Функция для депозита токенов
    function deposit(uint256 amount) external;

    // Функция для создания предложения
    function addProposal(
        address recipient,
        uint256 value,
        string calldata description
    ) external returns (uint256 proposalId);

    // Функция для голосования
    function vote(uint256 proposalId, bool inFavor) external;

    // Функция для завершения предложения
    function finishProposal(uint256 proposalId) external;

    // Функция для вывода средств
    function withdraw(uint256 amount) external;
}
