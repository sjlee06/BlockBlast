// ========================================
// 게임 밸런스 설정 (여기서 난이도 조정 가능)
// ========================================
const GAME_CONFIG = {
    // 보드 설정
    ROWS: 8,
    COLS: 8,
    INITIAL_FILLED_ROWS: 4, // 게임 시작 시 채워진 행 수

    // 색상 설정 (4~6개 권장)
    COLORS: [
        { hex: '#E74C3C', name: '빨강' },
        { hex: '#3498DB', name: '파랑' },
        { hex: '#2ECC71', name: '초록' },
        { hex: '#F39C12', name: '주황' }
    ],

    // 난이도 설정
    TURNS_PER_NEW_ROW: 1, // n턴마다 새로운 줄 추가 (1=매우 어려움, 2=어려움, 3=보통)
    POINTS_PER_BLOCK: 100, // 블록 1개당 점수
};

// 게임 설정 (GAME_CONFIG에서 자동 추출)
const ROWS = GAME_CONFIG.ROWS;
const COLS = GAME_CONFIG.COLS;
const COLORS = GAME_CONFIG.COLORS.map(c => c.hex);
const COLOR_NAMES = GAME_CONFIG.COLORS.map(c => c.name);
const INITIAL_FILLED_ROWS = GAME_CONFIG.INITIAL_FILLED_ROWS;

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
const colorButtonsContainer = document.getElementById('color-buttons');
const restartBtn = document.getElementById('restart-btn');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');

// 색상 버튼 동적 생성
function createColorButtons() {
    colorButtonsContainer.innerHTML = '';

    GAME_CONFIG.COLORS.forEach((color, index) => {
        const button = document.createElement('button');
        button.className = 'color-btn';
        button.dataset.color = index;
        button.style.backgroundColor = color.hex;
        button.textContent = color.name;

        button.addEventListener('click', () => {
            destroyBlocks(index);
        });

        colorButtonsContainer.appendChild(button);
    });
}

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

    // 상단 n줄에 랜덤 블록 채우기
    for (let row = 0; row < INITIAL_FILLED_ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = Math.floor(Math.random() * COLORS.length);
        }
    }

    // 색상 버튼 생성 (게임 설정에 따라)
    createColorButtons();

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
        // 각 열에서 아래부터 위로 탐색하여 첫 번째로 발견되는 블록 찾기
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] !== null) {
                // 이 열의 최하단 블록을 찾음
                if (board[row][col] === color) {
                    // 색상이 일치하면 추가
                    bottomBlocks.push({ row, col });
                }
                // 색상이 일치하지 않으면 이 열은 패스
                break; // 각 열에서 최하단 블록만 확인
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
        score += destroyedCount * GAME_CONFIG.POINTS_PER_BLOCK;

        // 하이스코어 업데이트
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('blockBlastHighScore', highScore);
        }

        // 턴 증가
        turnCount++;

        // n턴마다 새로운 블록 추가 (모든 블록을 아래로 한 칸씩 밀어냄)
        if (turnCount % GAME_CONFIG.TURNS_PER_NEW_ROW === 0) {
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

    // 맨 아래 줄이 모두 채워진 상태면 게임 오버
    endGame();
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
    const buttons = colorButtonsContainer.querySelectorAll('.color-btn');
    buttons.forEach(btn => {
        btn.disabled = false;
    });
}

// 버튼 비활성화
function disableButtons() {
    const buttons = colorButtonsContainer.querySelectorAll('.color-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
    });
}

restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);

// 게임 시작
initGame();
