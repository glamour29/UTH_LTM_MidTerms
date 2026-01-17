import { isValidChoice } from "../utils/validation.js";
import { GAME_MESSAGES } from "../../config/constants.js";
import { determineWinner } from "../game/gameLogic.js";

/**
 * Setup socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {RoomManager} roomManager - Room manager instance
 */
export function setupSocketHandlers(io, roomManager) {
  io.on("connection", (socket) => {
    console.log(`Client đã kết nối: ${socket.id}`);

    // Handle disconnect
    socket.on("disconnect", () => {
      handleDisconnect(socket, io, roomManager);
    });

    // Handle room creation
    socket.on("createRoom", (roomID) => {
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
  console.log(`Client đã ngắt kết nối: ${socket.id}`);

  // Find room this socket is in
  const rooms = roomManager.getAllRooms();
  for (const [roomID, roomData] of Object.entries(rooms)) {
    if (roomData.player1Id === socket.id || roomData.player2Id === socket.id) {
      console.log(`Người chơi đã ngắt kết nối khỏi phòng ${roomID}`);

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
        console.log(`Đã thông báo cho người chơi còn lại trong phòng ${roomID}`);
      } else {
        // No remaining players, delete room
        console.log(`Phòng ${roomID} trống, đang xóa...`);
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
  // Create room in manager but DON'T join Socket.IO room yet
  // Player 1 will join when player 2 joins (via joinRoom)
  roomManager.createRoom(roomID, socket.id);
  console.log(`Phòng đã được tạo: ${roomID} bởi ${socket.id} (chưa tham gia Socket.IO room)`);
  // Player 1 stays on join page until player 2 joins
}

/**
 * Handle room joining
 */
function handleJoinRoom(socket, roomID, io, roomManager) {
  console.log(`Yêu cầu tham gia phòng: ${roomID} từ ${socket.id}`);

  // Check if room exists in roomManager (not adapter, because player 1 might not have joined yet)
  const roomDataInManager = roomManager.getRoom(roomID);
  
  // If room doesn't exist in manager, it's invalid
  if (!roomDataInManager) {
    console.log(`Phòng ${roomID} không tồn tại trong roomManager`);
    return socket.emit("notValidToken");
  }
  
  // Check if room exists in Socket.IO adapter (player 1 might have joined, or this is player 2)
  const roomExistsInAdapter = io.sockets.adapter.rooms.has(roomID);

  // Check if this is player 1 (creator) or player 2 (joiner)
  const isPlayer1Creator = roomDataInManager.player1Id === socket.id;
  
  // If player 1 is trying to join their own room, ignore (they should stay on join page)
  if (isPlayer1Creator) {
    console.log(`Người chơi 1 (người tạo) đang cố tham gia phòng của chính họ - bỏ qua (họ nên ở trang tham gia)`);
    return;
  }
  
  // This is player 2 joining
  // First, make sure player 1 joins Socket.IO room (if they haven't already)
  const player1Socket = io.sockets.sockets.get(roomDataInManager.player1Id);
  if (player1Socket) {
    // Check if player 1 is already in the room
    const player1Rooms = Array.from(player1Socket.rooms || []);
    if (!player1Rooms.includes(roomID)) {
      console.log(`Tự động tham gia người chơi 1 (người tạo) vào Socket.IO room: ${roomID}`);
      player1Socket.join(roomID);
    }
  } else {
    console.log(`Người chơi 1 (${roomDataInManager.player1Id}) không tìm thấy - họ có thể đã ngắt kết nối`);
    return socket.emit("notValidToken");
  }
  
  // Join player 2 to Socket.IO room
  socket.join(roomID);
  console.log(`Người chơi 2 (${socket.id}) đã tham gia phòng ${roomID}`);
  
  // Get current room size from Socket.IO adapter AFTER joining
  const roomMembers = io.sockets.adapter.rooms.get(roomID);
  const currentRoomSize = roomMembers ? roomMembers.size : 0;
  console.log(`Kích thước phòng hiện tại: ${currentRoomSize}`);

  // Check if room is already full
  if (currentRoomSize > 2) {
    console.log(`Phòng ${roomID} đã đầy (${currentRoomSize} người chơi)`);
    socket.leave(roomID);
    return socket.emit("roomFull");
  }

  // Update room data (assign player 2 if needed)
  const roomData = roomManager.joinRoom(roomID, socket.id, currentRoomSize);
  
  // Check room size AFTER joining
  const newRoomSize = io.sockets.adapter.rooms.get(roomID).size;
  console.log(`Kích thước phòng sau khi tham gia: ${newRoomSize}`);
  console.log(`Dữ liệu phòng:`, roomData);

  // Emit to BOTH players when room has 2 players
  if (newRoomSize >= 2) {
    console.log(`Cả hai người chơi đã vào phòng, đang gửi playersConnected`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => {
      emitPlayersConnected(roomID, io, roomData);
    });
  } else {
    console.log(`Chỉ có ${newRoomSize} người chơi trong phòng, đang chờ thêm...`);
  }
}

/**
 * Emit playersConnected event to all players in room
 */
function emitPlayersConnected(roomID, io, roomData) {
  console.log(`Cả hai người chơi đã kết nối vào phòng ${roomID} - đang gửi cho tất cả`);
  
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
      console.log(`Đã gửi playersConnected đến ${socketId} - isPlayer1: ${isPlayer1}, roomID: ${roomID}`);
    }
  });
  console.log(`Đã gửi playersConnected cho tất cả người chơi trong phòng ${roomID}`);
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
    console.log(`Không thể chọn - chỉ có ${roomSize} người chơi trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.NEED_TWO_PLAYERS);
  }

  // Verify player role
  const expectedPlayerId = isPlayer1 ? room.player1Id : room.player2Id;
  if (expectedPlayerId !== socket.id) {
    const errorMsg = isPlayer1 ? GAME_MESSAGES.NOT_PLAYER1 : GAME_MESSAGES.NOT_PLAYER2;
    console.log(`Socket ${socket.id} đã cố gửi ${isPlayer1 ? "p1" : "p2"}Choice nhưng không phải ${isPlayer1 ? "player1" : "player2"}`);
    return socket.emit("error", errorMsg);
  }

  // Check if opponent is in room
  const opponentId = isPlayer1 ? room.player2Id : room.player1Id;
  if (!opponentId) {
    console.log(`Không thể chọn - đối thủ không có trong phòng ${roomID}`);
    return socket.emit("error", GAME_MESSAGES.OPPONENT_NOT_IN_ROOM);
  }

  // Prevent double choice
  const currentChoice = isPlayer1 ? room.p1Choice : room.p2Choice;
  if (currentChoice !== null) {
    console.log(`Người chơi ${isPlayer1 ? "1" : "2"} đã chọn rồi: ${currentChoice}`);
    return socket.emit("error", GAME_MESSAGES.ALREADY_CHOSEN);
  }

  // Set choice
  roomManager.setChoice(roomID, isPlayer1, choice);
  console.log(`Người chơi ${isPlayer1 ? "1" : "2"} đã chọn: ${choice} trong phòng ${roomID}`);
  console.log(`Trạng thái hiện tại - P1: ${room.p1Choice}, P2: ${room.p2Choice}`);

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
    console.log(`Đối thủ đã chọn, đang gửi lựa chọn của họ cho người chơi`);
    socket.emit(opponentEventName, {
      rpsValue: opponentChoice,
      score: isPlayer1 ? room.p2Score : room.p1Score,
      p1Score: room.p1Score || 0,
      p2Score: room.p2Score || 0,
    });
  }

  // Check if both players have chosen
  if (room.p1Choice !== null && room.p2Choice !== null) {
    console.log(`Cả hai người chơi đã chọn, đang xác định người thắng...`);
    // Use setImmediate for next tick instead of arbitrary delay
    setImmediate(() => declareWinner(roomID, io, roomManager));
  } else {
    console.log(`Đang chờ đối thủ chọn...`);
  }
}

/**
 * Handle play again
 */
function handlePlayAgain(socket, data, io, roomManager) {
  const roomID = data.roomID;
  console.log(`Người chơi đã bấm chơi lại trong phòng ${roomID}`);

  if (roomManager.getRoom(roomID)) {
    roomManager.resetChoices(roomID);
    console.log(`Đã reset lựa chọn cho phòng ${roomID}`);
  }

  io.to(roomID).emit("playAgain");
  console.log(`Đã gửi playAgain cho tất cả người chơi trong phòng ${roomID}`);
}

/**
 * Handle exit game
 */
function handleExitGame(socket, data, io, roomManager) {
  const roomID = data.roomID;
  console.log(`Người chơi đang thoát khỏi phòng ${roomID}`);

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
      console.log(`Phòng ${roomID} trống, đang xóa...`);
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
    console.log(`Không thể xác định người thắng - thiếu lựa chọn. p1Choice: ${room?.p1Choice}, p2Choice: ${room?.p2Choice}`);
    return;
  }

  const winner = determineWinner(room.p1Choice, room.p2Choice);
  roomManager.updateScore(roomID, winner);

  console.log(`Phòng ${roomID}: ${winner} thắng (${room.p1Choice} vs ${room.p2Choice})`);
  console.log(`Điểm số - P1: ${room.p1Score}, P2: ${room.p2Score}`);

  io.to(roomID).emit("winner", {
    winner: winner,
    p1Score: room.p1Score || 0,
    p2Score: room.p2Score || 0,
    p1Choice: room.p1Choice,
    p2Choice: room.p2Choice,
  });

  console.log(`Đã gửi sự kiện winner đến phòng ${roomID}`);
}
