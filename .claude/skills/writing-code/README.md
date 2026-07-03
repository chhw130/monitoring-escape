> 이 파일은 code/SKILL.md의 인간용 보조 문서입니다.

# Code 스킬

## 실행 흐름

```
/code 입력
  │
  ├─ Step 1   progress.md 읽기
  │           다음 미완료 Feature 식별 (- [ ] 첫 항목)
  │           prd.md에서 해당 Feature의 AC 확인
  │
  ├─ Step 2   구현 사이클
  │
  │   ┌─ 1. 읽기   관련 파일 Read, 패턴·네이밍 파악
  │   ├─ 2. 구현   패턴대로 최소 변경
  │   ├─ 3. 자문   "이 코드가 여기 맞나? AC를 만족하나?"
  │   └─ 4. 검증   AC 대조 → lint → 개발자 확인 게이트
  │               ✋ "이대로 커밋할까요?" OK 받을 때까지 대기
  │
  ├─ Step 3   git commit (개발자 OK 후)
  │           fix(modal): 클릭 시 모달 열리지 않는 버그 수정 (#42)
  │
  ├─ Step 4   progress.md 업데이트
  │           - [ ] 1. {Feature} → - [x] 1. {Feature} (abc1234)
  │
  └─ Step 5   결과 보고
              Feature 1/3 완료 — 다음: /code 로 Feature 2 진행
              (마지막이면 /review 선택 UI 노출)
```
