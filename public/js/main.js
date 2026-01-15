// main.js - Version 2
// MỤC TIÊU: Kết nối Server, Tạo phòng, Vào phòng thật

const socket = io(); // Đã bật socket

let currentRoomID = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Version 2: Connectivity Test");
    document.querySelector(".game-container").style.display = "none"; 
    
    // Setup socket listeners cơ bản
    socket.on("connect", () => console.log("Connected to server:", socket.id));
    
    socket.on("player_joined", () => {
        alert("Có người vào phòng! Test thành công.");
        document.querySelector(".join-screen").style.display = "none";
        document.querySelector(".game-container").style.display = "block";
    });
});

window.createRoom = () => {
    const randomID = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomID = randomID;
    
    // Gửi sự kiện thật lên server
    socket.emit("create_room", currentRoomID);
    document.getElementById("room-id-display").innerText = currentRoomID;
    console.log("Sent create_room event", currentRoomID);
};

window.joinRoom = () => {
    const inputID = document.getElementById("room-id").value;
    currentRoomID = inputID;
    socket.emit("join_room", currentRoomID);
    console.log("Sent join_room event", currentRoomID);
};

window.clickChoice = (choice) => {
    if (!currentRoomID) return alert("Lỗi: Chưa có Room ID");
    
    console.log("Sending choice to server:", choice);
    // Gửi lựa chọn nhưng CHƯA XỬ LÝ kết quả trả về ở version này
    socket.emit("player_choice", {
        roomId: currentRoomID,
        choice: choice
    });
    
    alert("Đã gửi lựa chọn lên Server. Check server log!");
};