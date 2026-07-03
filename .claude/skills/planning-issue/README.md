> 이 파일은 plan/SKILL.md의 인간용 보조 문서입니다.

# Plan 스킬

## 역할

GitHub 이슈 타입에 따라 **하네스 5가지 구성요소**를 적합한 형태로 파일에 정리한다.

| 구성요소 | 산출물 | 역할 |
|---------|--------|------|
| 목표 문서 | `prd.md` | 무엇을 할지 / 하지 말아야 할지 |
| 컨텍스트 지도 | `progress.md` § 관련 파일 | 필요한 파일이 어디에 있는지 |
| 도구 목록 | `progress.md` § 메타 | 사용할 도구와 금지 도구 |
| 검증 방법 | `prd.md` § AC | Acceptance Criteria로 검증 기준 대체 |
| 기록 방식 | `progress.md` 체크리스트 | 다음 세션에 넘길 Feature List |

## 실행 흐름

```
/plan 42 입력
  │
  ├─ Step 1   gh issue view 42 로 이슈 읽기
  │           제목·본문·라벨·요구사항 자동 추출
  │           ✋ 체크포인트: "빠진 맥락 있나요?"
  │
  ├─ Step 1.5 라벨로 타입 자동 감지 (bug → 버그 수정)
  │           모호하면 선택 UI 노출
  │
  ├─ Step 2   관련 파일 탐색 (Grep/Glob)
  │           버그 수정이면 발생 경로(컴포넌트→함수→라인)까지 추적
  │           ✋ 체크포인트: "이 범위가 맞나요?"
  │
  ├─ Step 3   타입별 템플릿으로 prd.md 생성
  │           버그 수정 → 재현 절차 + 원인 + 수정 방향
  │           ✋ 체크포인트: "이 PRD가 맞나요?"
  │
  ├─ Step 4   작업을 5개 이하 Feature로 분해
  │           progress.md 체크리스트로 작성
  │           ✋ 체크포인트: "이대로 진행할까요?"
  │
  ├─ Step 5   브랜치 생성 + 파일 저장
  │           git checkout -b fix/42-modal-not-opening
  │           .claude/progress/fix/42-modal-not-opening/
  │             ├── prd.md
  │             └── progress.md  ← 타입 필드 포함
  │
  └─ Step 6   완료 출력
              이슈: #42 버튼 클릭 시 모달이 열리지 않는 버그
              타입: 버그 수정
              브랜치: fix/42-modal-not-opening
              다음: /code → /review → /ship
```
