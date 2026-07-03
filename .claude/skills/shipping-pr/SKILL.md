---
name: shipping-pr
description: PR 제목·description 자동 생성 + push + PR 생성을 표준화하는 Ship 에이전트. 워크플로우 마지막 단계. "/shipping-pr", "PR 만들기", "PR 올리기"에 사용.
allowed-tools: Read, Write, Edit, Grep, Bash(git push *), Bash(git log *), Bash(git status *), Bash(git diff *), Bash(gh pr create *), Bash(gh pr edit *), Bash(gh pr view *), AskUserQuestion
---

# Shipping-PR — PR 마무리 에이전트

## 목차

1. [이 스킬이 하는 것](#1-이-스킬이-하는-것)
2. [절대 하지 않을 것](#2-절대-하지-않을-것)
3. [실행 단계](#3-실행-단계)
4. [PR description 작성 원칙](#4-pr-description-작성-원칙)
5. [출력 템플릿](#5-출력-템플릿)

---

## 1. 이 스킬이 하는 것

매번 PR 만들 때 반복되는 단계(타입 체크 확인, 제목·description 작성, push, PR 생성)를 표준화한다.

---

## 2. 절대 하지 않을 것

- `.claude/progress/` 맥락 파일이 git history에 쌓이지 않도록 .gitignore 확인
- review 통과 미확인 상태에서 push 실행
- 보고서 톤 PR description — "~한 상태였음", "본 PR로 N단계 완성"

---

## 3. 실행 단계

### Step 1 — 사전 점검

**PR 존재 여부 먼저 감지**:
```bash
gh pr view --json url,title,state 2>/dev/null
```

PR이 이미 있으면 업데이트 모드로 전환:

```
🔄 PR이 이미 존재합니다: {PR 제목} ({url})

어떻게 진행할까요?
  1. push만   — 새 커밋을 올리고 description 유지
  2. push + description 수정   — 변경 내용 반영해 description 업데이트
```

- **1번 선택** → Step 3 (Push)로 바로 이동
- **2번 선택** → Step 2 (PR 메타 자료)부터 진행 후 `gh pr edit`으로 수정

---

PR이 없으면 review 통과 여부를 먼저 확인:

```
❓ /code-review PASS를 확인했나요?

  예 — 계속 진행
  아니오 — shipping-pr 중단 (/code-review 먼저 실행)
```

"아니오" 선택 시 즉시 종료:
```
⚠️ shipping-pr 중단. /code-review 실행 후 PASS 확인이 필요합니다.
```

review PASS 확인 후 추가 조건 confirm:

```
❓ 아래 항목도 확인해주세요.

  - type-check 통과
  - build 통과

  진행    — 확인 완료
  잠시 멈춤 — 미확인 항목 있음
```

---

### Step 2 — PR 메타 자료

#### 2-0. pull-request.md 존재 확인

`.claude/progress/{branch}/pull-request.md` 있으면 자동 발췌 skip → 파일 그대로 사용.

#### 2-1. PR 제목 자동 생성

브랜치명에서 이슈번호 추출 후 GitHub 이슈 제목 조회:
```bash
gh issue view {이슈번호} --json title -q .title
```

형식: `{이슈 제목} (#{이슈번호})`

```
📝 PR 제목 (자동 생성): {title}

❓ 이대로 갈까요?
  OK
  수정 — 새 제목 입력
```

#### 2-2. PR 타입 확인

`progress.md`의 `타입` 필드에서 자동 결정:

| 이슈 타입 | PR 타입 |
|---------|--------|
| 기능 추가 | 기능 추가 |
| 개선 작업 | 리팩터링 / 개선 |
| 버그 수정 | 버그 수정 |
| 문서 작성 | 문서 작성 |

```
📋 PR 타입 (자동): {타입}
❓ 이대로 갈까요?  OK / 변경
```

#### 2-3. description 자동 생성

`progress.md`의 `타입` 필드로 템플릿 자동 선택:

| 이슈 타입 | 템플릿 |
|---------|--------|
| 기능 추가 | [`templates/pr-body-feature.md`](templates/pr-body-feature.md) |
| 개선 작업 | [`templates/pr-body-improvement.md`](templates/pr-body-improvement.md) |
| 버그 수정 | [`templates/pr-body-bugfix.md`](templates/pr-body-bugfix.md) |
| 문서 작성 | (템플릿 없이 1~3줄 요약) |

> 작성 원칙: [§ 4 PR description 작성 원칙](#4-pr-description-작성-원칙)

셀프 평가 (사용자에게 노출 안 함):
- 첫 5줄로 "이 PR이 뭐고 왜 필요한지" 파악 가능?
- 전체 30줄 이하?
- 보고서 톤 없는지?

#### 2-4. 미리보기 + confirm

```
{PR description 전체 미리보기}

❓ 이대로 진행할까요?
  OK      — 곧바로 push
  수정    — 특정 부분만 수정
  다시    — PR 타입부터 재시작
```

---

### Step 3 — Push + PR 생성·업데이트

> Step 2 OK = description 확정 + push 동의. **Step 3 추가 confirm 금지**.

**공통**:
```bash
git push -u origin {branch}  # 첫 push
git push                      # 이후
```

**PR 없음 — 신규 생성**:
```bash
gh pr create \
  --title "{pr_title}" \
  --body "$(cat .claude/progress/{branch}/pull-request.md)" \
  --base main
```

description 마지막 줄에 `Closes #{이슈번호}` 자동 추가 — PR 머지 시 이슈 자동 닫힘.

**PR 있음 — description 수정 선택 시**:
```bash
gh pr edit \
  --body "$(cat .claude/progress/{branch}/pull-request.md)"
```

**gh CLI 없을 때 (fallback)**: push stdout에서 PR URL 추출 후 안내. description은 `pull-request.md`에서 복사.

```
✅ Push + PR 생성 / 업데이트 완료
PR URL: {url}
```

---

## 4. PR description 작성 원칙

| 원칙 | 내용 |
|------|------|
| Why 먼저 | 무엇보다 왜 필요한지 1~2줄 |
| 사용자 가치 | 추상적 명분 X, 구체적 가치 명시 |
| commit 나열 금지 | - |
| 분량 조절 | 사소한 수정은 3~5줄로 |

---

## 5. 출력 템플릿

- [`templates/pr-body-feature.md`](templates/pr-body-feature.md) — 기능 추가
- [`templates/pr-body-improvement.md`](templates/pr-body-improvement.md) — 개선 작업
- [`templates/pr-body-bugfix.md`](templates/pr-body-bugfix.md) — 버그 수정
