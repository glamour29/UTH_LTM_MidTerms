/**
 * Main Entry Point
 * Initializes the game and sets up all components
 */
import { GameState } from "./game/gameState.js";
import { GameUI } from "./ui/gameUI.js";
import { ResultUI } from "./ui/resultUI.js";
import { JoinUI } from "./ui/joinUI.js";
import { SocketClient } from "./socket/socketClient.js";

// Global state
let gameState;
let gameUI;
let resultUI;
let joinUI;
let socketClient;

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  console.log(" DOM loaded");

  // Initialize components
  gameState = new GameState();
  gameUI = new GameUI();
  resultUI = new ResultUI();
  joinUI = new JoinUI();

  // Initialize UI components
  gameUI.init();
  resultUI.init();
  joinUI.init();

  // Setup rules handlers
  gameUI.setupRulesHandlers();

  // Initialize socket client
  socketClient = new SocketClient(gameState, gameUI, resultUI, joinUI);

  // Setup join page event listeners
  joinUI.setupEventListeners(() => {
    joinRoom();
  });

  // Ensure join page is visible on load
  joinUI.show();

  // Ensure other sections are hidden
  gameUI.hide();
  resultUI.hide();

  console.log(" Game initialized");
});

// Global functions for HTML onclick handlers
window.createRoom = () => {
  console.log(" createRoom() called");

  const socket = socketClient.getSocket();
  if (!socket || !socket.connected) {
    alert(" Chưa kết nối đến server!");
    return;
  }

  // Generate secure room ID using crypto API
  const roomID = crypto.randomUUID().substring(0, 8).toUpperCase();
  gameState.setRoomID(roomID);
  socketClient.createRoom(roomID);
  joinUI.displayRoomID(roomID);
};

window.copyRoomId = () => {
  joinUI.copyRoomId();
};

window.joinRoom = () => {
  console.log("🔵 joinRoom() called");

  const socket = socketClient.getSocket();
  if (!socket || !socket.connected) {
    alert(" Chưa kết nối đến server! Vui lòng làm mới trang.");
    return;
  }

  const roomIdInput = document.getElementById("room-id");
  if (!roomIdInput) {
    alert(" Lỗi trang. Vui lòng làm mới.");
    return;
  }

  const roomID = roomIdInput.value?.trim();
  if (!roomID) {
    alert(" Vui lòng nhập mã phòng!");
    roomIdInput.focus();
    return;
  }

  // Reset state
  gameState.reset();
  resultUI.hide();
  resultUI.reset();

  socketClient.joinRoom(roomID);

  // Show loading state
  const joinBtn = document.querySelector(".join__room");
  if (joinBtn) {
    joinBtn.disabled = true;
    joinBtn.textContent = "Đang vào...";
    setTimeout(() => {
      joinBtn.disabled = false;
      joinBtn.textContent = "Vào phòng";
    }, 3000);
  }
};

window.clickChoice = (rpschoice) => {
  console.log(" clickChoice called with:", rpschoice);
  console.log(" Current roomID:", gameState.roomID);
  console.log(" Current player1:", gameState.player1);
  console.log(" Waiting for opponent:", gameState.waitingForOpponent);

  if (!gameState.roomID) {
    console.error(" No roomID set!");
    alert("Vui lòng tham gia phòng trước!");
    return;
  }

  if (gameState.waitingForOpponent) {
    alert("Đang chờ người chơi khác vào phòng. Vui lòng chờ!");
    return;
  }

  if (gameState.hasChosen) {
    console.log(" Already made a choice in this round");
    return;
  }

  // Validate choice
  if (!["rock", "paper", "scissors"].includes(rpschoice)) {
    console.error(" Invalid choice:", rpschoice);
    alert("Lựa chọn không hợp lệ! Vui lòng chọn Kéo, Búa, hoặc Bao.");
    return;
  }

  // Mark as chosen immediately
  gameState.markAsChosen();

  // Initialize UI elements to ensure they're available
  if (!resultUI.elements) resultUI.init();
  if (!gameUI.elements) gameUI.init();

  // Hide game area FIRST
  gameUI.hideGameArea();

  // Show result board AFTER hiding game area
  resultUI.show();

  // Display your choice
  resultUI.displayYourChoice(rpschoice);

  // Reset opponent choice display
  resultUI.showWaitingForOpponent();

  // Send choice to server
  socketClient.sendChoice(rpschoice);
  
  console.log(" Choice made, game area hidden, result board shown");
};

window.playAgain = () => {
  socketClient.playAgain();
};

window.exitGame = () => {
  console.log(" exitGame() called");

  socketClient.exitGame();

  // Always return to login screen
  gameState.reset();
  joinUI.show();
  gameUI.hide();
  resultUI.hide();
  joinUI.clearInputs();
};
