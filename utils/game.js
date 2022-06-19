const { commonWords, validWords } = require("./words");

const randomWord = () => {
  return commonWords[Math.round(Math.random() * commonWords.length)];
};

const getLetterPos = (word, i) => {
  return word.charCodeAt(i) - "a".charCodeAt(0);
};

const newGame = () => {
  let word = randomWord();
  let letterCount = new Array(26).fill(0);
  for (let i in word) letterCount[getLetterPos(word, i)] += 1;
  const state = {
    boardState: ["", "", "", "", "", ""],
    evaluations: [null, null, null, null, null, null],
    rowIndex: 0,
    solution: word,
    gameStatus: "IN_PROGRESS",
    // hardMode: false,
    letterCount,
    addPoints: 0,
    points: 0,
  };
  return state;
};

const isWordValid = (word) => {
  if (!commonWords.includes(word) && !validWords.includes(word)) {
    return false;
  }
  return true;
};

const checkLetters = (guess, state) => {
  const guessArr = [null, null, null, null, null];
  const temp = { ...state.letterCount };

  for (let i = 0; i < 5; i++) {
    if (guess[i] == state.solution[i]) {
      guessArr[i] = "correct";
      temp[getLetterPos(guess, i)] -= 1;
    } else if (temp[getLetterPos(guess, i)] > 0) {
      temp[getLetterPos(guess, i)] -= 1;
      guessArr[i] = "present";
    } else {
      guessArr[i] = "absent";
    }
  }

  for (let i = 0; i < 5; i++) {
    if (
      guessArr[i] == "present" &&
      temp[getLetterPos(guess, i)] < 0 &&
      guess[i] !== state.solution[i]
    ) {
      guessArr[i] = "absent";
    }
  }

  return guessArr;
};

const updateGame = (state, guess) => {
  guess = guess.toLowerCase();
  state.boardState[state.rowIndex] = guess;
  const guessArr = checkLetters(guess, state);
  state.evaluations[state.rowIndex] = guessArr;
  if (guess === state.solution) state.gameStatus = "WIN";
  else if (state.rowIndex === 5) state.gameStatus = "LOST";
  const addPoints = getPoints(guess, state);
  state.addPoints = addPoints;
  state.points += addPoints;
  state.rowIndex += 1;
  return state;
};

const isAlpha = (str) => {
  return /[a-zA-Z]/.test(str);
};

const newGuess = (state, guess) => {
  if (state.gameStatus !== "IN_PROGRESS") {
    return "Game Over";
  }
  if (guess.length !== 5 || !isAlpha(guess)) {
    return "Invalid Guess";
  }
  if (!isWordValid(guess)) {
    return "Word doesn't exist";
  }
  return true;
};

const getPoints = (guess, state) => {
  const rI = state.rowIndex;
  let cnt = 0;
  for (let i = 0; i < 5; i++) {
    if (state.evaluations[rI][i] == "correct") {
      let flag = true;
      for (let j = rI - 1; j >= 0; j--) {
        if (state.evaluations[j][i] == "correct") {
          flag = false;
        }
      }
      if (flag) {
        cnt += 1;
      }
    }
  }
  return Math.pow(2, 6 - rI - 1) * cnt * (state.gameStatus === "WIN" ? 5 : 1);
};

module.exports = {
  newGuess,
  newGame,
  updateGame,
};
