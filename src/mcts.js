export const getBestMoveMCTS=(currentState,timeLimitMs=1000)=>{
const checkWin=(placedNum,targetNum)=>{
const isEven=placedNum%2===0;
if(placedNum===targetNum)return isEven;
const isMultiple=(placedNum%targetNum===0)||(targetNum%placedNum===0);
if(isMultiple)return isEven?placedNum>targetNum:placedNum<targetNum;
return isEven?placedNum<targetNum:placedNum>targetNum;
};
const cloneState=(state)=>({
board:state.board.map(r=>r.map(c=>c?{...c}:null)),
inventory:{red:{...state.inventory.red},black:{...state.inventory.black}},
turn:state.turn
});
const getValidMoves=(state)=>{
let moves=[];
let emptyCells=[];
for(let r=0;r<6;r++){
for(let c=0;c<6;c++){
if(!state.board[r][c])emptyCells.push({r,c});
}
}
for(let i=1;i<=9;i++){
if(state.inventory[state.turn][i]>0){
emptyCells.forEach(cell=>moves.push({r:cell.r,c:cell.c,chip:i}));
}
}
return moves;
};
const applyMove=(state,move)=>{
let newState=cloneState(state);
newState.board[move.r][move.c]={player:newState.turn,number:move.chip};
const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
dirs.forEach(([dr,dc])=>{
const nr=move.r+dr,nc=move.c+dc;
if(nr>=0&&nr<6&&nc>=0&&nc<6&&newState.board[nr][nc]){
const target=newState.board[nr][nc];
if(checkWin(move.chip,target.number)){
target.player=target.player==='red'?'black':'red';
}
}
});
newState.inventory[newState.turn][move.chip]-=1;
newState.turn=newState.turn==='red'?'black':'red';
return newState;
};
const evaluateGame=(state)=>{
let board=cloneState(state).board;
let flipsFor1=new Set();
for(let r=0;r<6;r++){
for(let c=0;c<6;c++){
if(board[r][c]&&board[r][c].number===1){
let targets=[{r,c,num:1}];
if(r>0&&board[r-1][c])targets.push({r:r-1,c,num:board[r-1][c].number});
if(r<5&&board[r+1][c])targets.push({r:r+1,c,num:board[r+1][c].number});
if(c>0&&board[r][c-1])targets.push({r,c:c-1,num:board[r][c-1].number});
if(c<5&&board[r][c+1])targets.push({r,c:c+1,num:board[r][c+1].number});
let nums=targets.map(t=>t.num);
let uniqueNums=new Set(nums);
if(nums.length===uniqueNums.size){
targets.forEach(t=>flipsFor1.add(`${t.r},${t.c}`));
}
}
}
}
flipsFor1.forEach(coord=>{
let[r,c]=coord.split(',').map(Number);
board[r][c].player=board[r][c].player==='red'?'black':'red';
});
for(let r=0;r<6;r++){
for(let c=0;c<6;c++){
if(board[r][c]&&board[r][c].number===2){
board[r][c].player=board[r][c].player==='red'?'black':'red';
}
}
}
let redScore=0,blackScore=0;
board.forEach(row=>row.forEach(cell=>{
if(cell){
if(cell.player==='red')redScore++;
else if(cell.player==='black')blackScore++;
}
}));
return{red:redScore,black:blackScore};
};
class Node{
constructor(state,parent=null,move=null){
this.state=state;
this.parent=parent;
this.move=move;
this.children=[];
this.wins=0;
this.visits=0;
this.untriedMoves=getValidMoves(state);
}
}
const UCTSelect=(node)=>{
let bestScore=-Infinity,bestChild=null;
for(let child of node.children){
let score=(child.wins/child.visits)+1.414*Math.sqrt(Math.log(node.visits)/child.visits);
if(score>bestScore){bestScore=score;bestChild=child;}
}
return bestChild;
};
const startTime=Date.now();
const root=new Node(currentState);
let emptyCount=0;
currentState.board.forEach(r=>r.forEach(c=>{if(!c)emptyCount++;}));
if(emptyCount===0)return null;
while(Date.now()-startTime<timeLimitMs){
let node=root;
let state=cloneState(currentState);
while(node.untriedMoves.length===0&&node.children.length>0){
node=UCTSelect(node);
state=applyMove(state,node.move);
}
if(node.untriedMoves.length>0){
let moveIndex=Math.floor(Math.random()*node.untriedMoves.length);
let move=node.untriedMoves.splice(moveIndex,1)[0];
state=applyMove(state,move);
let child=new Node(state,node,move);
node.children.push(child);
node=child;
}
let simEmpty=0;
state.board.forEach(r=>r.forEach(c=>{if(!c)simEmpty++;}));
while(simEmpty>0){
let moves=getValidMoves(state);
if(moves.length===0)break;
let move=moves[Math.floor(Math.random()*moves.length)];
state=applyMove(state,move);
simEmpty--;
}
let scores=evaluateGame(state);
let result=(currentState.turn==='red'&&scores.red>=scores.black)||(currentState.turn==='black'&&scores.black>scores.red)?1:0;
let tempNode=node;
while(tempNode!==null){
tempNode.visits++;
let nodeTurn=tempNode.parent?tempNode.parent.state.turn:currentState.turn;
if(nodeTurn===currentState.turn){
tempNode.wins+=result;
}else{
tempNode.wins+=(1-result);
}
tempNode=tempNode.parent;
}
}
let bestMove=null,maxVisits=-1;
for(let child of root.children){
if(child.visits>maxVisits){
maxVisits=child.visits;
bestMove=child.move;
}
}
return bestMove;
};
