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