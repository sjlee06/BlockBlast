// 게임 설정
const ROWS = 8;
const COLS = 8;
// 3매치 게임에서 자주 사용되는 눈에 편한 5가지 색상
const COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6']; // 빨강, 파랑, 초록, 주황, 보라
const INITIAL_FILLED_ROWS = 4;

// 게임 상태
let board = [];
let score = 0;
let highScore = 0;
let turnCount = 0;
let gameOver = false;

// DOM 요소
const gameBoard = document.getElementById('game-board');
const currentScoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const turnCountEl = document.getElementById('turn-count');
const colorButtons = document.querySelectorAll('.color-btn');
const restartBtn = document.getElementById('restart-btn');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');

// 게임 초기화
function initGame() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    score = 0;
    turnCount = 0;
    gameOver = false;

    // 하이스코어 로드
    const savedHighScore = localStorage.getItem('blockBlastHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
    }

    // 상단 4줄에 랜덤 블록 채우기
    for (let row = 0; row < INITIAL_FILLED_ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = Math.floor(Math.random() * COLORS.length);
        }
    }

    updateDisplay();
    renderBoard();
    enableButtons();
    gameOverModal.classList.add('hidden');
}

// 게임 보드 렌더링
function renderBoard() {
    gameBoard.innerHTML = '';

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (board[row][col] !== null) {
                cell.classList.add('filled');
                cell.style.backgroundColor = COLORS[board[row][col]];
            }

            gameBoard.appendChild(cell);
        }
    }
}

// 화면 업데이트
function updateDisplay() {
    currentScoreEl.textContent = score;
    highScoreEl.textContent = highScore;
    turnCountEl.textContent = turnCount;
}

// 특정 색상의 최하단 블록 찾기
function findBottomBlocks(color) {
    const bottomBlocks = [];

    for (let col = 0; col < COLS; col++) {
        // 각 열에서 아래부터 위로 탐색
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === color) {
                bottomBlocks.push({ row, col });
                break; // 해당 열의 최하단 블록만 찾음
            }
        }
    }

    return bottomBlocks;
}

// 블록 파괴
function destroyBlocks(color) {
    if (gameOver) return;

    const blocksToDestroy = findBottomBlocks(color);

    if (blocksToDestroy.length === 0) {
        return; // 파괴할 블록이 없으면 턴을 소비하지 않음
    }

    // 블록 파괴 애니메이션
    blocksToDestroy.forEach(({ row, col }) => {
        const cellIndex = row * COLS + col;
        const cell = gameBoard.children[cellIndex];
        cell.classList.add('destroyed');
    });

    // 애니메이션 후 블록 제거 (중력 없이)
    setTimeout(() => {
        blocksToDestroy.forEach(({ row, col }) => {
            board[row][col] = null;
        });

        // 스코어 업데이트
        const destroyedCount = blocksToDestroy.length;
        score += destroyedCount * 100;

        // 하이스코어 업데이트
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('blockBlastHighScore', highScore);
        }

        // 턴 증가
        turnCount++;

        // 3턴마다 새로운 블록 추가 (모든 블록을 아래로 한 칸씩 밀어냄)
        if (turnCount % 3 === 0) {
            addNewRow();
        }

        updateDisplay();
        renderBoard();

        // 게임 오버 체크
        checkGameOver();
    }, 500);
}

// 중력 적용 함수 제거 (더 이상 사용하지 않음)

// 새로운 줄 추가
function addNewRow() {
    // 모든 블록을 한 칸 아래로 이동
    for (let row = ROWS - 1; row > 0; row--) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = board[row - 1][col];
        }
    }

    // 맨 위 줄에 새로운 랜덤 블록 추가
    for (let col = 0; col < COLS; col++) {
        board[0][col] = Math.floor(Math.random() * COLORS.length);
    }
}

// 게임 오버 체크
function checkGameOver() {
    // 맨 아래 줄(7번째 행)이 모두 채워져 있는지 확인
    for (let col = 0; col < COLS; col++) {
        if (board[ROWS - 1][col] === null) {
            return; // 하나라도 비어있으면 게임 계속
        }
    }

    // 맨 아래 줄이 모두 채워진 상태에서 턴이 3의 배수가 되면 게임 오버
    if (turnCount % 3 === 0) {
        endGame();
    }
}

// 게임 종료
function endGame() {
    gameOver = true;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove('hidden');
    disableButtons();
}

// 버튼 활성화
function enableButtons() {
    colorButtons.forEach(btn => {
        btn.disabled = false;
    });
}

// 버튼 비활성화
function disableButtons() {
    colorButtons.forEach(btn => {
        btn.disabled = true;
    });
}

// 이벤트 리스너
colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const color = parseInt(btn.dataset.color);
        destroyBlocks(color);
    });
});

restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);

// 게임 시작
initGame();
