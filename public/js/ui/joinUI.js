/**
 * Join Page UI Management
 */
import { reinitDOMElements } from "../utils/domUtils.js";

export class JoinUI {
  constructor() {
    this.elements = null;
  }

  init() {
    this.elements = reinitDOMElements();
  }

  show() {
    if (!this.elements) this.init();
    const { joinPage, roomIdBadge } = this.elements;
    
    if (joinPage) {
      joinPage.style.display = "flex";
      joinPage.classList.remove("none");
      joinPage.classList.add("flex");
    }
    
    // Hide Room ID badge when showing join page
    if (roomIdBadge) {
      roomIdBadge.style.display = "none";
    }
  }

  hide() {
    if (!this.elements) this.init();
    const { joinPage } = this.elements;
    
    if (joinPage) {
      joinPage.classList.add("none");
      joinPage.classList.remove("flex");
      joinPage.style.display = "none";
    }
  }

  displayRoomID(roomID) {
    if (!this.elements) this.init();
    const { roomIdDisplay, createdRoomIdInput } = this.elements;
    
    if (roomIdDisplay && createdRoomIdInput) {
      createdRoomIdInput.value = roomID;
      roomIdDisplay.style.display = "block";
      createdRoomIdInput.select();
      createdRoomIdInput.setSelectionRange(0, 99999);
    }
  }

  async copyRoomId() {
    if (!this.elements) this.init();
    const { createdRoomIdInput, copyBtn } = this.elements;
    if (!createdRoomIdInput) return;

    try {
      // Use modern Clipboard API instead of deprecated execCommand
      await navigator.clipboard.writeText(createdRoomIdInput.value);
      
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        const originalTitle = copyBtn.title || "";

        copyBtn.textContent = "Đã sao chép";
        copyBtn.title = "Đã sao chép!";
        copyBtn.style.background = "linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)";
        copyBtn.style.boxShadow = "0 4px 15px rgba(0, 255, 136, 0.5)";

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.title = originalTitle;
          copyBtn.style.background = "";
          copyBtn.style.boxShadow = "";
        }, 2000);
      }
      console.log("Room ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      try {
        createdRoomIdInput.select();
        createdRoomIdInput.setSelectionRange(0, 99999);
        document.execCommand("copy");
        alert("Đã sao chép mã phòng!");
      } catch (fallbackErr) {
        console.error("Fallback copy also failed:", fallbackErr);
        alert("Sao chép thất bại. Vui lòng chọn và sao chép thủ công.");
      }
    }
  }

  clearInputs() {
    if (!this.elements) this.init();
    const { roomId, createdRoomIdInput, roomIdDisplay } = this.elements;

    if (roomId) roomId.value = "";
    if (createdRoomIdInput) createdRoomIdInput.value = "";
    if (roomIdDisplay) roomIdDisplay.style.display = "none";
  }

  setupEventListeners(onJoinRoom) {
    if (!this.elements) this.init();
    const { roomId } = this.elements;

    if (roomId) {
      roomId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          onJoinRoom();
        }
      });
    }
  }
}
/**
 * Join Page UI Management
 */
import { reinitDOMElements } from "../utils/domUtils.js";

export class JoinUI {
  constructor() {
    this.elements = null;
  }

  init() {
    this.elements = reinitDOMElements();
  }

  show() {
    if (!this.elements) this.init();
    const { joinPage, roomIdBadge } = this.elements;
    
    if (joinPage) {
      joinPage.style.display = "flex";
      joinPage.classList.remove("none");
      joinPage.classList.add("flex");
    }
    
    // Hide Room ID badge when showing join page
    if (roomIdBadge) {
      roomIdBadge.style.display = "none";
    }
  }

  hide() {
    if (!this.elements) this.init();
    const { joinPage } = this.elements;
    
    if (joinPage) {
      joinPage.classList.add("none");
      joinPage.classList.remove("flex");
      joinPage.style.display = "none";
    }
  }

  displayRoomID(roomID) {
    if (!this.elements) this.init();
    const { roomIdDisplay, createdRoomIdInput } = this.elements;
    
    if (roomIdDisplay && createdRoomIdInput) {
      createdRoomIdInput.value = roomID;
      roomIdDisplay.style.display = "block";
      createdRoomIdInput.select();
      createdRoomIdInput.setSelectionRange(0, 99999);
    }
  }

  async copyRoomId() {
    if (!this.elements) this.init();
    const { createdRoomIdInput, copyBtn } = this.elements;
    if (!createdRoomIdInput) return;

    try {
      // Use modern Clipboard API instead of deprecated execCommand
      await navigator.clipboard.writeText(createdRoomIdInput.value);
      
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        const originalTitle = copyBtn.title || "";

        copyBtn.textContent = "Đã sao chép";
        copyBtn.title = "Đã sao chép!";
        copyBtn.style.background = "linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)";
        copyBtn.style.boxShadow = "0 4px 15px rgba(0, 255, 136, 0.5)";

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.title = originalTitle;
          copyBtn.style.background = "";
          copyBtn.style.boxShadow = "";
        }, 2000);
      }
      console.log("Room ID copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      try {
        createdRoomIdInput.select();
        createdRoomIdInput.setSelectionRange(0, 99999);
        document.execCommand("copy");
        alert("Đã sao chép mã phòng!");
      } catch (fallbackErr) {
        console.error("Fallback copy also failed:", fallbackErr);
        alert("Sao chép thất bại. Vui lòng chọn và sao chép thủ công.");
      }
    }
  }

  clearInputs() {
    if (!this.elements) this.init();
    const { roomId, createdRoomIdInput, roomIdDisplay } = this.elements;

    if (roomId) roomId.value = "";
    if (createdRoomIdInput) createdRoomIdInput.value = "";
    if (roomIdDisplay) roomIdDisplay.style.display = "none";
  }

  setupEventListeners(onJoinRoom) {
    if (!this.elements) this.init();
    const { roomId } = this.elements;

    if (roomId) {
      roomId.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          onJoinRoom();
        }
      });
    }
  }
}
