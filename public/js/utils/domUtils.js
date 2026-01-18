/**
 * DOM Utilities
 * Helper functions for DOM manipulation
 */

export const CHOICE_TEMPLATES = {
  paper: `
    <button class="choice__paper" onclick="clickChoice('paper')">
        <div class="choice">
            <img
              src="/images/paper.png"
              alt="Paper"
              class="choice__img"
            />
        </div>
    </button>
  `,
  rock: `
    <button class="choice__rock" onclick="clickChoice('rock')">
        <div class="choice">
            <img 
                src="/images/rock.png" 
                alt="Rock" 
                class="choice__img"
            />
        </div>
    </button>
  `,
  scissors: `
    <button class="choice__scissor" onclick="clickChoice('scissors')">
        <div class="choice">
            <img
                src="/images/scissors.png"
                alt="Scissor"
                class="choice__img"
            />
        </div>
    </button>
  `,
};

/**
 * Get choice template by choice name
 */
export function getChoiceTemplate(choice) {
  return CHOICE_TEMPLATES[choice] || "";
}

/**
 * Reinitialize DOM elements
 */
export function reinitDOMElements() {
  return {
    gameArea: document.querySelector(".main"),
    rock: document.querySelector(".choice__rock"),
    paper: document.querySelector(".choice__paper"),
    scissor: document.querySelector(".choice__scissor"),
    header: document.querySelector(".header"),
    scoreNum: document.querySelector(".score__number"),
    scoreYou: document.getElementById("score-you"),
    scoreOppo: document.getElementById("score-oppo"),
    oppoTitle: document.querySelector(".opponents__result"),
    exitBtn: document.querySelector(".exit__btn"),
    rulesBtn: document.querySelector(".rules__button"),
    rulesBoard: document.querySelector(".rules"),
    showRulesBoard: document.querySelector(".show__result_board"),
    closeRules: document.querySelector(".close-btn"),
    gameFooter: document.querySelector(".footer"),
    resultBoard: document.querySelector(".result__board"),
    oppoChoice: document.querySelector(".oppo__choice"),
    yourChoice: document.querySelector(".your__choice"),
    results: document.querySelector(".results"),
    resultsHeading: document.querySelector(".results__heading"),
    resultButton: document.querySelector(".results__button"),
    joinPage: document.querySelector(".join"),
    roomId: document.getElementById("room-id"),
    // Cache frequently accessed elements
    toCenter: document.querySelector(".to__center"),
    roomIdBadge: document.getElementById("room-id-badge"),
    roomIdValue: document.getElementById("room-id-value"),
    roomIdDisplay: document.getElementById("room-id-display"),
    createdRoomIdInput: document.getElementById("created-room-id"),
    copyBtn: document.querySelector(".copy-btn"),
  };
}
