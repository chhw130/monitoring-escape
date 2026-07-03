# Skills 워크플로우

GitHub 이슈 하나를 PR로 마무리하기까지의 전체 흐름.

```
GitHub Issue
    │
    ▼
/planning-issue {이슈번호}   → PRD + Feature List 생성, 브랜치 분기
    │
    ▼
/writing-code              → Feature 하나 구현 · 커밋 · 반복
    │                        (Feature List가 빌 때까지)
    ▼
/code-review               → 코드 품질 점검 (PASS / NEEDS-WORK / BLOCKED)
    │                        NEEDS-WORK · BLOCKED → /writing-code 루프 재진입
    ▼
/shipping-pr               → push + PR 생성 (code-review PASS 필수)
```

---

## 환경 요구사항

### GitHub CLI 설치

**macOS**
```bash
brew install gh
```

**Windows**
```bash
winget install --id GitHub.cli
```


### GitHub CLI 인증

```bash
gh auth login    # 브라우저 또는 토큰으로 로그인
gh auth status   # 인증 상태 확인
```

> 인증이 완료되어야 `/plan`의 이슈 조회와 `/ship`의 PR 생성이 정상 동작합니다.
> 미인증 시 `/plan`은 수동 입력 fallback, `/ship`은 PR URL 수동 복사로 진행합니다.

---

## 스킬별 역할

| 스킬 | 역할 | 입력 | 출력 |
|------|------|------|------|
| [`/planning-issue`](planning-issue/SKILL.md) | 이슈 → 작업 계획 | GitHub 이슈번호 | `prd.md` + `progress.md` + 브랜치 |
| [`/writing-code`](writing-code/SKILL.md) | Feature 하나 구현 | `progress.md` | 커밋 + 업데이트된 `progress.md` |
| [`/code-review`](code-review/SKILL.md) | 코드 품질 점검 | 변경된 코드 | Verdict (PASS / NEEDS-WORK / BLOCKED) |
| [`/shipping-pr`](shipping-pr/SKILL.md) | PR 생성 | code-review PASS + 커밋들 | PR URL |
| [`/resuming-work`](resuming-work/SKILL.md) | 중단된 작업 재개 | 브랜치 + `progress.md` | 다음 할 일 안내 |

---

## 산출물 구조

```
.claude/progress/{branch}/
├── prd.md          # 목표 · AC · Out of scope
├── progress.md     # Feature List 체크리스트 + 컨텍스트 지도
└── pull-request.md # /ship이 생성하는 PR description
```

---

## 브랜치 네이밍

| 이슈 타입 | prefix | 예시 |
|---------|--------|------|
| 기능 추가 | `feat/` | `feat/42-modal-open` |
| 개선 작업 | `feat/` | `feat/55-refactor-auth` |
| 버그 수정 | `fix/` | `fix/33-button-crash` |
| 문서 작성 | `docs/` | `docs/10-api-guide` |

---

## 체크포인트 원칙

- `/planning-issue` — Step마다 개발자 확인 후 진행
- `/writing-code` — 커밋 전 개발자 OK 필수. 한 번에 Feature 하나만
- `/code-review` — Critical 발견 시 BLOCKED. 자동 완화 금지
- `/shipping-pr` — `/code-review PASS` 없으면 push 불가
