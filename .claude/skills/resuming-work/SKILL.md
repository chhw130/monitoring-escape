---
name: resuming-work
description: 세션 시작 시 현재 작업 상태를 파악하는 루틴. Progress 파일과 git 상태를 확인해 다음 할 일을 안내한다. "/resuming-work", "이어서", "어디까지 했지", "현재 상태"에 사용.
allowed-tools: Read, Bash(git status *), Bash(git log *), Bash(git branch *)
---

# Resuming-Work — 세션 재개 루틴

## 실행 순서

1. `git branch --show-current` — 현재 브랜치 확인 (형식: `feat/{이슈번호}-{suffix}`)
2. 브랜치명에서 이슈번호 추출 후 GitHub 이슈 상태 조회:
   ```bash
   gh issue view {이슈번호} --json title,state -q '{title} [{state}]'
   ```
3. `.claude/progress/{branch}/progress.md` 읽기
4. `git log --oneline -10` — 최근 커밋 확인
5. `git status` — 미커밋 변경사항 확인

---

## 출력 형식

```
이슈: #{이슈번호} {이슈 제목} [{open|closed}]
브랜치: feat/{이슈번호}-{suffix}

## 작업 현황

{progress.md 의 Feature List 요약}

완료: {N}/{전체}
미완료: {다음 Feature}

## Git 상태

최근 커밋: {hash} {message}
미커밋 변경: {있으면 파일 목록 / 없으면 "없음"}

## 다음 할 일

{상태에 따른 안내}
```

---

## 상태별 다음 안내

| 상태 | 안내 |
|------|------|
| Feature 미완료 있음 | `/writing-code` — 다음 Feature 구현 |
| 전체 Feature 완료, 리뷰 미완료 | `/code-review` — 코드 리뷰 |
| 리뷰 통과, PR 미생성 | `/shipping-pr` — PR 생성 |
| progress.md 없음 | `/planning-issue` — 작업 초기화 먼저 |
| 미커밋 변경 있음 | 커밋 또는 stash 후 진행 권장 |
