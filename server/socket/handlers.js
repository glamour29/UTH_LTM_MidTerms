import { isValidChoice } from "../utils/validation.js";
import { GAME_MESSAGES } from "../../config/constants.js";
import { determineWinner } from "../game/gameLogic.js";

// Reduce noise: turn on verbose logs only when DEBUG_LOGS=true
const DEBUG = process.env.DEBUG_LOGS === "true";
const logDebug = (...args) => {
  if (DEBUG) console.log(...args);
};

/**
 * Setup socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {RoomManager} roomManager - Room manager instance
 */
export function setupSocketHandlers(io, roomManager) {
  io.on("connection", (socket) => {
    const clientIP = socket.handshake.address || socket.request?.connection?.remoteAddress || "unknown";
    console.log(`Kết nối: ${socket.id} (${clientIP})`);
    logDebug(`Headers:`, socket.handshake.headers);

    // Handle disconnect
    socket.on("disconnect", () => {
      handleDisconnect(socket, io, roomManager);
    });

    // Handle room creation
    socket.on("createRoom", (roomID) => {
      console.log(`Nhận createRoom từ ${socket.id}, roomID: ${roomID}`);
      handleCreateRoom(socket, roomID, roomManager);
    });

    // Handle room joining
    socket.on("joinRoom", (roomID) => {
      handleJoinRoom(socket, roomID, io, roomManager);
    });

    // Handle player choices
    socket.on("p1Choice", (data) => {
      handlePlayerChoice(socket, data, io, roomManager, true);
    });

    socket.on("p2Choice", (data) => {
      handlePlayerChoice(socket, data, io, roomManager, false);
    });

    // Handle play again
    socket.on("playerClicked", (data) => {
      handlePlayAgain(socket, data, io, roomManager);
    });

    // Handle exit game
    socket.on("exitGame", (data) => {
      handleExitGame(socket, data, io, roomManager);
    });
  });
}

// Backwards compatible alias for server.js
export { setupSocketHandlers as registerSocketHandlers };

/**
 * Handle player disconnect
 */
function handleDisconnect(socket, io, roomManager) {
  console.log(`Ngắt kết nối: ${socket.id}`);

  // Find room this socket is in
  const rooms = roomManager.getAllRooms();
  for (const [roomID, roomData] of Object.entries(rooms)) {
    if (roomData.player1Id === socket.id || roomData.player2Id === socket.id) {
      logDebug(`Người chơi rời phòng ${roomID}`);

      const isPlayer1 = roomData.player1Id === socket.id;
      roomManager.resetRoomOnPlayerLeave(roomID, isPlayer1);

      // Check if there's a remaining player before notifying
      const roomMembers = io.sockets.adapter.rooms.get(roomID);
      const remainingSize = roomMembers ? roomMembers.size : 0;
      
      // Only notify if there's actually a remaining player
      if (remainingSize > 0) {
        // Notify remaining player
        socket.to(roomID).emit("opponentLeft", {
          message: GAME_MESSAGES.OPPONENT_LEFT,
          roomID: roomID,
        });
        logDebug(`Đã báo cho người chơi còn lại trong phòng ${roomID}`);
      } else {
        // No remaining players, delete room
        logDebug(`Phòng ${roomID} trống, xóa phòng`);
        roomManager.deleteRoom(roomID);
      }
      break;
    }
  }
}

/**
 * Handle room creation
 */
function handleCreateRoom(socket, roomID, roomManager) {
  logDebug(`createRoom requested - roomID: ${roomID}, socketID: ${socket.id}`);
  
  // Validate roomID
  if (!roomID || typeof roomID !== 'string' || roomID.trim().length === 0) {
    console.error(`roomID không hợp lệ: ${roomID}`);
    return socket.emit("error", "Mã phòng không hợp lệ");
  }
  
  // Create room in manager but DON'T join Socket.IO room yet
  // Player 1 will join when player 2 joins (via joinRoom)
  const room = roomManager.createRoom(roomID, socket.id);
  console.log(`Tạo phòng: ${roomID} bởi ${socket.id}`);
  logDebug(`Dữ liệu phòng:`, room);
  
  // Emit confirmation back to client
  socket.emit("roomCreated", { roomID: roomID });
  
  // Player 1 stays on join page until player 2 joins
}

/**
 * Handle room joining
 */
function handleJoinRoom(socket, roomID, io, roomManager) {
  logDebug(`joinRoom requested: ${roomID} by ${socket.id}`);

  // Check if room exists in roomManager (not adapter, because player 1 might not have joined yet)
  const roomDataInManager = roomManager.getRoom(roomID);
  
  // If room doesn't exist in manager, it's invalid
  if (!roomDataInManager) {
    console.warn(`Phòng không tồn tại: ${roomID}`);
    return socket.emit("notValidToken");
  }
  
  // Check if room exists in Socket.IO adapter (player 1 might have joined, or this is player 2)
  const roomExistsInAdapter = io.sockets.adapter.rooms.has(roomID);

  // Check if this is player 1 (creator) or player 2 (joiner)
  const isPlayer1Creator = roomDataInManager.player1Id === socket.id;
  
  // If player 1 is trying to join their own room, ignore (they should stay on join page)
  if (isPlayer1Creator) {
    logDebug(`Người tạo cố gắng tự vào phòng ${roomID}`);
    return;
  }
  
  // This is player 2 joining
  // First, make sure player 1 joins Socket.IO room (if they haven't already)
  const player1Socket = io.sockets.sockets.get(roomDataInManager.player1Id);
  if (player1Socket) {
    // Check if player 1 is already in the room
    const player1Rooms = Array.from(player1Socket.rooms || []);
    if (!player1Rooms.includes(roomID)) {
      logDebug(`Tự đưa người tạo vào Socket.IO room ${roomID}`);
      player1Socket.join(roomID);
    }
  } else {
    console.warn(`Không tìm thấy player1 (${roomDataInManager.player1Id}) cho phòng ${roomID}`);
    return socket.emit("notValidToken");
  }
  
  // Join player 2 to Socket.IO room
  socket.join(roomID);
  console.log(`Phòng ${roomID}: người chơi 2 đã vào (${socket.id})`);
  
  // Get current room size from Socket.IO adapter AFTER joining
  const roomMembers = io.sockets.adapter.rooms.get(roomID);
  const currentRoomSize = roomMembers ? roomMembers.size : 0;
  logDebug(`Phòng ${roomID} hiện có ${currentRoomSize} người`);

  // Check if room is already full
  if (currentRoomSize > 2) {
    console.warn(`Phòng ${roomID} đã đầy (${currentRoomSize} người)`);
    socket.leave(roomID);
    return socket.emit("roomFull");
  }

  // Update room data (assign player 2 if needed)
  const roomData = roomManager.joinRoom(roomID, socket.id, currentRoomSize);
  
  // Check room size AFTER joining
  const newRoomSize = io.sockets.adapter.rooms.get(roomID).size;
  logDebug(`Phòng ${roomID} sau khi join: ${newRoomSize} người`);
  logDebug(`Dữ liệu phòng:`, roomData);

  // Emit to BOTH players when room has 2 players
  if (newRoomSize >= 2) {
    console.log(`Phòng ${roomID}: đủ 2 người, gửi playersConnected`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => {
      emitPlayersConnected(roomID, io, roomData);
    });
  } else {
    logDebug(`Phòng ${roomID} chờ thêm người (${newRoomSize})`);
  }
}

/**
 * Emit playersConnected event to all players in room
 */
function emitPlayersConnected(roomID, io, roomData) {
  logDebug(`Gửi playersConnected cho phòng ${roomID}`);
  
  const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
  const roomSize = io.sockets.adapter.rooms.get(roomID).size;
  
  roomMembers.forEach((socketId) => {
    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      const isPlayer1 = roomData.player1Id === socketId;

      playerSocket.emit("playersConnected", {
        roomID: roomID, // Always include roomID
        roomSize: roomSize,
        isPlayer1: isPlayer1,
        player1Id: roomData.player1Id,
        player2Id: roomData.player2Id,
      });
      logDebug(`playersConnected -> ${socketId} (isPlayer1=${isPlayer1}) phòng ${roomID}`);
    }
  });
  logDebug(`Đã gửi playersConnected xong cho phòng ${roomID}`);
}

/**
 * Handle player choice
 */
function handlePlayerChoice(socket, data, io, roomManager, isPlayer1) {
  if (!data || !data.roomID || !data.rpschoice) {
    return socket.emit("error", GAME_MESSAGES.INVALID_CHOICE);
  }

  const choice = data.rpschoice;
  const roomID = data.roomID;
  const room = roomManager.getRoom(roomID);

  // Validate choice
  if (!isValidChoice(choice)) {
    return socket.emit("error", GAME_MESSAGES.INVALID_CHOICE);
  }

  if (!room) {
    return socket.emit("error", GAME_MESSAGES.ROOM_NOT_FOUND);
  }

  // Check if there are 2 players
  const roomMembers = io.sockets.adapter.rooms.get(roomID);
  const roomSize = roomMembers ? roomMembers.size : 0;
  if (roomSize < 2) {
    logDebug(`Chưa thể chọn - chỉ có ${roomSize} người trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.NEED_TWO_PLAYERS);
  }

  // Verify player role
  const expectedPlayerId = isPlayer1 ? room.player1Id : room.player2Id;
  if (expectedPlayerId !== socket.id) {
    const errorMsg = isPlayer1 ? GAME_MESSAGES.NOT_PLAYER1 : GAME_MESSAGES.NOT_PLAYER2;
    logDebug(`Socket ${socket.id} gửi ${isPlayer1 ? "p1" : "p2"}Choice sai vai trò`);
    return socket.emit("error", errorMsg);
  }

  // Check if opponent is in room
  const opponentId = isPlayer1 ? room.player2Id : room.player1Id;
  if (!opponentId) {
    logDebug(`Không thể chọn - thiếu đối thủ trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.OPPONENT_NOT_IN_ROOM);
  }

  // Prevent double choice
  const currentChoice = isPlayer1 ? room.p1Choice : room.p2Choice;
  if (currentChoice !== null) {
    logDebug(`Người chơi ${isPlayer1 ? "1" : "2"} đã chọn: ${currentChoice}`);
    return socket.emit("error", GAME_MESSAGES.ALREADY_CHOSEN);
  }

  // Set choice
  roomManager.setChoice(roomID, isPlayer1, choice);
  logDebug(`Người chơi ${isPlayer1 ? "1" : "2"} chọn ${choice} tại phòng ${roomID}`);
  logDebug(`Lựa chọn hiện tại - P1: ${room.p1Choice}, P2: ${room.p2Choice}`);

  // Emit to opponent
  const eventName = isPlayer1 ? "p1Choice" : "p2Choice";
  socket.to(roomID).emit(eventName, {
    rpsValue: choice,
    score: isPlayer1 ? room.p1Score : room.p2Score,
    p1Score: room.p1Score || 0,
    p2Score: room.p2Score || 0,
  });
  console.log(`Đã gửi ${eventName} đến phòng ${roomID} (không bao gồm người gửi)`);

  // If opponent already chose, send their choice back
  const opponentChoice = isPlayer1 ? room.p2Choice : room.p1Choice;
  if (opponentChoice !== null && opponentChoice !== undefined) {
    const opponentEventName = isPlayer1 ? "p2Choice" : "p1Choice";
    logDebug(`Đối thủ đã chọn, gửi lại cho người chơi`);
    socket.emit(opponentEventName, {
      rpsValue: opponentChoice,
      score: isPlayer1 ? room.p2Score : room.p1Score,
      p1Score: room.p1Score || 0,
      p2Score: room.p2Score || 0,
    });
  }

  // Check if both players have chosen
  if (room.p1Choice !== null && room.p2Choice !== null) {
    logDebug(`Cả hai đã chọn, xác định người thắng...`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => declareWinner(roomID, io, roomManager));
  } else {
    logDebug(`Đang chờ đối thủ chọn...`);
  }
}

/**
 * Handle play again
 */
function handlePlayAgain(socket, data, io, roomManager) {
  const roomID = data.roomID;
  logDebug(`Chơi lại trong phòng ${roomID}`);

  if (roomManager.getRoom(roomID)) {
    roomManager.resetChoices(roomID);
    logDebug(`Đã reset lựa chọn cho phòng ${roomID}`);
  }

  io.to(roomID).emit("playAgain");
  logDebug(`Đã gửi playAgain cho phòng ${roomID}`);
}

/**
 * Handle exit game
 */
function handleExitGame(socket, data, io, roomManager) {
  const roomID = data.roomID;
  logDebug(`Người chơi thoát phòng ${roomID}`);

  socket.leave(roomID);

  const room = roomManager.getRoom(roomID);
  if (room) {
    const isPlayer1 = data.player === true;
    roomManager.resetRoomOnPlayerLeave(roomID, isPlayer1);

    // Notify remaining player
    socket.to(roomID).emit("opponentLeft", {
      message: GAME_MESSAGES.OPPONENT_LEFT,
      roomID: roomID,
    });

    // Delete room if empty
    const roomMembers = io.sockets.adapter.rooms.get(roomID);
    if (!roomMembers || roomMembers.size === 0) {
      logDebug(`Room ${roomID} empty after exit, deleting`);
      roomManager.deleteRoom(roomID);
    }
  }
}

/**
 * Declare winner and update scores
 */
function declareWinner(roomID, io, roomManager) {
  const room = roomManager.getRoom(roomID);
  if (!room || !room.p1Choice || !room.p2Choice) {
    logDebug(`Không thể xác định thắng/thua - thiếu lựa chọn. p1: ${room?.p1Choice}, p2: ${room?.p2Choice}`);
    return;
  }

  const winner = determineWinner(room.p1Choice, room.p2Choice);
  roomManager.updateScore(roomID, winner);

  console.log(`Phòng ${roomID}: kết quả ${winner} (${room.p1Choice} vs ${room.p2Choice})`);
  logDebug(`Điểm số - P1: ${room.p1Score}, P2: ${room.p2Score}`);

  io.to(roomID).emit("winner", {
    winner: winner,
    p1Score: room.p1Score || 0,
    p2Score: room.p2Score || 0,
    p1Choice: room.p1Choice,
    p2Choice: room.p2Choice,
  });

  logDebug(`Đã gửi sự kiện winner cho phòng ${roomID}`);
}
import { isValidChoice } from "../utils/validation.js";
import { GAME_MESSAGES } from "../../config/constants.js";
import { determineWinner } from "../game/gameLogic.js";

// Reduce noise: turn on verbose logs only when DEBUG_LOGS=true
const DEBUG = process.env.DEBUG_LOGS === "true";
const logDebug = (...args) => {
  if (DEBUG) console.log(...args);
};

/**
 * Setup socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {RoomManager} roomManager - Room manager instance
 */
export function setupSocketHandlers(io, roomManager) {
  io.on("connection", (socket) => {
    const clientIP = socket.handshake.address || socket.request?.connection?.remoteAddress || "unknown";
    console.log(`Kết nối: ${socket.id} (${clientIP})`);
    logDebug(`Headers:`, socket.handshake.headers);

    // Handle disconnect
    socket.on("disconnect", () => {
      handleDisconnect(socket, io, roomManager);
    });

    // Handle room creation
    socket.on("createRoom", (roomID) => {
      console.log(`Nhận createRoom từ ${socket.id}, roomID: ${roomID}`);
      handleCreateRoom(socket, roomID, roomManager);
    });

    // Handle room joining
    socket.on("joinRoom", (roomID) => {
      handleJoinRoom(socket, roomID, io, roomManager);
    });

    // Handle player choices
    socket.on("p1Choice", (data) => {
      handlePlayerChoice(socket, data, io, roomManager, true);
    });

    socket.on("p2Choice", (data) => {
      handlePlayerChoice(socket, data, io, roomManager, false);
    });

    // Handle play again
    socket.on("playerClicked", (data) => {
      handlePlayAgain(socket, data, io, roomManager);
    });

    // Handle exit game
    socket.on("exitGame", (data) => {
      handleExitGame(socket, data, io, roomManager);
    });
  });
}

// Backwards compatible alias for server.js
export { setupSocketHandlers as registerSocketHandlers };

/**
 * Handle player disconnect
 */
function handleDisconnect(socket, io, roomManager) {
  console.log(`Ngắt kết nối: ${socket.id}`);

  // Find room this socket is in
  const rooms = roomManager.getAllRooms();
  for (const [roomID, roomData] of Object.entries(rooms)) {
    if (roomData.player1Id === socket.id || roomData.player2Id === socket.id) {
      logDebug(`Người chơi rời phòng ${roomID}`);

      const isPlayer1 = roomData.player1Id === socket.id;
      roomManager.resetRoomOnPlayerLeave(roomID, isPlayer1);

      // Check if there's a remaining player before notifying
      const roomMembers = io.sockets.adapter.rooms.get(roomID);
      const remainingSize = roomMembers ? roomMembers.size : 0;
      
      // Only notify if there's actually a remaining player
      if (remainingSize > 0) {
        // Notify remaining player
        socket.to(roomID).emit("opponentLeft", {
          message: GAME_MESSAGES.OPPONENT_LEFT,
          roomID: roomID,
        });
        logDebug(`Đã báo cho người chơi còn lại trong phòng ${roomID}`);
      } else {
        // No remaining players, delete room
        logDebug(`Phòng ${roomID} trống, xóa phòng`);
        roomManager.deleteRoom(roomID);
      }
      break;
    }
  }
}

/**
 * Handle room creation
 */
function handleCreateRoom(socket, roomID, roomManager) {
  logDebug(`createRoom requested - roomID: ${roomID}, socketID: ${socket.id}`);
  
  // Validate roomID
  if (!roomID || typeof roomID !== 'string' || roomID.trim().length === 0) {
    console.error(`roomID không hợp lệ: ${roomID}`);
    return socket.emit("error", "Mã phòng không hợp lệ");
  }
  
  // Create room in manager but DON'T join Socket.IO room yet
  // Player 1 will join when player 2 joins (via joinRoom)
  const room = roomManager.createRoom(roomID, socket.id);
  console.log(`Tạo phòng: ${roomID} bởi ${socket.id}`);
  logDebug(`Dữ liệu phòng:`, room);
  
  // Emit confirmation back to client
  socket.emit("roomCreated", { roomID: roomID });
  
  // Player 1 stays on join page until player 2 joins
}

/**
 * Handle room joining
 */
function handleJoinRoom(socket, roomID, io, roomManager) {
  logDebug(`joinRoom requested: ${roomID} by ${socket.id}`);

  // Check if room exists in roomManager (not adapter, because player 1 might not have joined yet)
  const roomDataInManager = roomManager.getRoom(roomID);
  
  // If room doesn't exist in manager, it's invalid
  if (!roomDataInManager) {
    console.warn(`Phòng không tồn tại: ${roomID}`);
    return socket.emit("notValidToken");
  }
  
  // Check if room exists in Socket.IO adapter (player 1 might have joined, or this is player 2)
  const roomExistsInAdapter = io.sockets.adapter.rooms.has(roomID);

  // Check if this is player 1 (creator) or player 2 (joiner)
  const isPlayer1Creator = roomDataInManager.player1Id === socket.id;
  
  // If player 1 is trying to join their own room, ignore (they should stay on join page)
  if (isPlayer1Creator) {
    logDebug(`Người tạo cố gắng tự vào phòng ${roomID}`);
    return;
  }
  
  // This is player 2 joining
  // First, make sure player 1 joins Socket.IO room (if they haven't already)
  const player1Socket = io.sockets.sockets.get(roomDataInManager.player1Id);
  if (player1Socket) {
    // Check if player 1 is already in the room
    const player1Rooms = Array.from(player1Socket.rooms || []);
    if (!player1Rooms.includes(roomID)) {
      logDebug(`Tự đưa người tạo vào Socket.IO room ${roomID}`);
      player1Socket.join(roomID);
    }
  } else {
    console.warn(`Không tìm thấy player1 (${roomDataInManager.player1Id}) cho phòng ${roomID}`);
    return socket.emit("notValidToken");
  }
  
  // Join player 2 to Socket.IO room
  socket.join(roomID);
  console.log(`Phòng ${roomID}: người chơi 2 đã vào (${socket.id})`);
  
  // Get current room size from Socket.IO adapter AFTER joining
  const roomMembers = io.sockets.adapter.rooms.get(roomID);
  const currentRoomSize = roomMembers ? roomMembers.size : 0;
  logDebug(`Phòng ${roomID} hiện có ${currentRoomSize} người`);

  // Check if room is already full
  if (currentRoomSize > 2) {
    console.warn(`Phòng ${roomID} đã đầy (${currentRoomSize} người)`);
    socket.leave(roomID);
    return socket.emit("roomFull");
  }

  // Update room data (assign player 2 if needed)
  const roomData = roomManager.joinRoom(roomID, socket.id, currentRoomSize);
  
  // Check room size AFTER joining
  const newRoomSize = io.sockets.adapter.rooms.get(roomID).size;
  logDebug(`Phòng ${roomID} sau khi join: ${newRoomSize} người`);
  logDebug(`Dữ liệu phòng:`, roomData);

  // Emit to BOTH players when room has 2 players
  if (newRoomSize >= 2) {
    console.log(`Phòng ${roomID}: đủ 2 người, gửi playersConnected`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => {
      emitPlayersConnected(roomID, io, roomData);
    });
  } else {
    logDebug(`Phòng ${roomID} chờ thêm người (${newRoomSize})`);
  }
}

/**
 * Emit playersConnected event to all players in room
 */
function emitPlayersConnected(roomID, io, roomData) {
  logDebug(`Gửi playersConnected cho phòng ${roomID}`);
  
  const roomMembers = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
  const roomSize = io.sockets.adapter.rooms.get(roomID).size;
  
  roomMembers.forEach((socketId) => {
    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      const isPlayer1 = roomData.player1Id === socketId;

      playerSocket.emit("playersConnected", {
        roomID: roomID, // Always include roomID
        roomSize: roomSize,
        isPlayer1: isPlayer1,
        player1Id: roomData.player1Id,
        player2Id: roomData.player2Id,
      });
      logDebug(`playersConnected -> ${socketId} (isPlayer1=${isPlayer1}) phòng ${roomID}`);
    }
  });
  logDebug(`Đã gửi playersConnected xong cho phòng ${roomID}`);
}

/**
 * Handle player choice
 */
function handlePlayerChoice(socket, data, io, roomManager, isPlayer1) {
  if (!data || !data.roomID || !data.rpschoice) {
    return socket.emit("error", GAME_MESSAGES.INVALID_CHOICE);
  }

  const choice = data.rpschoice;
  const roomID = data.roomID;
  const room = roomManager.getRoom(roomID);

  // Validate choice
  if (!isValidChoice(choice)) {
    return socket.emit("error", GAME_MESSAGES.INVALID_CHOICE);
  }

  if (!room) {
    return socket.emit("error", GAME_MESSAGES.ROOM_NOT_FOUND);
  }

  // Check if there are 2 players
  const roomMembers = io.sockets.adapter.rooms.get(roomID);
  const roomSize = roomMembers ? roomMembers.size : 0;
  if (roomSize < 2) {
    logDebug(`Chưa thể chọn - chỉ có ${roomSize} người trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.NEED_TWO_PLAYERS);
  }

  // Verify player role
  const expectedPlayerId = isPlayer1 ? room.player1Id : room.player2Id;
  if (expectedPlayerId !== socket.id) {
    const errorMsg = isPlayer1 ? GAME_MESSAGES.NOT_PLAYER1 : GAME_MESSAGES.NOT_PLAYER2;
    logDebug(`Socket ${socket.id} gửi ${isPlayer1 ? "p1" : "p2"}Choice sai vai trò`);
    return socket.emit("error", errorMsg);
  }

  // Check if opponent is in room
  const opponentId = isPlayer1 ? room.player2Id : room.player1Id;
  if (!opponentId) {
    logDebug(`Không thể chọn - thiếu đối thủ trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.OPPONENT_NOT_IN_ROOM);
  }

  // Prevent double choice
  const currentChoice = isPlayer1 ? room.p1Choice : room.p2Choice;
  if (currentChoice !== null) {
    logDebug(`Người chơi ${isPlayer1 ? "1" : "2"} đã chọn: ${currentChoice}`);
    return socket.emit("error", GAME_MESSAGES.ALREADY_CHOSEN);
  }

  // Set choice
  roomManager.setChoice(roomID, isPlayer1, choice);
  logDebug(`Người chơi ${isPlayer1 ? "1" : "2"} chọn ${choice} tại phòng ${roomID}`);
  logDebug(`Lựa chọn hiện tại - P1: ${room.p1Choice}, P2: ${room.p2Choice}`);

  // Emit to opponent
  const eventName = isPlayer1 ? "p1Choice" : "p2Choice";
  socket.to(roomID).emit(eventName, {
    rpsValue: choice,
    score: isPlayer1 ? room.p1Score : room.p2Score,
    p1Score: room.p1Score || 0,
    p2Score: room.p2Score || 0,
  });
  console.log(`Đã gửi ${eventName} đến phòng ${roomID} (không bao gồm người gửi)`);

  // If opponent already chose, send their choice back
  const opponentChoice = isPlayer1 ? room.p2Choice : room.p1Choice;
  if (opponentChoice !== null && opponentChoice !== undefined) {
    const opponentEventName = isPlayer1 ? "p2Choice" : "p1Choice";
    logDebug(`Đối thủ đã chọn, gửi lại cho người chơi`);
    socket.emit(opponentEventName, {
      rpsValue: opponentChoice,
      score: isPlayer1 ? room.p2Score : room.p1Score,
      p1Score: room.p1Score || 0,
      p2Score: room.p2Score || 0,
    });
  }

  // Check if both players have chosen
  if (room.p1Choice !== null && room.p2Choice !== null) {
    logDebug(`Cả hai đã chọn, xác định người thắng...`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => declareWinner(roomID, io, roomManager));
  } else {
    logDebug(`Đang chờ đối thủ chọn...`);
  }
}

/**
 * Handle play again
 */
function handlePlayAgain(socket, data, io, roomManager) {
  const roomID = data.roomID;
  logDebug(`Chơi lại trong phòng ${roomID}`);

  if (roomManager.getRoom(roomID)) {
    roomManager.resetChoices(roomID);
    logDebug(`Đã reset lựa chọn cho phòng ${roomID}`);
  }

  io.to(roomID).emit("playAgain");
  logDebug(`Đã gửi playAgain cho phòng ${roomID}`);
}

/**
 * Handle exit game
 */
function handleExitGame(socket, data, io, roomManager) {
  const roomID = data.roomID;
  logDebug(`Người chơi thoát phòng ${roomID}`);

  socket.leave(roomID);

  const room = roomManager.getRoom(roomID);
  if (room) {
    const isPlayer1 = data.player === true;
    roomManager.resetRoomOnPlayerLeave(roomID, isPlayer1);

    // Notify remaining player
    socket.to(roomID).emit("opponentLeft", {
      message: GAME_MESSAGES.OPPONENT_LEFT,
      roomID: roomID,
    });

    // Delete room if empty
    const roomMembers = io.sockets.adapter.rooms.get(roomID);
    if (!roomMembers || roomMembers.size === 0) {
      logDebug(`Room ${roomID} empty after exit, deleting`);
      roomManager.deleteRoom(roomID);
    }
  }
}

/**
 * Declare winner and update scores
 */
function declareWinner(roomID, io, roomManager) {
  const room = roomManager.getRoom(roomID);
  if (!room || !room.p1Choice || !room.p2Choice) {
    logDebug(`Không thể xác định thắng/thua - thiếu lựa chọn. p1: ${room?.p1Choice}, p2: ${room?.p2Choice}`);
    return;
  }

  const winner = determineWinner(room.p1Choice, room.p2Choice);
  roomManager.updateScore(roomID, winner);

  console.log(`Phòng ${roomID}: kết quả ${winner} (${room.p1Choice} vs ${room.p2Choice})`);
  logDebug(`Điểm số - P1: ${room.p1Score}, P2: ${room.p2Score}`);

  io.to(roomID).emit("winner", {
    winner: winner,
    p1Score: room.p1Score || 0,
    p2Score: room.p2Score || 0,
    p1Choice: room.p1Choice,
    p2Choice: room.p2Choice,
  });

  logDebug(`Đã gửi sự kiện winner cho phòng ${roomID}`);
}
