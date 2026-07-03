---
name: planning-issue
description: GitHub 이슈를 기반으로 PRD·Feature List를 생성하는 Plan 에이전트. 워크플로우의 첫 단계. "/planning-issue {이슈번호}", "작업 초기화", "태스크 시작"에 사용.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git *), Bash(gh issue *), AskUserQuestion
---

# Planning-Issue — 작업 계획 에이전트

## 목차

1. [이 스킬이 하는 것](#1-이-스킬이-하는-것)
2. [이슈 타입 기준표](#2-이슈-타입-기준표)
3. [절대 하지 않을 것](#3-절대-하지-않을-것)
4. [사전 체크](#4-사전-체크)
5. [실행 단계](#5-실행-단계)
6. [출력 템플릿](#6-출력-템플릿)

---

## 1. 이 스킬이 하는 것

GitHub 이슈를 읽어 `prd.md`와 `progress.md`를 생성하고 작업 브랜치를 만든다.

---

## 2. 이슈 타입 기준표

GitHub 라벨 → 타입 자동 매핑. 라벨 없거나 모호하면 AskUserQuestion.

| 타입 | 감지 라벨 | 브랜치 prefix | PRD 템플릿 | 커밋 type |
|------|---------|-------------|-----------|----------|
| **기능 추가** | `feature`, `enhancement` | `feat/` | prd-feature.md | `feat` |
| **개선 작업** | `improvement`, `refactor`, `chore` | `feat/` | prd-improvement.md | `refactor` |
| **버그 수정** | `bug` | `fix/` | prd-bugfix.md | `fix` |
| **문서 작성** | `documentation`, `docs` | `docs/` | (생략) | `docs` |

> **문서 작성**은 자동으로 `--light` 모드로 처리 (PRD 생략).

---

## 3. 절대 하지 않을 것

- 개발자 확인 없이 다음 단계로 자동 진행
- `~인 것 같다`로 영향 범위 추측 (개발자가 코드로 직접 확인)
- Feature가 10개 초과인데 하나의 브랜치로 진행
- 체크포인트 여러 개를 한 번에 건너뜀

---

## 4. 사전 체크

순서대로 평가. 실패 시 이유를 공지하고 종료.

1. `git status` — working tree clean 여부 (더러우면 stash/commit 권유)
2. 현재 브랜치 확인 (main에서 시작 권장)
3. `.claude/progress/` 디렉터리 없으면 자동 생성
4. 현재 브랜치명이 이슈를 기반으로 생성한 브랜치인지 확인

---

## 5. 실행 단계

### Step 1 — 이슈 정보 수집

**이슈번호 파싱**: `$ARGUMENTS`에서 숫자 추출. 없으면 AskUserQuestion으로 요청.

GitHub 이슈 자동 조회:
```bash
gh issue view {이슈번호} --json title,body,labels,assignees
```

- 성공: 제목·본문·라벨 추출 → 자동 채움
- 실패: 경고 + 수동 입력 fallback

이슈 본문에서 추출할 항목:
- 작업 목적 / 배경
- 요구사항 또는 체크리스트
- 관련 링크 (Figma, 참고 PR 등)

> **체크포인트 1**: "빠진 맥락이나 추가 정보 있나요?"

---

### Step 1.5 — 이슈 타입 감지

라벨에서 타입 자동 결정 ([§ 2 기준표](#2-이슈-타입-기준표) 적용).

라벨 없거나 여러 타입에 해당하면 AskUserQuestion:

```
question: "이슈 타입을 선택해주세요."
options:
  1. 기능 추가  — 새로운 기능 구현
  2. 개선 작업  — 기존 기능 개선 / 리팩터링
  3. 버그 수정  — 오류 수정
  4. 문서 작성  — 문서·주석 작성
```

타입이 결정되면 이후 모든 단계에 자동 적용.

---

### Step 2 — 영향 범위 분석

식별 대상:
- 직접 수정 파일 / 디렉터리
- 이 변경으로 깨질 수 있는 의존성
- 공용 컴포넌트 / 패키지 침범 여부

**버그 수정** 추가 확인:
- 버그 발생 경로 (어떤 컴포넌트→함수→라인)
- 동일 패턴이 다른 곳에도 있는지

원칙: grep·find·파일 직접 읽기로 확인. 추측 금지.

> **체크포인트 2**: "이 범위가 맞는지 확인해주세요."

---

### Step 3 — PRD 작성

타입별 템플릿으로 `prd.md` 생성:

| 타입 | 템플릿 | 핵심 항목 |
|------|--------|---------|
| 기능 추가 | [`templates/prd-feature.md`](templates/prd-feature.md) | User story + AC + Out of scope |
| 개선 작업 | [`templates/prd-improvement.md`](templates/prd-improvement.md) | 현재 문제 + 개선 목표 + AC |
| 버그 수정 | [`templates/prd-bugfix.md`](templates/prd-bugfix.md) | 재현 절차 + 원인 + 수정 방향 |
| 문서 작성 | 생략 | — |

의도가 모호하거나 모순이면 체크포인트 3 보류.

> **체크포인트 3**: "이 PRD가 맞는지 확인해주세요."

---

### Step 4 — Feature List 생성

**5개 이하의 독립 단계**로 분해.

타입별 분해 원칙:

- **기능 추가**: 타입 분리 → 컴포넌트 → 훅 추출 순
- **개선 작업**: 현재 동작 보존 확인 → 리팩터링 → 검증 순
- **버그 수정**: 재현 확인 → 원인 격리 → 수정 → 회귀 방지 순. 보통 1~3개
- **문서 작성**: 작성 대상 파일별로 분리. 보통 1~2개

`progress.md` 안에 마크다운 체크리스트로 작성:
```markdown
- [ ] 1. {Feature 설명}
- [ ] 2. {Feature 설명}
```

> **체크포인트 4**: "이대로 진행할까요?"

---

### Step 5 — 브랜치 생성 + 파일 저장

**브랜치명**: `{prefix}/{이슈번호}-{suffix}`
- suffix가 있으면 그대로 사용
- 없으면 이슈 제목에서 slug 자동 생성

```bash
git checkout -b {prefix}/{이슈번호}-{suffix}
```

산출물 저장 위치:
```
.claude/progress/{branch}/
├── prd.md       (문서 작성은 생략)
└── progress.md  (타입 필드 포함)
```

`progress.md`의 `타입` 필드에 기록 → `/writing-code`, `/shipping-pr`이 참조.

---

### Step 6 — 완료 출력

```
✔ 작업 초기화 완료
이슈: #{이슈번호} {이슈 제목}
타입: {기능 추가 | 개선 작업 | 버그 수정 | 문서 작성}
브랜치: {prefix}/{이슈번호}-{suffix}
생성: {생성된 파일 목록}
다음: /writing-code (Feature 1부터) | /resuming-work (현황 확인)
```

---


## 6. 출력 템플릿

- [`templates/prd-feature.md`](templates/prd-feature.md) — 기능 추가
- [`templates/prd-improvement.md`](templates/prd-improvement.md) — 개선 작업
- [`templates/prd-bugfix.md`](templates/prd-bugfix.md) — 버그 수정
- [`templates/progress.md`](templates/progress.md) — Progress 파일
