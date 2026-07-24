# 사용량 카드 설정 가이드 (한국어)

사용량 히트맵 카드를 만드는 전체 과정입니다. 5분이면 끝납니다.

## 개념 먼저

- 여러분의 AI 사용 기록(Claude Code 등)은 **여러분 컴퓨터 안에만** 있습니다. 카드 서버는 볼 수 없어요.
- 그래서 작은 **수집기 스크립트**가 숫자 요약(날짜·토큰 수·모델명)만 뽑아 **gist**에 올리고, 카드는 그 gist를 읽습니다.
- **gist** = GitHub 계정에 딸려 오는 무료 한-파일 저장소. 카드가 읽어갈 우편함이라고 생각하세요.
- **토큰(PAT)** = 수집기가 그 우편함에 글을 쓸 수 있게 해주는 용도 제한 비밀번호. gist 쓰기 외엔 아무것도 못 합니다.
- 대화 내용, 프로젝트 이름, 파일 경로, 비용은 **절대 업로드되지 않습니다.**

## 1단계 — gist 만들기

1. https://gist.github.com 접속 (GitHub 로그인 상태에서)
2. 파일명에 `usage.json`, 내용에 `{}` 입력
3. **Create secret gist** 클릭
4. 주소창을 보면 `gist.github.com/아이디/`**`긴16진수문자열`** — 이 긴 문자열이 **gist id**입니다. 복사해두세요.

## 2단계 — 토큰 만들기

1. https://github.com/settings/tokens/new?scopes=gist&description=ai-usage-cards 접속
   (`gist` 권한만 미리 체크되어 있습니다 — 그대로 두세요)
2. 맨 아래 **Generate token** 클릭
3. `ghp_...`로 시작하는 문자열을 복사 — **이 화면에서만 보여주니 지금 복사하세요.**

## 3단계 — 수집기 한 번 실행

[Node.js](https://nodejs.org) 20 이상이 설치되어 있어야 합니다.

**Windows (PowerShell)**:
```powershell
curl.exe -fsSLO https://raw.githubusercontent.com/JinVibe/ai-usage-cards/main/collector/collect.mjs
$env:AIUC_GIST_ID="여기에_gist_id"; $env:AIUC_GIST_TOKEN="여기에_토큰"; $env:AIUC_SOURCE_ID="my-pc"; node collect.mjs
```

**macOS / Linux**:
```bash
curl -fsSLO https://raw.githubusercontent.com/JinVibe/ai-usage-cards/main/collector/collect.mjs
AIUC_GIST_ID=여기에_gist_id AIUC_GIST_TOKEN=여기에_토큰 AIUC_SOURCE_ID=my-laptop node collect.mjs
```

`Uploaded N days as my-pc.json` 이 나오면 성공입니다.

## 4단계 — 카드 붙이기

아래 URL의 두 자리를 채워서 README에 붙입니다:

```
https://ai-usage-cards-swart.vercel.app/api/usage-card?username=깃허브아이디&gist=gist_id&theme=dark
```

라이트/다크 자동 전환 버전:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ai-usage-cards-swart.vercel.app/api/usage-card?username=깃허브아이디&gist=gist_id&theme=dark">
  <img src="https://ai-usage-cards-swart.vercel.app/api/usage-card?username=깃허브아이디&gist=gist_id&theme=light" alt="AI usage">
</picture>
```

gist id는 공개돼도 괜찮습니다 (카드에 이미 보이는 숫자만 들어 있음). **토큰은 비밀로 유지하세요.**

## 5단계 — 자동 갱신 (선택이지만 추천)

**Windows**: `%USERPROFILE%\.ai-usage-cards\collect.cmd` 파일을 만들고:

```bat
@echo off
set AIUC_GIST_ID=여기에_gist_id
set AIUC_GIST_TOKEN=여기에_토큰
set AIUC_SOURCE_ID=my-pc
node "C:\경로\collect.mjs"
```

PowerShell에서 등록 (매일 12시 실행):

```powershell
schtasks /create /tn "ai-usage-cards-collector" /tr "%USERPROFILE%\.ai-usage-cards\collect.cmd" /sc daily /st 12:00
```

**macOS / Linux**: `crontab -e` 후 한 줄 추가:

```
0 12 * * * AIUC_GIST_ID=... AIUC_GIST_TOKEN=... AIUC_SOURCE_ID=my-laptop node /경로/collect.mjs
```

## 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `ccusage returned no daily data` | 이 컴퓨터에 AI CLI 사용 기록이 아직 없음. Claude Code 등을 한 번 쓰고 다시 실행 |
| `Gist update failed: 404` | gist id 오타이거나 다른 계정의 토큰 |
| `Gist update failed: 401/403` | 토큰 만료 또는 `gist` 권한 없음 → 2단계에서 재발급 |
| 카드에 "No usage data collected yet" | 수집기가 아직 성공한 적 없음 → 3단계 출력 확인 |

컴퓨터를 여러 대 쓰면 각 컴퓨터에서 3·5단계를 반복하되 `AIUC_SOURCE_ID`만 다르게 주세요.
서로 자기 파일만 갱신해서 충돌이 없고, 컴퓨터 이름은 카드에 표시되지 않습니다.
