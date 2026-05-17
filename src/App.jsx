import React, { useState, useEffect } from 'react';
const INITIAL_INVENTORY = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 };
const checkWin = (placedNum, targetNum) => {
const isEven = placedNum % 2 === 0;
if (placedNum === targetNum) {
return isEven;
}
const isMultiple = (placedNum % targetNum === 0) || (targetNum % placedNum === 0);
if (isMultiple) {
return isEven ? placedNum > targetNum : placedNum < targetNum;
} else {
return isEven ? placedNum < targetNum : placedNum > targetNum;
}
};
const getPlayerName = (playerCode) => {
if (playerCode === 'red') return "先攻(赤)";
if (playerCode === 'black') return "後攻(黒)";
return "";
};
export default function App() {
const [mode, setMode] = useState('menu');
const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(6).fill(null)));
const [turn, setTurn] = useState('red');
const [inventory, setInventory] = useState({ red: { ...INITIAL_INVENTORY }, black: { ...INITIAL_INVENTORY } });
const [selectedChip, setSelectedChip] = useState(null);
const [gameOver, setGameOver] = useState(false);
const [winner, setWinner] = useState(null);
const [scores, setScores] = useState({ red: 0, black: 0 });
const [message, setMessage] = useState('');
const [isProcessingPostGame, setIsProcessingPostGame] = useState(false);
const [showRule, setShowRule] = useState(false);
const isAITurn = !gameOver && !isProcessingPostGame && (
(mode === 'pve_first' && turn === 'black') || 
(mode === 'pve_second' && turn === 'red')
);
const resetGame = () => {
setBoard(Array(6).fill(null).map(() => Array(6).fill(null)));
setTurn('red');
setInventory({ red: { ...INITIAL_INVENTORY }, black: { ...INITIAL_INVENTORY } });
setSelectedChip(null);
setGameOver(false);
setWinner(null);
setScores({ red: 0, black: 0 });
setMessage('ゲーム開始！');
setIsProcessingPostGame(false);
};
const handleGameEnd = async (finalBoardState) => {
setGameOver(true);
setMessage("全てのマスが埋まりました。特殊ルール処理を実行します...");
setIsProcessingPostGame(true);
await new Promise(res => setTimeout(res, 2000));
let current = JSON.parse(JSON.stringify(finalBoardState));
let flipsFor1 = new Set();
for (let r = 0; r < 6; r++) {
for (let c = 0; c < 6; c++) {
if (current[r][c] && current[r][c].number === 1) {
let targets = [{ r, c, num: 1 }];
if (r > 0 && current[r - 1][c]) targets.push({ r: r - 1, c, num: current[r - 1][c].number });
if (r < 5 && current[r + 1][c]) targets.push({ r: r + 1, c, num: current[r + 1][c].number });
if (c > 0 && current[r][c - 1]) targets.push({ r, c: c - 1, num: current[r][c - 1].number });
if (c < 5 && current[r][c + 1]) targets.push({ r, c: c + 1, num: current[r][c + 1].number });
let nums = targets.map(t => t.num);
let uniqueNums = new Set(nums);
if (nums.length === uniqueNums.size) {
targets.forEach(t => flipsFor1.add(`${t.r},${t.c}`));
}
}
}
}
if (flipsFor1.size > 0) {
flipsFor1.forEach(coord => {
let [r, c] = coord.split(',').map(Number);
current[r][c].player = current[r][c].player === 'red' ? 'black' : 'red';
});
setBoard(JSON.parse(JSON.stringify(current)));
setMessage("「1」の特殊ルールが発動しました！");
await new Promise(res => setTimeout(res, 2000));
}
let twoFlipped = false;
for (let r = 0; r < 6; r++) {
for (let c = 0; c < 6; c++) {
if (current[r][c] && current[r][c].number === 2) {
current[r][c].player = current[r][c].player === 'red' ? 'black' : 'red';
twoFlipped = true;
}
}
}
if (twoFlipped) {
setBoard(JSON.parse(JSON.stringify(current)));
setMessage("「2」の特殊ルールが発動しました！");
await new Promise(res => setTimeout(res, 2000));
}
let redScore = 0;
let blackScore = 0;
current.forEach(row => row.forEach(cell => {
if (cell && cell.player === 'red') redScore++;
if (cell && cell.player === 'black') blackScore++;
}));
setScores({ red: redScore, black: blackScore });
if (redScore > blackScore) {
setWinner('red');
setMessage(`赤:${redScore} 黒:${blackScore} で先攻(赤)の勝利！`);
} else if (blackScore > redScore) {
setWinner('black');
setMessage(`赤:${redScore} 黒:${blackScore} で後攻(黒)の勝利！`);
} else {
setWinner('red');
setMessage(`赤:${redScore} 黒:${blackScore} の同数。先攻有利ルールにより先攻(赤)の勝利！`);
}
setIsProcessingPostGame(false);
};
const placeChip = (r, c, num) => {
let newBoard = JSON.parse(JSON.stringify(board));
newBoard[r][c] = { player: turn, number: num };
const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
dirs.forEach(([dr, dc]) => {
const nr = r + dr, nc = c + dc;
if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && newBoard[nr][nc]) {
const target = newBoard[nr][nc];
if (checkWin(num, target.number)) {
target.player = target.player === 'red' ? 'black' : 'red';
}
}
});
setBoard(newBoard);
let newInv = JSON.parse(JSON.stringify(inventory));
newInv[turn][num] -= 1;
setInventory(newInv);
setSelectedChip(null);
let emptyCount = 0;
newBoard.forEach(row => row.forEach(cell => { if (!cell) emptyCount++; }));
if (emptyCount === 0) {
handleGameEnd(newBoard);
} else {
setTurn(turn === 'red' ? 'black' : 'red');
setMessage('');
}
};
useEffect(() => {
if (isAITurn) {
const timer = setTimeout(() => {
let bestMoves = [];
let maxFlips = -999;
const emptyCells = [];
for (let r = 0; r < 6; r++) {
for (let c = 0; c < 6; c++) {
if (!board[r][c]) emptyCells.push({ r, c });
}
}
const availableChips = [];
for (let i = 1; i <= 9; i++) {
if (inventory[turn][i] > 0) availableChips.push(i);
}
emptyCells.forEach(cell => {
availableChips.forEach(chip => {
let netGain = 0;
const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
dirs.forEach(([dr, dc]) => {
const nr = cell.r + dr, nc = cell.c + dc;
if (nr >= 0 && nr < 6 && nc >= 0 && nc < 6 && board[nr][nc]) {
const target = board[nr][nc];
if (checkWin(chip, target.number)) {
if (target.player !== turn) {
netGain++;
} else {
netGain--;
}
}
}
});
if (netGain > maxFlips) {
maxFlips = netGain;
bestMoves = [{ r: cell.r, c: cell.c, chip }];
} else if (netGain === maxFlips) {
bestMoves.push({ r: cell.r, c: cell.c, chip });
}
});
});
if (bestMoves.length > 0) {
const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
placeChip(move.r, move.c, move.chip);
}
}, 1000);
return () => clearTimeout(timer);
}
}, [turn, board, gameOver, mode, inventory, isAITurn, isProcessingPostGame]);
const handleCellClick = (r, c) => {
if (gameOver || isProcessingPostGame || isAITurn) return;
if (!selectedChip) {
setMessage('先にチップを選択してください。');
return;
}
if (board[r][c]) {
setMessage('既にチップが置かれています。');
return;
}
placeChip(r, c, selectedChip);
};
if (mode === 'menu') {
return (
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
<h1 className="text-3xl font-bold mb-8">数字リバーシ</h1>
<div className="flex flex-col gap-4 w-full max-w-md">
<button className="bg-blue-600 text-white p-4 rounded text-xl" onClick={() => { setMode('pvp'); resetGame(); }}>通常対戦 (2人プレイ)</button>
<button className="bg-red-600 text-white p-4 rounded text-xl" onClick={() => { setMode('pve_first'); resetGame(); }}>AI対戦 (あなたが先攻:赤)</button>
<button className="bg-gray-800 text-white p-4 rounded text-xl" onClick={() => { setMode('pve_second'); resetGame(); }}>AI対戦 (あなたが後攻:黒)</button>
<button className="bg-green-600 text-white p-4 rounded text-xl mt-4" onClick={() => setShowRule(true)}>ルールを見る</button>
</div>
{showRule && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
<div className="bg-white rounded p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
<h2 className="text-xl font-bold mb-4">ゲームルール</h2>
<ul className="list-disc pl-5 space-y-2 text-sm">
<li>1〜9のチップを各2枚交互に配置します。先攻が赤、後攻が黒です。</li>
<li>配置時に隣接する(上下左右)チップと数字を比較し、勝てばそのチップの色を反転させます。(敵味方関係なく反転します)</li>
<li><strong>強さの比較:</strong></li>
<ul className="list-none pl-4 border-l-2 border-gray-300">
<li>・一方がもう一方の倍数なら、<strong>大きい数</strong>が強い。</li>
<li>・倍数の関係でないなら、<strong>小さい数</strong>が強い。</li>
<li>・置いた数が<strong>奇数</strong>の場合は、上記の強弱が<strong>逆転</strong>します。</li>
<li>・同数の場合、置いた数が偶数なら勝ち、奇数なら負けです。</li>
</ul>
<li><strong>ゲーム終了後の特殊ルール:</strong> (以下の順で自動処理されます)</li>
<ol className="list-decimal pl-5">
<li><strong>「1」のルール:</strong> 1の周囲と自分自身の合計3〜5マスの数字が全て異なる場合、それら全ての色を反転させます。</li>
<li><strong>「2」のルール:</strong> 全ての2のチップの色を反転させます。</li>
</ol>
<li>最終的に自分の色のチップが多い方の勝利です。同数の場合は先攻の勝利となります。</li>
</ul>
<div className="mt-6 text-center">
<button className="bg-blue-600 text-white px-6 py-2 rounded" onClick={() => setShowRule(false)}>閉じる</button>
</div>
</div>
</div>
)}
</div>
);
}
const getTurnText = () => {
if (gameOver) return "ゲーム終了";
const pName = getPlayerName(turn);
if (mode === 'pvp') return `${pName} のターン`;
if (mode === 'pve_first' && turn === 'red') return `あなた(${pName}) のターン`;
if (mode === 'pve_first' && turn === 'black') return `AI(${pName}) のターン`;
if (mode === 'pve_second' && turn === 'black') return `あなた(${pName}) のターン`;
if (mode === 'pve_second' && turn === 'red') return `AI(${pName}) のターン`;
return "";
};
const InventoryView = ({ player, isAIPlayer }) => {
const isRed = player === 'red';
const bgColor = isRed ? 'bg-red-100' : 'bg-gray-300';
const chipColor = isRed ? 'bg-red-600 text-white' : 'bg-gray-800 text-white';
const disabledColor = 'bg-gray-400 text-gray-200';
const isCurrentTurn = turn === player && !gameOver && !isProcessingPostGame;
return (
<div className={`p-2 rounded ${bgColor} mb-2`}>
<div className="font-bold mb-1 text-sm">{getPlayerName(player)} {isAIPlayer ? '(AI)' : ''} のチップ</div>
<div className="flex flex-wrap gap-1">
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
const count = inventory[player][num];
const isSelected = selectedChip === num && isCurrentTurn;
return (
<button
key={num}
disabled={count === 0 || !isCurrentTurn || isAIPlayer}
onClick={() => setSelectedChip(num)}
className={`w-10 h-10 flex flex-col items-center justify-center rounded border-2 
${count === 0 ? disabledColor : chipColor}
${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-transparent'}
`}
>
<span className="font-bold text-lg leading-none">{num}</span>
<span className="text-xs leading-none">x{count}</span>
</button>
);
})}
</div>
</div>
);
};
return (
<div className="min-h-screen bg-gray-100 p-2 sm:p-4 font-sans select-none flex flex-col items-center">
<div className="w-full max-w-md bg-white shadow rounded p-4 mb-4">
<div className="flex justify-between items-center mb-4">
<h2 className="text-xl font-bold">{getTurnText()}</h2>
<button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-bold" onClick={() => setMode('menu')}>やめる</button>
</div>
{message && (
<div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-4 text-center font-bold text-sm">
{message}
</div>
)}
<InventoryView player="black" isAIPlayer={mode === 'pve_first'} />
<div className="bg-gray-400 p-1 rounded mx-auto my-4 w-fit">
<div className="grid grid-cols-6 gap-1">
{board.map((row, rIdx) => 
row.map((cell, cIdx) => (
<div 
key={`${rIdx}-${cIdx}`}
onClick={() => handleCellClick(rIdx, cIdx)}
className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded cursor-pointer transition-colors
${cell ? (cell.player === 'red' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white') : 'bg-white hover:bg-gray-200'}
`}
>
{cell ? <span className="font-bold text-xl">{cell.number}</span> : null}
</div>
))
)}
</div>
</div>
<InventoryView player="red" isAIPlayer={mode === 'pve_second'} />
</div>
{gameOver && !isProcessingPostGame && (
<div className="w-full max-w-md bg-white shadow rounded p-4 text-center">
<h2 className="text-2xl font-bold mb-2">結果発表</h2>
<p className="text-lg mb-4 text-red-600 font-bold">{message}</p>
<div className="flex justify-center gap-4">
<button className="bg-blue-600 text-white px-6 py-2 rounded font-bold" onClick={resetGame}>もう一度遊ぶ</button>
<button className="bg-gray-600 text-white px-6 py-2 rounded font-bold" onClick={() => setMode('menu')}>メニューへ</button>
</div>
</div>
)}
</div>
);
}
