import { ROOM_STATUS } from "../../config/constants.js";

/**
 * Room Manager - Handles room creation, joining, and state management
 */
export class RoomManager {
  constructor() {
    this.rooms = {};
  }

  /**
   * Create a new room
   * @param {string} roomID - Room identifier
   * @param {string} playerId - Player 1's socket ID
   */
  createRoom(roomID, playerId) {
    this.rooms[roomID] = {
      p1Choice: null,
      p2Choice: null,
      p1Score: 0,
      p2Score: 0,
      player1Id: playerId,
      player2Id: null,
      status: ROOM_STATUS.WAITING,
    };
    return this.rooms[roomID];
  }

  /**
   * Get room data
   * @param {string} roomID - Room identifier
   * @returns {Object|null} - Room data or null if not found
   */
  getRoom(roomID) {
    return this.rooms[roomID] || null;
  }

  /**
   * Check if room exists
   * @param {string} roomID - Room identifier
   * @returns {boolean}
   */
  roomExists(roomID) {
    return !!this.rooms[roomID];
  }

  /**
   * Join a room (assign player role)
   * @param {string} roomID - Room identifier
   * @param {string} playerId - Player's socket ID
   * @param {number} currentRoomSize - Current number of players in room
   * @returns {Object|null} - Updated room data or null
   */
  joinRoom(roomID, playerId, currentRoomSize) {
    if (!this.rooms[roomID]) {
      // Room doesn't exist, create it with player as player1
      this.rooms[roomID] = {
        p1Choice: null,
        p2Choice: null,
        p1Score: 0,
        p2Score: 0,
        player1Id: playerId,
        player2Id: null,
        status: ROOM_STATUS.PLAYING,
      };
      return this.rooms[roomID];
    }

    // If room exists but no active players, reset it
    if (currentRoomSize === 1 && (!this.rooms[roomID].player1Id || !this.rooms[roomID].player2Id)) {
      this.rooms[roomID] = {
        p1Choice: null,
        p2Choice: null,
        p1Score: 0,
        p2Score: 0,
        player1Id: null,
        player2Id: null,
        status: ROOM_STATUS.WAITING,
      };
    }

    // Assign player role
    if (!this.rooms[roomID].player1Id) {
      this.rooms[roomID].player1Id = playerId;
      this.rooms[roomID].status = ROOM_STATUS.PLAYING;
    } else if (!this.rooms[roomID].player2Id) {
      this.rooms[roomID].player2Id = playerId;
      this.rooms[roomID].status = ROOM_STATUS.PLAYING;
    }

    // Reset choices when 2 players join
    if (currentRoomSize >= 2) {
      this.rooms[roomID].p1Choice = null;
      this.rooms[roomID].p2Choice = null;
    }

    return this.rooms[roomID];
  }

  /**
   * Delete a room
   * @param {string} roomID - Room identifier
   */
  deleteRoom(roomID) {
    delete this.rooms[roomID];
  }

  /**
   * Reset room state when player leaves
   * @param {string} roomID - Room identifier
   * @param {boolean} isPlayer1 - Whether leaving player is player 1
   */
  resetRoomOnPlayerLeave(roomID, isPlayer1) {
    if (!this.rooms[roomID]) return;

    if (isPlayer1) {
      this.rooms[roomID].player1Id = null;
    } else {
      this.rooms[roomID].player2Id = null;
    }

    this.rooms[roomID].p1Choice = null;
    this.rooms[roomID].p2Choice = null;
    this.rooms[roomID].p1Score = 0;
    this.rooms[roomID].p2Score = 0;
    this.rooms[roomID].status = ROOM_STATUS.WAITING;
  }

  /**
   * Set player choice
   * @param {string} roomID - Room identifier
   * @param {boolean} isPlayer1 - Whether it's player 1
   * @param {string} choice - The choice made
   */
  setChoice(roomID, isPlayer1, choice) {
    if (!this.rooms[roomID]) return false;

    if (isPlayer1) {
      this.rooms[roomID].p1Choice = choice;
    } else {
      this.rooms[roomID].p2Choice = choice;
    }

    return true;
  }

  /**
   * Reset choices for next round
   * @param {string} roomID - Room identifier
   */
  resetChoices(roomID) {
    if (this.rooms[roomID]) {
      this.rooms[roomID].p1Choice = null;
      this.rooms[roomID].p2Choice = null;
    }
  }

  /**
   * Update score
   * @param {string} roomID - Room identifier
   * @param {string} winner - Winner type ("p1", "p2", or "draw")
   */
  updateScore(roomID, winner) {
    if (!this.rooms[roomID]) return;

    if (winner === "p1") {
      this.rooms[roomID].p1Score = (this.rooms[roomID].p1Score || 0) + 1;
    } else if (winner === "p2") {
      this.rooms[roomID].p2Score = (this.rooms[roomID].p2Score || 0) + 1;
    }
  }

  /**
   * Get all rooms (for debugging)
   * @returns {Object}
   */
  getAllRooms() {
    return this.rooms;
  }
}
