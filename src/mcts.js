export const getBestMoveMCTS = (currentState, timeLimitMs = 1000) => {
  timeLimitMs = Math.min(Math.max(timeLimitMs, 100), 6000);

  const SIZE = 6;
  const PLAYERS = ["red", "black"];
  const other = p => (p === "red" ? "black" : "red");
  const rootPlayer = currentState.turn;
  const startTime = Date.now();
  const TIME_BUFFER = 25;

  const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

  const checkWin = (placedNum, targetNum) => {
    const isEven = placedNum % 2 === 0;
    if (placedNum === targetNum) return isEven;
    const isMultiple = placedNum % targetNum === 0 || targetNum % placedNum === 0;
    if (isMultiple) return isEven ? placedNum > targetNum : placedNum < targetNum;
    return isEven ? placedNum < targetNum : placedNum > targetNum;
  };

  const cloneState = state => ({
    board: state.board.map(row => row.map(cell => cell ? { ...cell } : null)),
    inventory: {
      red: { ...state.inventory.red },
      black: { ...state.inventory.black }
    },
    turn: state.turn
  });

  const countEmpty = state => {
    let n = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!state.board[r][c]) n++;
      }
    }
    return n;
  };

  const getValidMoves = state => {
    const moves = [];
    const emptyCells = [];

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!state.board[r][c]) emptyCells.push({ r, c });
      }
    }

    for (let chip = 1; chip <= 9; chip++) {
      if (state.inventory[state.turn][chip] > 0) {
        for (const cell of emptyCells) {
          moves.push({ r: cell.r, c: cell.c, chip });
        }
      }
    }

    return moves;
  };

  const applyMove = (state, move) => {
    const newState = cloneState(state);
    const player = newState.turn;

    newState.board[move.r][move.c] = {
      player,
      number: move.chip
    };

    for (const [dr, dc] of DIRS) {
      const nr = move.r + dr;
      const nc = move.c + dc;

      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && newState.board[nr][nc]) {
        const target = newState.board[nr][nc];

        if (checkWin(move.chip, target.number)) {
          target.player = other(target.player);
        }
      }
    }

    newState.inventory[player][move.chip]--;
    newState.turn = other(player);

    return newState;
  };

  const evaluateFinalScores = state => {
    const board = state.board.map(row => row.map(cell => cell ? { ...cell } : null));

    const flipsFor1 = new Set();

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = board[r][c];

        if (cell && cell.number === 1) {
          const targets = [{ r, c, num: 1 }];

          if (r > 0 && board[r - 1][c]) targets.push({ r: r - 1, c, num: board[r - 1][c].number });
          if (r < SIZE - 1 && board[r + 1][c]) targets.push({ r: r + 1, c, num: board[r + 1][c].number });
          if (c > 0 && board[r][c - 1]) targets.push({ r, c: c - 1, num: board[r][c - 1].number });
          if (c < SIZE - 1 && board[r][c + 1]) targets.push({ r, c: c + 1, num: board[r][c + 1].number });

          const nums = targets.map(t => t.num);
          if (nums.length === new Set(nums).size) {
            for (const t of targets) flipsFor1.add(`${t.r},${t.c}`);
          }
        }
      }
    }

    for (const coord of flipsFor1) {
      const [r, c] = coord.split(",").map(Number);
      board[r][c].player = other(board[r][c].player);
    }

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = board[r][c];
        if (cell && cell.number === 2) {
          cell.player = other(cell.player);
        }
      }
    }

    let red = 0;
    let black = 0;

    for (const row of board) {
      for (const cell of row) {
        if (!cell) continue;
        if (cell.player === "red") red++;
        else black++;
      }
    }

    return { red, black };
  };

  const terminalValue = state => {
    const scores = evaluateFinalScores(state);
    const rootScore = scores[rootPlayer];
    const oppScore = scores[other(rootPlayer)];

    if (scores.red === scores.black) {
      return rootPlayer === "red" ? 1 : -1;
    }

    if (rootScore > oppScore) {
      return 1 + (rootScore - oppScore) / 36;
    }

    return -1 - (oppScore - rootScore) / 36;
  };

  const heuristicValue = state => {
    const perspective = rootPlayer;
    const opponent = other(perspective);

    let value = 0;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = state.board[r][c];
        if (!cell) continue;

        const sign = cell.player === perspective ? 1 : -1;

        value += sign * 10;

        const neighborCount =
          (r > 0 ? 1 : 0) +
          (r < SIZE - 1 ? 1 : 0) +
          (c > 0 ? 1 : 0) +
          (c < SIZE - 1 ? 1 : 0);

        value += sign * neighborCount * 0.5;

        if (cell.number === 2) {
          value -= sign * 5.5;
        }

        if (cell.number === 1) {
          value += sign * 1.5;
        }
      }
    }

    for (const p of PLAYERS) {
      const sign = p === perspective ? 1 : -1;

      for (let n = 1; n <= 9; n++) {
        const count = state.inventory[p][n];

        if (count <= 0) continue;

        let chipValue = 0;

        if (n === 1) chipValue = 1.5;
        else if (n === 2) chipValue = 0.5;
        else if (n === 3 || n === 5 || n === 7) chipValue = 2.5;
        else chipValue = 2.0;

        value += sign * count * chipValue;
      }
    }

    return Math.tanh(value / 80);
  };

  const immediateMoveScore = (state, move) => {
    const player = state.turn;
    let score = 0;

    let adjacent = 0;
    let flips = 0;
    let selfFlips = 0;

    for (const [dr, dc] of DIRS) {
      const nr = move.r + dr;
      const nc = move.c + dc;

      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;

      const target = state.board[nr][nc];
      if (!target) continue;

      adjacent++;

      if (checkWin(move.chip, target.number)) {
        flips++;
        if (target.player === player) selfFlips++;
      }
    }

    score += flips * 12;
    score -= selfFlips * 18;
    score += adjacent * 1.5;

    if (move.chip === 2) score -= 4;
    if (move.chip === 1) score += 2;

    const after = applyMove(state, move);
    score += heuristicValue(after) * 25 * (player === rootPlayer ? 1 : -1);

    return score;
  };

  const orderedMoves = state => {
    const moves = getValidMoves(state);

    for (const move of moves) {
      move._score = immediateMoveScore(state, move);
    }

    moves.sort((a, b) => b._score - a._score);
    return moves;
  };

  const candidateMoves = state => {
    const moves = orderedMoves(state);
    const empty = countEmpty(state);

    let limit;
    if (empty >= 28) limit = 42;
    else if (empty >= 18) limit = 56;
    else if (empty >= 10) limit = 72;
    else limit = moves.length;

    return moves.slice(0, limit);
  };

  const rolloutMove = state => {
    const moves = candidateMoves(state);
    if (moves.length === 0) return null;

    const greedyChance = 0.78;

    if (Math.random() < greedyChance) {
      const topN = Math.min(7, moves.length);
      return moves[Math.floor(Math.random() * topN)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
  };

  class Node {
    constructor(state, parent = null, move = null) {
      this.state = state;
      this.parent = parent;
      this.move = move;
      this.children = [];
      this.visits = 0;
      this.totalValue = 0;
      this.untriedMoves = candidateMoves(state);
    }

    averageValue() {
      return this.visits === 0 ? 0 : this.totalValue / this.visits;
    }
  }

  const selectChild = node => {
    const C = 1.15;
    const maximizing = node.state.turn === rootPlayer;

    let bestChild = null;
    let bestScore = -Infinity;

    for (const child of node.children) {
      const exploit = child.averageValue();
      const explore = C * Math.sqrt(Math.log(node.visits + 1) / (child.visits + 1));
      const score = maximizing ? exploit + explore : -exploit + explore;

      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  };

  const root = new Node(cloneState(currentState));

  if (countEmpty(currentState) === 0) return null;

  let iterations = 0;

  while (Date.now() - startTime < timeLimitMs - TIME_BUFFER) {
    let node = root;
    let state = cloneState(currentState);

    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = selectChild(node);
      state = applyMove(state, node.move);
    }

    if (node.untriedMoves.length > 0) {
      const idx = Math.floor(Math.random() * node.untriedMoves.length);
      const move = node.untriedMoves.splice(idx, 1)[0];

      state = applyMove(state, move);

      const child = new Node(state, node, move);
      node.children.push(child);
      node = child;
    }

    let empty = countEmpty(state);

    while (empty > 0 && Date.now() - startTime < timeLimitMs - TIME_BUFFER) {
      const move = rolloutMove(state);
      if (!move) break;

      state = applyMove(state, move);
      empty--;
    }

    const value = empty === 0 ? terminalValue(state) : heuristicValue(state);

    while (node) {
      node.visits++;
      node.totalValue += value;
      node = node.parent;
    }

    iterations++;
  }

  let bestMove = null;
  let bestScore = -Infinity;

  for (const child of root.children) {
    if (child.visits === 0) continue;

    const avg = child.averageValue();
    const confidence = Math.sqrt(child.visits) * 0.002;
    const score = avg + confidence;

    if (score > bestScore) {
      bestScore = score;
      bestMove = child.move;
    }
  }

  if (!bestMove) {
    const fallback = candidateMoves(currentState);
    return fallback.length > 0 ? fallback[0] : null;
  }

  return {
    r: bestMove.r,
    c: bestMove.c,
    chip: bestMove.chip
  };
};