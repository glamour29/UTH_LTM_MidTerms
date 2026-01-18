import { VALID_CHOICES } from "../../config/constants.js";

/**
 * Validate RPS choice
 * @param {string} choice - The choice to validate
 * @returns {boolean} - True if valid
 */
export function isValidChoice(choice) {
  return VALID_CHOICES.includes(choice);
}

/**
 * Validate room ID
 * @param {string} roomID - The room ID to validate
 * @returns {boolean} - True if valid
 */
export function isValidRoomID(roomID) {
  return roomID && typeof roomID === "string" && roomID.trim().length > 0;
}
