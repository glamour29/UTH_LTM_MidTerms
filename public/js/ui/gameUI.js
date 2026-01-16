/**
 * Game UI Management
 */
import { reinitDOMElements } from "../utils/domUtils.js";

export class GameUI {
  constructor() {
    this.elements = null;
  }

  init() {
    this.elements = reinitDOMElements();
  }

  show() {
    if (!this.elements) this.init();
    const { header, gameArea, gameFooter, joinPage, roomIdDisplay, toCenter } = this.elements;

    // Hide join page
    if (joinPage) {
      joinPage.classList.add("none");
      joinPage.classList.remove("flex");
      joinPage.style.display = "none";
    }

    // Show game elements
    if (header) {
      header.classList.add("flex");
      header.classList.remove("none");
      header.style.display = "flex";
    }

    if (gameArea) {
      gameArea.classList.add("grid");
      gameArea.classList.remove("none");
      gameArea.style.display = "grid";
    }

    if (gameFooter) {
      gameFooter.classList.add("flex");
      gameFooter.classList.remove("none");
      gameFooter.style.display = "flex";
    }

    // Hide room ID display
    if (roomIdDisplay) {
      roomIdDisplay.style.display = "none";
    }

    // Show to__center container
    if (toCenter) {
      toCenter.style.display = "block";
    }
  }

  showRoomID(roomID) {
    if (!this.elements) this.init();
    const { roomIdBadge, roomIdValue } = this.elements;
    if (roomIdBadge && roomIdValue) {
      roomIdValue.textContent = roomID || "-";
      roomIdBadge.style.display = "flex";
    }
  }

  hideRoomID() {
    if (!this.elements) this.init();
    const { roomIdBadge } = this.elements;
    if (roomIdBadge) {
      roomIdBadge.style.display = "none";
    }
  }

  hide() {
    if (!this.elements) this.init();
    const { header, gameArea, gameFooter, toCenter } = this.elements;

    if (header) {
      header.style.display = "none";
      header.classList.remove("flex");
      header.classList.add("none");
    }

    if (gameArea) {
      gameArea.style.display = "none";
      gameArea.classList.remove("grid");
      gameArea.classList.add("none");
    }

    if (gameFooter) {
      gameFooter.style.display = "none";
      gameFooter.classList.remove("flex");
      gameFooter.classList.add("none");
    }

    if (toCenter) {
      toCenter.style.display = "none";
    }
  }

  hideGameArea() {
    if (!this.elements) this.init();
    const { gameArea, toCenter } = this.elements;

    if (gameArea) {
      gameArea.classList.add("none");
      gameArea.classList.remove("grid");
      gameArea.style.display = "none";
    }

    if (toCenter) {
      toCenter.style.display = "none";
    }
  }

  showGameArea() {
    if (!this.elements) this.init();
    const { gameArea, toCenter } = this.elements;

    if (gameArea) {
      gameArea.classList.remove("none");
      gameArea.classList.add("grid");
      gameArea.style.display = "grid";
    }

    if (toCenter) {
      toCenter.style.display = "block";
    }
  }

  resetScores() {
    if (!this.elements) this.init();
    const { scoreYou, scoreOppo } = this.elements;

    if (scoreYou) scoreYou.textContent = "0";
    if (scoreOppo) scoreOppo.textContent = "0";
  }

  updateScores(p1Score, p2Score, isPlayer1) {
    if (!this.elements) this.init();
    const { scoreYou, scoreOppo } = this.elements;

    if (scoreYou && scoreOppo) {
      if (isPlayer1) {
        scoreYou.innerText = p1Score;
        scoreOppo.innerText = p2Score;
      } else {
        scoreYou.innerText = p2Score;
        scoreOppo.innerText = p1Score;
      }
    }
  }

  setupRulesHandlers() {
    if (!this.elements) this.init();
    const { rulesBtn, rulesBoard, closeRules } = this.elements;

    if (rulesBtn && rulesBoard) {
      rulesBtn.addEventListener("click", () => {
        rulesBoard.classList.toggle("show__rules_board");
        if (closeRules) closeRules.style.cursor = "pointer";
      });
    }

    if (closeRules && rulesBoard) {
      closeRules.addEventListener("click", () => {
        rulesBoard.classList.toggle("show__rules_board");
      });
    }
  }
}
