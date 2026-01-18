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

/**
 * Generate a shareable room ID that works on both secure (localhost/HTTPS)
 * and insecure (LAN IP over HTTP) contexts where crypto.randomUUID may
 * be unavailable.
 */
function generateRoomID() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
    }
  } catch (err) {
    console.warn("randomUUID not available, falling back", err);
  }

  try {
    const bytes = new Uint32Array(2);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      // Minimal fallback when crypto is unavailable
      bytes[0] = Math.floor(Math.random() * 0xffffffff);
      bytes[1] = Math.floor(Math.random() * 0xffffffff);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(8, "0"))
      .join("")
      .substring(0, 8)
      .toUpperCase();
  } catch (err) {
    console.error("Failed to generate room ID with crypto fallback:", err);
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");

  // Check if Socket.IO is loaded
  if (typeof io === "undefined") {
    console.error("Socket.IO library not loaded!");
    alert("Lỗi: Không thể tải thư viện Socket.IO. Vui lòng làm mới trang.");
    return;
  }

  try {
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

    console.log("Game initialized");
  } catch (error) {
    console.error("Error initializing game:", error);
    alert("Lỗi khởi tạo game: " + error.message);
  }
});

// Global functions for HTML onclick handlers
window.createRoom = () => {
  console.log("createRoom() called");
  console.log("Current URL:", window.location.href);
  console.log("Origin:", window.location.origin);

  // Check if socketClient is initialized
  if (!socketClient) {
    alert("Đang khởi tạo kết nối. Vui lòng đợi vài giây rồi thử lại.");
    return;
  }

  const socket = socketClient.getSocket();
  if (!socket) {
    alert("Socket chưa được khởi tạo. Vui lòng làm mới trang.");
    return;
  }
  
  console.log("Socket connected:", socket.connected);
  console.log("Socket ID:", socket.id);
  console.log("Socket transport:", socket.io?.engine?.transport?.name);
  
  if (!socket.connected) {
    alert("Chưa kết nối đến server!\n\nĐang thử kết nối lại...\nVui lòng đợi vài giây rồi thử lại.");
    // Force reconnect
    socket.connect();
    return;
  }

  // Generate secure room ID using crypto API
  const roomID = generateRoomID();
  if (!roomID) {
    alert("Không thể tạo mã phòng. Vui lòng thử lại.");
    return;
  }
  console.log(`Generated roomID: ${roomID}`);
  
  gameState.setRoomID(roomID);
  
  try {
    socketClient.createRoom(roomID);
    joinUI.displayRoomID(roomID);
    console.log(`Room creation initiated`);
  } catch (error) {
    console.error("Error creating room:", error);
    alert("Lỗi khi tạo phòng: " + error.message);
  }
};

window.copyRoomId = () => {
  joinUI.copyRoomId();
};

window.joinRoom = () => {
  console.log("joinRoom() called");
  console.log("Current URL:", window.location.href);

  if (!socketClient) {
    alert("Đang khởi tạo kết nối. Vui lòng đợi vài giây rồi thử lại.");
    return;
  }

  const socket = socketClient.getSocket();
  if (!socket) {
    alert("Socket chưa được khởi tạo. Vui lòng làm mới trang.");
    return;
  }
  
  console.log("Socket connected:", socket.connected);
  
  if (!socket.connected) {
    alert("Chưa kết nối đến server!\n\nĐang thử kết nối lại...\nVui lòng đợi vài giây rồi thử lại.");
    socket.connect();
    return;
  }

  const roomIdInput = document.getElementById("room-id");
  if (!roomIdInput) {
    alert("Lỗi trang. Vui lòng làm mới.");
    return;
  }

  const roomID = roomIdInput.value?.trim();
  if (!roomID) {
    alert("Vui lòng nhập mã phòng!");
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
  console.log("clickChoice called with:", rpschoice);
  console.log("Current roomID:", gameState.roomID);
  console.log("Current player1:", gameState.player1);
  console.log("Waiting for opponent:", gameState.waitingForOpponent);

  if (!gameState.roomID) {
    console.error("No roomID set!");
    alert("Vui lòng tham gia phòng trước!");
    return;
  }

  if (gameState.waitingForOpponent) {
    alert("Đang chờ người chơi khác vào phòng. Vui lòng chờ!");
    return;
  }

  if (gameState.hasChosen) {
    console.log("Already made a choice in this round");
    return;
  }

  // Validate choice
  if (!["rock", "paper", "scissors"].includes(rpschoice)) {
    console.error("Invalid choice:", rpschoice);
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
  
  console.log("Choice made, game area hidden, result board shown");
};

window.playAgain = () => {
  socketClient.playAgain();
};

window.exitGame = () => {
  console.log("exitGame() called");

  socketClient.exitGame();

  // Always return to login screen
  gameState.reset();
  joinUI.show();
  gameUI.hide();
  resultUI.hide();
  joinUI.clearInputs();
};
