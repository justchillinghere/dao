//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

/**
 * @title IMyDAO
 * @author justchillinghere
 * @dev Interface for the simple DAO implementation.
 */
interface IMyDAO {
    event Deposited(address indexed user, uint256 amount);
    event ProposalAdded(
        uint256 indexed proposalId,
        address recipient,
        string description
    );
    event Voted(address indexed user, uint256 proposalId, bool inFavor);
    event ProposalFinished(uint256 indexed proposalId, bool passed);
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @dev Deposits tokens into the DAO contract.
     *
     * Requirements:
     *
     * - `amount` must be greater than 0.
     */
    function deposit(uint256 amount) external;

    /**
     * @dev Adds a proposal to the DAO.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - `value` must be greater than 0.
     * - `description` cannot be empty.
     */
    function addProposal(
        address recipient,
        string calldata description,
        bytes calldata signature
    ) external;

    /**
     * @dev Votes for a proposal.
     *
     * Requirements:
     *
     * - `proposalId` must be a valid proposal.
     * - `inFavor` must be true or false.
     */
    function vote(
        uint256 proposalId,
        bool isAgreed,
        uint256 votesAmount
    ) external;

    /**
     * @dev Finishes a proposal and executes the necessary actions.
     *
     * Requirements:
     *
     * - `proposalId` must be a valid proposal.
     */
    function finishProposal(uint256 proposalId) external;

    /**
     * @dev Withdraws tokens from the DAO contract.
     *
     * Requirements:
     *
     * - `amount` must be greater than 0.
     */
    function withdraw() external;
}
