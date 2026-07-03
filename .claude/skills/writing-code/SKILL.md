---
name: writing-code
description: Feature List에서 다음 항목 하나만 구현·검증·커밋하는 점진적 구현 에이전트. "/writing-code", "다음 스텝", "구현"에 사용. 한 번에 하나만. 커밋하고 멈춘다.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git add *), Bash(git commit *), Bash(git status *), Bash(git log *), Bash(npm *), Bash(yarn *), Bash(pnpm *), AskUserQuestion
---

# Writing-Code — 점진적 구현 에이전트

## 목차

1. [이 스킬이 하는 것](#1-이-스킬이-하는-것)
2. [커밋 타입 기준표](#2-커밋-타입-기준표)
3. [절대 하지 않을 것](#3-절대-하지-않을-것)
4. [사전 체크](#4-사전-체크)
5. [실행 단계](#5-실행-단계)

---

## 1. 이 스킬이 하는 것

`progress.md`의 Feature List에서 **다음 미완료 항목 하나만** 구현하고, 검증하고, 커밋하고, progress를 업데이트한다.

**핵심 원칙: 한 번에 하나. 커밋하고. 기록하고. 멈춘다.**

---

## 2. 커밋 타입 기준표

`progress.md`의 `타입` 필드에서 커밋 type 자동 결정:

| 이슈 타입 | 커밋 type |
|---------|---------|
| 기능 추가 | `feat` |
| 개선 작업 | `refactor` |
| 버그 수정 | `fix` |
| 문서 작성 | `docs` |

```
{type}({scope}): {제목} (#{이슈번호})

Feature {N}/{전체}: {설명}
```

---

## 3. 절대 하지 않을 것

- 다음 Feature를 미리 시작하기
- Spec과 무관한 리팩터링
- 개발자 OK 없이 `git commit` 실행
- `git add .` / `git add -A` 사용 (의도치 않은 파일 포함 위험)
- build, type-check 직접 실행 (개발자가 실행)

---

## 4. 사전 체크

1. `git status` — 이전 작업 커밋됐는지 확인
2. `.claude/progress/{branch}/progress.md` 존재 확인 (없으면 `/planning-issue` 안내)
3. 다음 미완료 Feature 식별 (`- [ ]` 첫 항목)

---

## 5. 실행 단계

### Step 1 — Progress 로드

`{branch}/progress.md` + `prd.md` 읽기. 다음 `- [ ]` 첫 항목을 이번 구현 대상으로 선택.

---

### Step 2 — 구현 사이클

#### 1단계 — 읽기

코드를 건드리기 전에 먼저 읽는다.

- 관련 파일을 Read로 **직접** 읽는다 (이전에 봤다고 건너뛰지 않는다)
- 현재 코드의 패턴·네이밍·import 구조를 파악한다
- 이번 Feature의 AC를 `prd.md`에서 확인한다

---

#### 2단계 — 구현

읽은 패턴 그대로 구현한다.

| 제약 | 내용 |
|------|------|
| 읽기 우선 | 수정 전 해당 파일 반드시 읽기 |
| 패턴 준수 | 주변 코드 패턴 따르기 |
| 정책 보존 | `.claude/rules/` 위반 금지 |
| 최소 변경 | 이번 Feature scope에 필요한 것만 |

---

#### 3단계 — 자문

커밋 전에 스스로에게 질문한다.

- "이 코드가 여기 있는 게 맞나? 다른 레이어가 더 적절하지 않나?"
- "이 접근법의 trade-off가 뭔가? 더 나은 방식은?"
- "AC의 Given/When/Then을 실제로 만족시키는가?"

답이 애매하면 사용자에게 공유:
```
구현했는데 한 가지 고민이 있습니다:
  [질문]
제 판단은 [X]인데, 어떻게 생각하시나요?
```

---

#### 4단계 — 검증

**AC 대조 (필수)**

```
Given {초기 상태} → 이 상태를 재현할 수 있는가?
When  {동작}      → 이 동작으로 수정한 코드가 트리거되는가?
Then  {결과}      → 이 결과가 보장되는가?
```

**도구 검증**

패키지 매니저는 프로젝트 루트의 lockfile로 자동 감지:
- `package-lock.json` → `npm`
- `yarn.lock` → `yarn`
- `pnpm-lock.yaml` → `pnpm`

- `{패키지매니저} run lint` 또는 lint-staged — 변경 파일 린트 확인
- `{패키지매니저} test {변경된 파일}` — 해당 파일 테스트만 실행

**개발자 확인 게이트 (필수)**

구현 후 바로 커밋하지 않는다. 결과를 공유하고 OK를 받는다.

- **로직 Feature**: Input/Output 표로 공유
- **UI Feature**: 브라우저 검증 요청 (로컬 확인 경로 안내)

```
검증 결과:
  {시나리오} → {예상 출력}
  [UI인 경우] 다음으로 확인해주세요:
    Given: {초기 상태}
    When:  {동작}
    Then:  {기대 결과}

이대로 커밋할까요?
```

개발자 명시적 OK까지 `git commit` 실행 금지.

---

#### 실패 시

- 실패 → 원인 분석 → 1단계(읽기)로 복귀
- 같은 원인으로 2회 실패 → 접근법 변경
- 3회 실패 → 사용자에게 판단 넘기기

---

### Step 3 — Git Commit

개발자 OK 확인 후 실행. ([§ 2 기준표](#2-커밋-타입-기준표) 적용)

```bash
git add {변경된 파일들}
git commit -m "{type}({scope}): {제목} (#{이슈번호})"
```

---

### Step 4 — Progress 업데이트

```
- [ ] 1. {Feature} → - [x] 1. {Feature} (abc1234)
```

---

### Step 5 — 결과 보고

다음 Feature 안내. 마지막 Feature면 AskUserQuestion으로 모드 선택:

```
question: "✓ 전체 Feature 완료. 어떻게 진행할까요?"
options:
  1. 리뷰 시작    — /code-review
  2. 보류         — 나중에 /code-review 직접 호출
```

---

