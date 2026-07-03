# Scenarios — {작업 제목}

**브랜치**: {branch}
**기반 AC**: prd.md

---

## Feature 1: {Feature 제목}

### Happy Path

```
Scenario: {시나리오 제목}
  Given {초기 상태}
  When  {사용자 동작}
  Then  {기대 결과}
```

검증: 🤖 자동 / 👤 수동

---

### Edge Cases

```
Scenario: {edge case 제목}
  Given {초기 상태}
  When  {동작}
  Then  {기대 결과}
```

검증: 🤖 자동 / 👤 수동

---

## Feature 2: {Feature 제목}

### Happy Path

```
Scenario: {시나리오 제목}
  Given {초기 상태}
  When  {사용자 동작}
  Then  {기대 결과}
```

---

## 검증 분류 기준

- 🤖 자동 — 단위 테스트 / e2e 가능
- 👤 수동 — 개발자 직접 재현 필요
- ❌ gap — 구현 누락 (review 단계에서 갱신)
