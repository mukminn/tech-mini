// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DailyCheckInBadge
 * @dev ERC-1155 contract for daily check-in badges
 * Enforces one check-in per wallet per day using timestamp-based tracking
 * Mints badges at milestones: Day 1, 3, 7, 14
 * Optimized for gas-sponsored transactions
 */
contract DailyCheckInBadge is ERC1155, Ownable, ReentrancyGuard {
    // Badge token IDs
    uint256 public constant BADGE_DAY_1 = 1;
    uint256 public constant BADGE_DAY_3 = 2;
    uint256 public constant BADGE_DAY_7 = 3;
    uint256 public constant BADGE_DAY_14 = 4;

    // Milestone days for badge minting
    uint256 public constant MILESTONE_DAY_1 = 1;
    uint256 public constant MILESTONE_DAY_3 = 3;
    uint256 public constant MILESTONE_DAY_7 = 7;
    uint256 public constant MILESTONE_DAY_14 = 14;

    // Mapping: wallet => last check-in day (as timestamp at start of day UTC)
    mapping(address => uint256) public lastCheckInDay;

    // Mapping: wallet => current streak count
    mapping(address => uint256) public streakCount;

    // Mapping: wallet => badge ID => has badge
    mapping(address => mapping(uint256 => bool)) public hasBadge;

    // Events
    event CheckIn(address indexed user, uint256 streak, uint256 timestamp);
    event BadgeMinted(address indexed user, uint256 badgeId, uint256 day);

    constructor() ERC1155("") Ownable(msg.sender) {
        // Base URI for metadata (can be updated later)
        _setURI("https://tech-mini-kappa.vercel.app/api/badge-metadata/");
    }

    /**
     * @dev Get the start of day timestamp in UTC
     * @return timestamp at 00:00:00 UTC for today
     */
    function getTodayTimestamp() public view returns (uint256) {
        // Get current timestamp and normalize to start of day UTC
        uint256 currentTime = block.timestamp;
        // Convert to days since epoch, then back to timestamp
        // This ensures we get the start of the current day in UTC
        uint256 dayStart = (currentTime / 86400) * 86400;
        return dayStart;
    }

    /**
     * @dev Check if user can check in today
     * @param user Address to check
     * @return true if user hasn't checked in today
     */
    function canCheckInToday(address user) public view returns (bool) {
        uint256 today = getTodayTimestamp();
        return lastCheckInDay[user] < today;
    }

    /**
     * @dev Get user's current streak
     * @param user Address to check
     * @return streak count
     */
    function getStreak(address user) public view returns (uint256) {
        return streakCount[user];
    }

    /**
     * @dev Main check-in function - enforces one check-in per day per wallet
     * Mints badges at milestones (Day 1, 3, 7, 14)
     * Uses timestamp-based daily restriction
     */
    function checkIn() external nonReentrant {
        address user = msg.sender;
        uint256 today = getTodayTimestamp();

        // Enforce one check-in per day
        require(
            lastCheckInDay[user] < today,
            "DailyCheckIn: Already checked in today"
        );

        uint256 lastCheckIn = lastCheckInDay[user];
        uint256 currentStreak = streakCount[user];
        uint256 newStreak;

        // Calculate new streak
        if (lastCheckIn == 0) {
            // First check-in ever
            newStreak = 1;
        } else {
            uint256 daysSinceLastCheckIn = (today - lastCheckIn) / 86400;
            if (daysSinceLastCheckIn == 1) {
                // Consecutive day - increment streak
                newStreak = currentStreak + 1;
            } else {
                // Streak broken - reset to 1
                newStreak = 1;
            }
        }

        // Update state
        lastCheckInDay[user] = today;
        streakCount[user] = newStreak;

        // Mint badges at milestones
        _mintBadgesForMilestone(user, newStreak);

        emit CheckIn(user, newStreak, block.timestamp);
    }

    /**
     * @dev Internal function to mint badges at milestone days
     * @param user Address to mint badge to
     * @param streak Current streak count
     */
    function _mintBadgesForMilestone(address user, uint256 streak) internal {
        // Day 1 badge
        if (streak == MILESTONE_DAY_1 && !hasBadge[user][BADGE_DAY_1]) {
            _mint(user, BADGE_DAY_1, 1, "");
            hasBadge[user][BADGE_DAY_1] = true;
            emit BadgeMinted(user, BADGE_DAY_1, MILESTONE_DAY_1);
        }

        // Day 3 badge
        if (streak == MILESTONE_DAY_3 && !hasBadge[user][BADGE_DAY_3]) {
            _mint(user, BADGE_DAY_3, 1, "");
            hasBadge[user][BADGE_DAY_3] = true;
            emit BadgeMinted(user, BADGE_DAY_3, MILESTONE_DAY_3);
        }

        // Day 7 badge
        if (streak == MILESTONE_DAY_7 && !hasBadge[user][BADGE_DAY_7]) {
            _mint(user, BADGE_DAY_7, 1, "");
            hasBadge[user][BADGE_DAY_7] = true;
            emit BadgeMinted(user, BADGE_DAY_7, MILESTONE_DAY_7);
        }

        // Day 14 badge
        if (streak == MILESTONE_DAY_14 && !hasBadge[user][BADGE_DAY_14]) {
            _mint(user, BADGE_DAY_14, 1, "");
            hasBadge[user][BADGE_DAY_14] = true;
            emit BadgeMinted(user, BADGE_DAY_14, MILESTONE_DAY_14);
        }
    }

    /**
     * @dev Check if user has a specific badge
     * @param user Address to check
     * @param badgeId Badge token ID
     * @return true if user has the badge
     */
    function userHasBadge(address user, uint256 badgeId)
        external
        view
        returns (bool)
    {
        return balanceOf(user, badgeId) > 0;
    }

    /**
     * @dev Update base URI for metadata (owner only)
     * @param newURI New base URI
     */
    function setURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
    }

    /**
     * @dev Override to prevent transfers (badges are soulbound)
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Allow minting (from == address(0))
        // Allow burning to address(0) if needed
        // Prevent transfers between users
        if (from != address(0) && to != address(0)) {
            revert("DailyCheckIn: Badges are non-transferable");
        }
        super._update(from, to, ids, values);
    }
}
