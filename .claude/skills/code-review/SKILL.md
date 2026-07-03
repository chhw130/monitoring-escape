---
name: code-review
description: 코드 품질을 점검하는 리뷰 에이전트. push 전 로컬 1차 품질 게이트. "/code-review", "리뷰"에 사용.
allowed-tools: Read, Grep, Glob, Bash(git diff *), Bash(git log *), Bash(git status *), Task, AskUserQuestion
---

# Code-Review — 로컬 품질 게이트

## 목차

1. [이 스킬이 하는 것](#1-이-스킬이-하는-것)
2. [절대 하지 않을 것](#2-절대-하지-않을-것)
3. [사전 체크](#3-사전-체크)
4. [Phase A — 점검](#4-phase-a--점검)
5. [Phase B — 결과 통합](#5-phase-b--결과-통합)
6. [출력 형식](#6-출력-형식)
7. [Verdict별 다음 동작](#7-verdict별-다음-동작)

---

## 1. 이 스킬이 하는 것

코드 품질(정확성·가독성·구조·보안·성능)을 code-reviewer sub-agent가 점검한다.

---

## 2. 절대 하지 않을 것

- Critical 발견 후 BLOCKED가 아닌 다른 verdict 반환
- 사용자 OK 없이 NEEDS-WORK 수정 자동 진입
- 원본 보고서 생략하고 통합 결과만 출력
- 모든 항목이 PASS해도 자동으로 git push하지 않기

---

## 3. 사전 체크

순서대로 평가. 첫 매칭 시 즉시 처리.

1. **변경 있나** — `git diff main...HEAD` 비어있으면 "리뷰할 변경 없음" 후 종료
2. **progress 파일만 변경** — 코드 변경 없으면 "리뷰 대상 없음" 후 종료
3. **master/main에서 호출** — AskUserQuestion으로 컨펌

---

## 4. Phase A — 점검

**점검 시작 안내**:

```
🔍 리뷰 진행 중 — code-reviewer 점검 중.
```

Task 호출:
```
Task: code-reviewer — 품질 점검
```

### sub-agent에 전달하는 정보

- `git diff main...HEAD` 결과
- 변경된 파일 목록
- progress 폴더 경로
- 현재 브랜치명
- `.claude/rules/code-style.md` 내용 — 점검 기준으로 사용

---

## 5. Phase B — 결과 통합

1. **분류**:
   - Critical — 머지 차단 수준
   - Important — 수정 권장
   - Suggestion — 선택적 개선
2. **Verdict 결정**:
   - Critical 1개 이상 → **BLOCKED**
   - Important 1개 이상 → **NEEDS-WORK**
   - 둘 다 없음 → **PASS**

---

## 6. 출력 형식

```markdown
## /code-review 결과

**Verdict**: ✅ PASS / ⚠️ NEEDS-WORK / ❌ BLOCKED

**Overview**: {1-2문장 요약}

### Critical

- `{file:line}` — {설명}

### Important

- {항목}

### Suggestion

- {항목}

---

## 원본 보고서

{전체 보고서}
```

---

## 7. Verdict별 다음 동작

### PASS

```
✅ 리뷰 통과.
다음: /shipping-pr 진행 — PR 작성 + push
```

### NEEDS-WORK / BLOCKED

```
⚠️ NEEDS-WORK — 수정 필요 항목 {N}개

다음 단계:
  1. 항목별 수정 (어느 항목부터? 선택)
  2. 보류 (나중에 직접 수정)
```

1번 선택 시 → 수정 대상 확인 후 `/writing-code` 루프 재진입.

---

## 메모

- 300줄 넘는 출력은 청크 분할로 보여준다
- `/code-review` 통과 없이 `/shipping-pr` 진행 시 경고 표시
