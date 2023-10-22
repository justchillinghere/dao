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
contract MyDAO is IMyBridge, AccessControl {
    IERC20 public govToken;
	bytes32 public constant CHAIRPERSON_ROLE = keccak256("CHAIRPERSON_ROLE");
    uint256 public minProposalDuration;
    uint256 public minQuorum;
    uint256 private _proposalIdCounter;
    mapping(uint256 proposalId => Proposal) public proposals;
    mapping(address userAddress => User) public users;

	struct User {
		uint256 votesAvailable;
		mapping (uint256 proposalId => uint256 amount) votesLocked;
	}
    struct Proposal {
        address proposer;
        string description;
        address recipient; // Can be used for various purposes, such as target contracts
        bytes data; // Any additional data or parameters related to the proposal
        uint256[] voters; // List of voters
        mapping(bool => uint) votesCount; // Count of Agreed(1)/Disagreed(0) values
        uint256 startedAt;
        bool finished;
    }

    constructor(
        address _moderator,
        address _govToken,
        uint256 _prposalDuration,
        uint256 _minQuorum
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(CHAIRPERSON_ROLE, moderator);
        govToken = IERC20(_govToken);
        proposalDuration = _prposalDuration;
        minQuorum = _minQuorum;
    }

    function addProposal (
        address recipient,
        uint256 value,
        string calldata description
    ) onlyRole(CHAIRPERSON_ROLE) external returns (uint256 proposalId) {
        unchecked {
            _proposalIdCounter++;
        }
        Proposal storage newProposal = proposals[_proposalIdCounter];
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.startedAt = block.timestamp();

        emit ProposalAdded(_proposalIdCounter, recipient, description);
    }

    function deposit(uint256 amount) {
		govToken.transferFrom(msg.sender, address(this), amount);
		User storage newUser = users[msg.sender];
		newUser.votesAvailable += deposit;
		emit Deposited(address msg.sender, uint256 amount);
	}

    function vote(uint256 proposalId, uint8 isAgreed, uint256 votesAmount) external {
		require(users[msg.sender].votesAvailable > votesAmount, "Insufficient tokens to vote");
		require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
    	require(block.timestamp < proposals[proposalId].startedAt + proposalDuration, "Voting period has ended");

		users[msg.sender].votesAvailable -= votesAmount;
		users[msg.sender].votesLocked[proposalId] += votesAmount;
		proposals[proposalId].voters.push(msg.sender);
		proposals[proposalId].votesCount[isAgreed] += votesAmount;
		emit Voted(msg.sender, proposalId, isAgreed);
	}

	function _unlockVotes(uint256 proposalId) internal {
		for (uint256 i = 0; i < proposals[proposalId].voters.length; i++) {
			address voter = proposals[proposalId].voters[i];
			uint256 votesAmount = users[voter].votesLocked[proposalId];
			users[voter].votesLocked[proposalId] = 0;
			users[voter].votesAvailable += votesAmount;
		}
	};

	function finishProposal(uint256 proposalId) external {
		require(users[msg.sender].votesLocked[proposalId] > 0 || hasRole(CHAIRPERSON_ROLE, msg.sender) , "You cannot finish this proposal");
		require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
		require(block.timestamp > proposals[proposalId].startedAt + proposalDuration, "Voting period has not ended yet");
		require(!proposals[proposalId].finished, "Proposal has already been finished");
		require(proposals[proposalId].voters.length >= minQuorum, "Quorum has not been reached");

		if (proposals[proposalId].votesCount[true] > proposals[proposalId].votesCount[false]) {
			proposals[proposalId].finished = true;
			proposals[proposalId].recipient.call{value: proposals[proposalId].value}(""); // TODO: REFACTOR
			emit ProposalFinished(proposalId, true);
		} else {
			proposals[proposalId].finished = true;
			emit ProposalFinished(proposalId, false);
		}
		_unlockVotes(proposalId);
	}

	function withdraw() external {
		require(users[msg.sender].votesAvailable > 0, "You have no votes to withdraw");
		uint256 amount = users[msg.sender].votesAvailable;
		users[msg.sender].votesAvailable = 0;
		govToken.transfer(msg.sender, amount);
		emit Withdrawn(msg.sender, amount);
	}
}
