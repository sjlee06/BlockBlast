# 구글 시트 하이스코어 리더보드 설정 가이드

## 1단계: 구글 시트 생성

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 시트 이름: `BlockBlast Leaderboard`
3. 첫 번째 행에 헤더 추가:
   - A1: `name`
   - B1: `score`
   - C1: `timestamp`

## 2단계: Google Apps Script 설정

1. 구글 시트에서 `확장 프로그램` > `Apps Script` 클릭
2. 기본 코드 삭제 후 아래 코드 붙여넣기:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // 데이터 추가
    sheet.appendRow([
      data.name,
      data.score,
      new Date().toISOString()
    ]);

    // 점수 기준 내림차순 정렬 (헤더 제외)
    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3);
    range.sort({column: 2, ascending: false});

    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const limit = e.parameter.limit || 10;

    // 헤더 제외하고 데이터 가져오기
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({scores: []}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getRange(2, 1, Math.min(lastRow - 1, limit), 3).getValues();

    const scores = data.map(row => ({
      name: row[0],
      score: row[1],
      timestamp: row[2]
    }));

    return ContentService
      .createTextOutput(JSON.stringify({scores: scores}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({scores: [], error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. 저장 아이콘 클릭 (프로젝트 이름: `BlockBlast API`)

## 3단계: 배포

1. 우측 상단 `배포` > `새 배포` 클릭
2. `유형 선택` > `웹 앱` 선택
3. 설정:
   - **설명**: `BlockBlast Leaderboard API`
   - **실행 사용자**: `나`
   - **액세스 권한**: `모든 사용자` (Anyone)
4. `배포` 클릭
5. 권한 승인 (Google 계정 로그인 필요)
6. **웹 앱 URL** 복사 (예: `https://script.google.com/macros/s/ABC123.../exec`)

## 4단계: 게임에 URL 설정

복사한 URL을 `game.js` 파일의 `GOOGLE_SHEET_API_URL` 변수에 붙여넣기:

```javascript
const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 테스트

브라우저에서 다음 URL 접속하여 테스트:
```
YOUR_WEB_APP_URL?limit=10
```

성공 시 JSON 응답:
```json
{
  "scores": [
    {"name": "PLAYER1", "score": 1000, "timestamp": "2024-01-01T00:00:00.000Z"}
  ]
}
```

## 문제 해결

1. **CORS 에러**: Apps Script 배포 설정에서 "액세스 권한"이 "모든 사용자"인지 확인
2. **403 에러**: 배포를 새로 만들고 URL 업데이트
3. **데이터가 안 보임**: 구글 시트에서 첫 번째 행(헤더)이 올바른지 확인
