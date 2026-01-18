import { WINNER_TYPES } from "../../config/constants.js";

/**
 * Determine winner of RPS game
 * @param {string} p1Choice - Player 1's choice
 * @param {string} p2Choice - Player 2's choice
 * @returns {string} - Winner: "draw", "p1", or "p2"
 */
export function determineWinner(p1Choice, p2Choice) {
  if (p1Choice === p2Choice) {
    return WINNER_TYPES.DRAW;
  }

  // Rock beats Scissors
  // Paper beats Rock
  // Scissors beats Paper
  if (p1Choice === "rock") {
    return p2Choice === "scissors" ? WINNER_TYPES.PLAYER1 : WINNER_TYPES.PLAYER2;
  } else if (p1Choice === "paper") {
    return p2Choice === "scissors" ? WINNER_TYPES.PLAYER2 : WINNER_TYPES.PLAYER1;
  } else if (p1Choice === "scissors") {
    return p2Choice === "rock" ? WINNER_TYPES.PLAYER2 : WINNER_TYPES.PLAYER1;
  }

  return WINNER_TYPES.DRAW;
}
