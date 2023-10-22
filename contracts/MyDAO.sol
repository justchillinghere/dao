//SPDX-License-Identifier: Unlicense
pragma solidity =0.8.18;

import "./MyToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IMyDAO.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MyDAO
 * @author justchillinghere
 * @notice A contract for a simple DAO.
 */
contract MyDAO is IMyDAO, AccessControl {
    IERC20 public govToken;
    bytes32 public constant CHAIRPERSON_ROLE = keccak256("CHAIRPERSON_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public minProposalDuration;
    uint256 public minQuorum;
    uint256 private _proposalIdCounter;
    mapping(uint256 proposalId => Proposal) public proposals;
    mapping(address userAddress => User) public users;

    struct User {
        uint256 votesAvailable;
        mapping(uint256 proposalId => uint256 amount) votesLocked;
    }
    struct Proposal {
        address proposer;
        string description;
        address recipient; // Can be used for various purposes, such as target contracts
        bytes data; // Any additional data or parameters related to the proposal
        address[] voters; // List of voters
        mapping(bool isAgreed => uint) votesCount; // Count of Agreed(1)/Disagreed(0) values
        uint256 startedAt;
        bool finished;
    }

    constructor(
        address chairperson,
        address _govToken,
        uint256 _prposalDuration,
        uint256 _minQuorum
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CHAIRPERSON_ROLE, ADMIN_ROLE);
        _setupRole(CHAIRPERSON_ROLE, chairperson);
        govToken = IERC20(_govToken);
        minProposalDuration = _prposalDuration;
        minQuorum = _minQuorum;
    }

    function addProposal(
        address recipient,
        string calldata description,
        bytes calldata signature
    ) external onlyRole(CHAIRPERSON_ROLE) {
        unchecked {
            _proposalIdCounter++;
        }
        Proposal storage newProposal = proposals[_proposalIdCounter];
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.data = signature;
        newProposal.startedAt = block.timestamp;

        emit ProposalAdded(_proposalIdCounter, recipient, description);
    }

    function deposit(uint256 amount) public {
        govToken.transferFrom(msg.sender, address(this), amount);
        User storage newUser = users[msg.sender];
        newUser.votesAvailable += amount;
        emit Deposited(msg.sender, amount);
    }

    function vote(
        uint256 proposalId,
        bool isAgreed,
        uint256 votesAmount
    ) external {
        require(
            users[msg.sender].votesAvailable > votesAmount,
            "Insufficient tokens to vote"
        );
        require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
        require(
            block.timestamp <
                proposals[proposalId].startedAt + minProposalDuration,
            "Voting period has ended"
        );

        Proposal storage proposal = proposals[proposalId];
        users[msg.sender].votesAvailable -= votesAmount;
        users[msg.sender].votesLocked[proposalId] += votesAmount;
        proposal.voters.push(msg.sender);
        proposal.votesCount[isAgreed] += votesAmount;
        emit Voted(msg.sender, proposalId, isAgreed);
    }

    function _unlockVotes(uint256 proposalId) internal {
        for (uint256 i = 0; i < proposals[proposalId].voters.length; i++) {
            address voter = proposals[proposalId].voters[i];
            uint256 votesAmount = users[voter].votesLocked[proposalId];
            users[voter].votesLocked[proposalId] = 0;
            users[voter].votesAvailable += votesAmount;
        }
    }

    function _callContract(address recipient, bytes memory signature) internal {
        (bool success, ) = recipient.call{value: 0}(signature);
        require(success, "Call failed");
    }

    function finishProposal(uint256 proposalId) external {
        require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
        require(
            users[msg.sender].votesLocked[proposalId] > 0 ||
                hasRole(CHAIRPERSON_ROLE, msg.sender),
            "You cannot finish this proposal"
        );

        Proposal storage proposalToFinish = proposals[proposalId];
        require(
            block.timestamp > proposalToFinish.startedAt + minProposalDuration,
            "Voting period has not ended yet"
        );
        require(
            !proposalToFinish.finished,
            "Proposal has already been finished"
        );
        require(
            proposalToFinish.voters.length >= minQuorum,
            "Quorum has not been reached"
        );

        if (
            proposalToFinish.votesCount[true] >
            proposalToFinish.votesCount[false]
        ) {
            proposalToFinish.finished = true;
            _callContract(proposalToFinish.recipient, proposalToFinish.data); // TODO: REFACTOR
            emit ProposalFinished(proposalId, true);
        } else {
            proposalToFinish.finished = true;
            emit ProposalFinished(proposalId, false);
        }
        _unlockVotes(proposalId);
    }

    function withdraw() external {
        require(
            users[msg.sender].votesAvailable > 0,
            "You have no votes to withdraw"
        );
        uint256 amount = users[msg.sender].votesAvailable;
        users[msg.sender].votesAvailable = 0;
        govToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }
}
