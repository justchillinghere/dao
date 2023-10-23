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
        uint256[] activeDebates; // here we store ids of debates that user has locked votes in
    }
    struct Proposal {
        address proposer;
        string description;
        address recipient; // Can be used for various purposes, such as target contracts
        bytes data; // Any additional data or parameters related to the proposal
        mapping(address => uint256) voters; // Map of voters to their votes
        mapping(bool isAgreed => uint) votesCount; // Count of Agreed(1)/Disagreed(0) values
        uint256 startedAt;
        uint256 votersCount;
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

    function vote(uint256 proposalId, bool isAgreed) external {
        require(
            users[msg.sender].votesAvailable > 0,
            "Insufficient tokens to vote"
        );
        require(
            proposals[proposalId].voters[msg.sender] == 0,
            "User has already voted for this proposal"
        );
        require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
        require(
            block.timestamp <
                proposals[proposalId].startedAt + minProposalDuration,
            "Voting period has ended"
        );

        users[msg.sender].activeDebates.push(proposalId);
        Proposal storage proposal = proposals[proposalId];
        proposal.voters[msg.sender] = users[msg.sender].votesAvailable;
        proposal.votesCount[isAgreed] += users[msg.sender].votesAvailable;
        unchecked {
            proposal.votersCount++;
        }
        emit Voted(msg.sender, proposalId, isAgreed);
    }

    function _callContract(address recipient, bytes memory signature) internal {
        (bool success, ) = recipient.call{value: 0}(signature);
        require(success, "Call failed");
    }

    function finishProposal(uint256 proposalId) external {
        require(proposals[proposalId].startedAt > 0, "Invalid proposalId");
        require(
            users[msg.sender].votesAvailable > 0 ||
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
            proposalToFinish.votersCount >= minQuorum,
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
    }

    function _getActiveDebates(
        address user
    ) internal view returns (uint256[] memory) {
        uint256[] memory newActiveDebates = new uint256[](
            users[user].activeDebates.length
        );
        uint256 counter = 0;
        for (uint256 i = 0; i < users[user].activeDebates.length; i++) {
            uint256 proposalId = users[user].activeDebates[i];
            if (!proposals[proposalId].finished) {
                newActiveDebates[counter] = proposalId;
                counter++;
            }
        }

        uint256[] memory finalActiveDebates = new uint256[](counter);
        for (uint256 i = 0; i < counter; i++) {
            finalActiveDebates[i] = newActiveDebates[i];
        }

        return finalActiveDebates;
    }

    function withdraw() external {
        require(
            users[msg.sender].votesAvailable > 0,
            "You have no votes to withdraw"
        );

        uint256[] memory _activeDebates = _getActiveDebates(msg.sender);
        users[msg.sender].activeDebates = _activeDebates;

        require(
            users[msg.sender].activeDebates.length == 0,
            "You have active debates"
        );

        uint256 amount = users[msg.sender].votesAvailable;
        users[msg.sender].votesAvailable = 0;

        govToken.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }
}
