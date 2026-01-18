/**
 * Result UI Management
 */
import { reinitDOMElements, getChoiceTemplate } from "../utils/domUtils.js";

export class ResultUI {
  constructor() {
    this.elements = null;
  }

  init() {
    this.elements = reinitDOMElements();
  }

  show() {
    if (!this.elements) this.init();
    const { resultBoard, toCenter } = this.elements;

    // Ensure to__center container is visible
    if (toCenter) {
      toCenter.style.display = "block";
      toCenter.style.visibility = "visible";
    }

    if (resultBoard) {
      // Force remove none class first
      resultBoard.classList.remove("none");
      
      // Set display with !important to override any CSS
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      
      // Add grid class
      resultBoard.classList.add("grid");
      
      console.log("Result board shown", {
        display: resultBoard.style.display,
        visibility: resultBoard.style.visibility,
        classes: resultBoard.className,
        computedDisplay: window.getComputedStyle(resultBoard).display
      });
    } else {
      console.error("Result board element not found");
    }
  }

  hide() {
    if (!this.elements) this.init();
    const { resultBoard, results } = this.elements;

    // Hide result board
    if (resultBoard) {
      resultBoard.classList.remove("grid");
      resultBoard.classList.remove("after-choosing");
      resultBoard.classList.add("none");
      resultBoard.style.display = "none";
    }

    // Hide results section (nút chơi lại)
    if (results) {
      results.style.display = "none";
      results.classList.add("none");
      results.classList.remove("grid");
    }
  }

  displayYourChoice(choice) {
    if (!this.elements) this.init();
    const { yourChoice, resultBoard } = this.elements;

    // Ensure result board is visible
    if (resultBoard) {
      resultBoard.classList.remove("none");
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      resultBoard.classList.add("grid");
    }

    if (yourChoice) {
      yourChoice.innerHTML = "";
      yourChoice.classList.remove("increase-size");

      const template = getChoiceTemplate(choice);
      if (template) {
        yourChoice.innerHTML = template;
        yourChoice.classList.add("increase-size");
      }
    }
  }

  displayOpponentChoice(choice) {
    if (!this.elements) this.init();
    const { oppoChoice, oppoTitle } = this.elements;

    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("waiting_to_chose");
      oppoChoice.classList.remove("increase-size");

      const template = getChoiceTemplate(choice);
      if (template) {
        oppoChoice.innerHTML = template;
        oppoChoice.classList.add("increase-size");
      }
    }

    if (oppoTitle) {
      oppoTitle.innerText = "ĐỐI THỦ ĐÃ CHỌN";
    }
  }

  showWaitingForOpponent() {
    if (!this.elements) this.init();
    const { oppoChoice, oppoTitle, resultBoard } = this.elements;

    // Ensure result board is visible
    if (resultBoard) {
      resultBoard.classList.remove("none");
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      resultBoard.classList.add("grid");
    }

    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("increase-size");
      oppoChoice.classList.remove("winner");
      oppoChoice.classList.add("waiting_to_chose");
    }

    if (oppoTitle) {
      oppoTitle.innerText = "Đang chọn...";
    }
  }

  showWaitingForNewPlayer() {
    if (!this.elements) this.init();
    const { oppoTitle } = this.elements;

    if (oppoTitle) {
      oppoTitle.innerText = "Đang chờ người chơi khác...";
    }
  }

  displayWinner(winner, isPlayer1) {
    if (!this.elements) this.init();
    const { resultBoard, results, resultsHeading, resultButton, yourChoice, oppoChoice } = this.elements;

    // Show result board with results
    if (resultBoard) {
      resultBoard.classList.add("after-choosing");
      resultBoard.style.display = "grid";
    }

    if (results) {
      results.classList.remove("none");
      results.classList.add("grid");
      results.style.display = "grid";
    }

    // Remove previous winner classes
    if (yourChoice) yourChoice.classList.remove("winner");
    if (oppoChoice) oppoChoice.classList.remove("winner");

    if (winner === "draw") {
      if (resultsHeading) {
        resultsHeading.innerText = "HÒA";
        resultsHeading.style.color = "#fff";
      }
      if (resultButton) {
        resultButton.style.color = "#58a6ff";
        resultButton.style.borderColor = "#58a6ff";
        resultButton.style.boxShadow = "0 4px 15px rgba(88, 166, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
      }
    } else if (winner === "p1") {
      if (isPlayer1) {
        // Player 1 wins
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THẮNG";
          resultsHeading.style.color = "#0D9276";
        }
        if (resultButton) {
          resultButton.style.color = "#0D9276";
        }
        if (yourChoice) {
          yourChoice.classList.add("winner");
        }
      } else {
        // Player 2 loses
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THUA";
          resultsHeading.style.color = "#FF004D";
        }
        if (resultButton) {
          resultButton.style.color = "#FF004D";
        }
        if (oppoChoice) {
          oppoChoice.classList.add("winner");
        }
      }
    } else if (winner === "p2") {
      if (!isPlayer1) {
        // Player 2 wins
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THẮNG";
          resultsHeading.style.color = "#0D9276";
        }
        if (resultButton) {
          resultButton.style.color = "#0D9276";
        }
        if (yourChoice) {
          yourChoice.classList.add("winner");
        }
      } else {
        // Player 1 loses
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THUA";
          resultsHeading.style.color = "#FF004D";
        }
        if (resultButton) {
          resultButton.style.color = "#FF004D";
        }
        if (oppoChoice) {
          oppoChoice.classList.add("winner");
        }
      }
    }
  }

  reset() {
    if (!this.elements) this.init();
    const { yourChoice, oppoChoice, results, resultsHeading, resultBoard } = this.elements;

    // Clear your choice
    if (yourChoice) {
      yourChoice.innerHTML = "";
      yourChoice.classList.remove("increase-size");
      yourChoice.classList.remove("winner");
    }

    // Clear opponent choice
    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("increase-size");
      oppoChoice.classList.remove("winner");
      oppoChoice.classList.remove("waiting_to_chose");
    }

    // Hide results section completely
    if (results) {
      results.style.display = "none";
      results.classList.add("none");
      results.classList.remove("grid");
    }

    // Reset results heading
    if (resultsHeading) {
      resultsHeading.style.color = "";
      resultsHeading.innerText = "";
    }

    // Reset result board
    if (resultBoard) {
      resultBoard.classList.remove("after-choosing");
    }
  }

  removeWinnerClasses() {
    if (!this.elements) this.init();
    const { yourChoice, oppoChoice } = this.elements;

    if (oppoChoice && oppoChoice.classList.contains("winner")) {
      oppoChoice.classList.remove("winner");
    }
    if (yourChoice && yourChoice.classList.contains("winner")) {
      yourChoice.classList.remove("winner");
    }
  }
}
/**
 * Result UI Management
 */
import { reinitDOMElements, getChoiceTemplate } from "../utils/domUtils.js";

export class ResultUI {
  constructor() {
    this.elements = null;
  }

  init() {
    this.elements = reinitDOMElements();
  }

  show() {
    if (!this.elements) this.init();
    const { resultBoard, toCenter } = this.elements;

    // Ensure to__center container is visible
    if (toCenter) {
      toCenter.style.display = "block";
      toCenter.style.visibility = "visible";
    }

    if (resultBoard) {
      // Force remove none class first
      resultBoard.classList.remove("none");
      
      // Set display with !important to override any CSS
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      
      // Add grid class
      resultBoard.classList.add("grid");
      
      console.log("Result board shown", {
        display: resultBoard.style.display,
        visibility: resultBoard.style.visibility,
        classes: resultBoard.className,
        computedDisplay: window.getComputedStyle(resultBoard).display
      });
    } else {
      console.error("Result board element not found");
    }
  }

  hide() {
    if (!this.elements) this.init();
    const { resultBoard, results } = this.elements;

    // Hide result board
    if (resultBoard) {
      resultBoard.classList.remove("grid");
      resultBoard.classList.remove("after-choosing");
      resultBoard.classList.add("none");
      resultBoard.style.display = "none";
    }

    // Hide results section (nút chơi lại)
    if (results) {
      results.style.display = "none";
      results.classList.add("none");
      results.classList.remove("grid");
    }
  }

  displayYourChoice(choice) {
    if (!this.elements) this.init();
    const { yourChoice, resultBoard } = this.elements;

    // Ensure result board is visible
    if (resultBoard) {
      resultBoard.classList.remove("none");
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      resultBoard.classList.add("grid");
    }

    if (yourChoice) {
      yourChoice.innerHTML = "";
      yourChoice.classList.remove("increase-size");

      const template = getChoiceTemplate(choice);
      if (template) {
        yourChoice.innerHTML = template;
        yourChoice.classList.add("increase-size");
      }
    }
  }

  displayOpponentChoice(choice) {
    if (!this.elements) this.init();
    const { oppoChoice, oppoTitle } = this.elements;

    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("waiting_to_chose");
      oppoChoice.classList.remove("increase-size");

      const template = getChoiceTemplate(choice);
      if (template) {
        oppoChoice.innerHTML = template;
        oppoChoice.classList.add("increase-size");
      }
    }

    if (oppoTitle) {
      oppoTitle.innerText = "ĐỐI THỦ ĐÃ CHỌN";
    }
  }

  showWaitingForOpponent() {
    if (!this.elements) this.init();
    const { oppoChoice, oppoTitle, resultBoard } = this.elements;

    // Ensure result board is visible
    if (resultBoard) {
      resultBoard.classList.remove("none");
      resultBoard.style.setProperty("display", "grid", "important");
      resultBoard.style.setProperty("visibility", "visible", "important");
      resultBoard.style.setProperty("opacity", "1", "important");
      resultBoard.classList.add("grid");
    }

    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("increase-size");
      oppoChoice.classList.remove("winner");
      oppoChoice.classList.add("waiting_to_chose");
    }

    if (oppoTitle) {
      oppoTitle.innerText = "Đang chọn...";
    }
  }

  showWaitingForNewPlayer() {
    if (!this.elements) this.init();
    const { oppoTitle } = this.elements;

    if (oppoTitle) {
      oppoTitle.innerText = "Đang chờ người chơi khác...";
    }
  }

  displayWinner(winner, isPlayer1) {
    if (!this.elements) this.init();
    const { resultBoard, results, resultsHeading, resultButton, yourChoice, oppoChoice } = this.elements;

    // Show result board with results
    if (resultBoard) {
      resultBoard.classList.add("after-choosing");
      resultBoard.style.display = "grid";
    }

    if (results) {
      results.classList.remove("none");
      results.classList.add("grid");
      results.style.display = "grid";
    }

    // Remove previous winner classes
    if (yourChoice) yourChoice.classList.remove("winner");
    if (oppoChoice) oppoChoice.classList.remove("winner");

    if (winner === "draw") {
      if (resultsHeading) {
        resultsHeading.innerText = "HÒA";
        resultsHeading.style.color = "#fff";
      }
      if (resultButton) {
        resultButton.style.color = "#58a6ff";
        resultButton.style.borderColor = "#58a6ff";
        resultButton.style.boxShadow = "0 4px 15px rgba(88, 166, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)";
      }
    } else if (winner === "p1") {
      if (isPlayer1) {
        // Player 1 wins
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THẮNG";
          resultsHeading.style.color = "#0D9276";
        }
        if (resultButton) {
          resultButton.style.color = "#0D9276";
        }
        if (yourChoice) {
          yourChoice.classList.add("winner");
        }
      } else {
        // Player 2 loses
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THUA";
          resultsHeading.style.color = "#FF004D";
        }
        if (resultButton) {
          resultButton.style.color = "#FF004D";
        }
        if (oppoChoice) {
          oppoChoice.classList.add("winner");
        }
      }
    } else if (winner === "p2") {
      if (!isPlayer1) {
        // Player 2 wins
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THẮNG";
          resultsHeading.style.color = "#0D9276";
        }
        if (resultButton) {
          resultButton.style.color = "#0D9276";
        }
        if (yourChoice) {
          yourChoice.classList.add("winner");
        }
      } else {
        // Player 1 loses
        if (resultsHeading) {
          resultsHeading.innerText = "BẠN THUA";
          resultsHeading.style.color = "#FF004D";
        }
        if (resultButton) {
          resultButton.style.color = "#FF004D";
        }
        if (oppoChoice) {
          oppoChoice.classList.add("winner");
        }
      }
    }
  }

  reset() {
    if (!this.elements) this.init();
    const { yourChoice, oppoChoice, results, resultsHeading, resultBoard } = this.elements;

    // Clear your choice
    if (yourChoice) {
      yourChoice.innerHTML = "";
      yourChoice.classList.remove("increase-size");
      yourChoice.classList.remove("winner");
    }

    // Clear opponent choice
    if (oppoChoice) {
      oppoChoice.innerHTML = "";
      oppoChoice.classList.remove("increase-size");
      oppoChoice.classList.remove("winner");
      oppoChoice.classList.remove("waiting_to_chose");
    }

    // Hide results section completely
    if (results) {
      results.style.display = "none";
      results.classList.add("none");
      results.classList.remove("grid");
    }

    // Reset results heading
    if (resultsHeading) {
      resultsHeading.style.color = "";
      resultsHeading.innerText = "";
    }

    // Reset result board
    if (resultBoard) {
      resultBoard.classList.remove("after-choosing");
    }
  }

  removeWinnerClasses() {
    if (!this.elements) this.init();
    const { yourChoice, oppoChoice } = this.elements;

    if (oppoChoice && oppoChoice.classList.contains("winner")) {
      oppoChoice.classList.remove("winner");
    }
    if (yourChoice && yourChoice.classList.contains("winner")) {
      yourChoice.classList.remove("winner");
    }
  }
}