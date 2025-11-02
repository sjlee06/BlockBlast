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

    // 구글 시트 API 설정
    // GOOGLE_SHEET_SETUP.md 가이드를 따라 URL을 설정하세요
    GOOGLE_SHEET_API_URL: 'https://script.google.com/macros/s/AKfycbzGQ6TgwYGoI_JYjlyuPfDunsG_wpDtcYdlqQ30sYjy-qrjP6YcdZjJDScsqZW_5GdN/exec', // 예: 'https://script.google.com/macros/s/YOUR_ID/exec'
    LEADERBOARD_LIMIT: 10, // 표시할 최대 리더보드 항목 수
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
let turnCount = 0;
let gameOver = false;

// DOM 요소
const gameBoard = document.getElementById('game-board');
const currentScoreEl = document.getElementById('current-score');
const turnCountEl = document.getElementById('turn-count');
const colorButtonsContainer = document.getElementById('color-buttons');
const restartBtn = document.getElementById('restart-btn');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const highscoreForm = document.getElementById('highscore-form');
const playerNameInput = document.getElementById('player-name');
const submitScoreBtn = document.getElementById('submit-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');

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

        // 턴 증가
        turnCount++;

        // n턴마다 새로운 블록 추가 (모든 블록을 아래로 한 칸씩 밀어냄)
        if (turnCount % GAME_CONFIG.TURNS_PER_NEW_ROW === 0) {
            const isGameOver = addNewRow();

            // 게임 오버면 화면 업데이트 후 종료
            if (isGameOver) {
                updateDisplay();
                renderBoard();
                return;
            }
        }

        updateDisplay();
        renderBoard();
    }, 500);
}

// 중력 적용 함수 제거 (더 이상 사용하지 않음)

// 새로운 줄 추가
function addNewRow() {
    // 게임 오버 체크: 어느 한 열이라도 8개가 차있으면 게임 오버
    for (let col = 0; col < COLS; col++) {
        if (board[ROWS - 1][col] !== null) {
            // 맨 아래 줄(8번째)에 블록이 있는 상태에서 새 줄을 추가하면 게임 오버
            endGame();
            return true; // 게임 오버 발생
        }
    }

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

    return false; // 게임 계속
}

// 게임 오버 체크 함수 제거 (addNewRow에서 직접 체크)

// 게임 종료
function endGame() {
    gameOver = true;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove('hidden');
    disableButtons();

    // 리더보드 로드
    loadLeaderboard();

    // 하이스코어 체크 및 입력 폼 표시 (구글 시트 API가 설정된 경우만)
    if (GAME_CONFIG.GOOGLE_SHEET_API_URL) {
        checkHighScore();
    }
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

// ========================================
// 구글 시트 리더보드 기능
// ========================================

// 리더보드 로드
async function loadLeaderboard() {
    if (!GAME_CONFIG.GOOGLE_SHEET_API_URL) {
        leaderboardList.innerHTML = '<p class="error-message">구글 시트 API가 설정되지 않았습니다.<br>GOOGLE_SHEET_SETUP.md를 참고하세요.</p>';
        return;
    }

    leaderboardList.innerHTML = '<p class="loading">로딩 중...</p>';

    try {
        const response = await fetch(`${GAME_CONFIG.GOOGLE_SHEET_API_URL}?limit=${GAME_CONFIG.LEADERBOARD_LIMIT}`);
        const data = await response.json();

        if (data.scores && data.scores.length > 0) {
            renderLeaderboard(data.scores);
        } else {
            leaderboardList.innerHTML = '<p class="loading">아직 기록이 없습니다.</p>';
        }
    } catch (error) {
        console.error('리더보드 로드 실패:', error);
        leaderboardList.innerHTML = '<p class="error-message">리더보드를 불러올 수 없습니다.</p>';
    }
}

// 리더보드 렌더링
function renderLeaderboard(scores) {
    leaderboardList.innerHTML = '';

    scores.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';

        // 1~3위 특별 스타일
        if (index === 0) item.classList.add('top-1');
        else if (index === 1) item.classList.add('top-2');
        else if (index === 2) item.classList.add('top-3');

        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `#${index + 1}`;

        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = entry.name;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'player-score';
        scoreSpan.textContent = entry.score.toLocaleString();

        item.appendChild(rank);
        item.appendChild(name);
        item.appendChild(scoreSpan);

        leaderboardList.appendChild(item);
    });
}

// 하이스코어 체크 (10위 안에 들었는지)
async function checkHighScore() {
    if (!GAME_CONFIG.GOOGLE_SHEET_API_URL) return;

    try {
        const response = await fetch(`${GAME_CONFIG.GOOGLE_SHEET_API_URL}?limit=${GAME_CONFIG.LEADERBOARD_LIMIT}`);
        const data = await response.json();

        // 리더보드가 비어있거나, 10개 미만이거나, 현재 점수가 10위보다 높으면 폼 표시
        if (!data.scores || data.scores.length < GAME_CONFIG.LEADERBOARD_LIMIT ||
            score > data.scores[data.scores.length - 1].score) {
            highscoreForm.classList.remove('hidden');
        }
    } catch (error) {
        console.error('하이스코어 체크 실패:', error);
        // 에러 시에도 폼 표시
        highscoreForm.classList.remove('hidden');
    }
}

// 점수 제출
async function submitScore() {
    const playerName = playerNameInput.value.trim().toUpperCase();

    // 유효성 검사
    if (!playerName) {
        alert('이름을 입력해주세요!');
        return;
    }

    if (!/^[A-Z0-9]+$/.test(playerName)) {
        alert('영어와 숫자만 입력 가능합니다!');
        return;
    }

    if (playerName.length > 8) {
        alert('이름은 최대 8자까지 입력 가능합니다!');
        return;
    }

    // 버튼 비활성화
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = '등록 중...';

    try {
        const response = await fetch(GAME_CONFIG.GOOGLE_SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS 우회
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: playerName,
                score: score
            })
        });

        // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
        alert('🎉 점수가 등록되었습니다!');
        highscoreForm.classList.add('hidden');

        // 리더보드 새로고침 (약간의 지연 후)
        setTimeout(() => {
            loadLeaderboard();
        }, 1000);

    } catch (error) {
        console.error('점수 제출 실패:', error);
        alert('점수 등록에 실패했습니다. 다시 시도해주세요.');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = '등록하기';
    }
}

// 이름 입력 필드 영어/숫자만 허용
playerNameInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
});

// 엔터키로 제출
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitScore();
    }
});

// 제출 버튼 이벤트
submitScoreBtn.addEventListener('click', submitScore);

restartBtn.addEventListener('click', initGame);
modalRestartBtn.addEventListener('click', initGame);

// 게임 시작
initGame();
