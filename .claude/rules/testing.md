# 테스트 원칙

## 사용자 관점에서 테스트한다

구현 상세가 아닌 동작을 검증한다. "이 함수가 호출됐는가"보다 "사용자가 버튼을 클릭했을 때 원하는 결과가 나타나는가"를 확인한다.

## 무엇을 테스트할 것인가

- 비즈니스 로직 — 조건에 따른 분기, 계산, 변환
- AC(Acceptance Criteria) 검증 — prd.md의 Given/When/Then 기준
- 엣지 케이스 — 빈 값, 경계값, 에러 상태

## 무엇을 테스트하지 않을 것인가

- 라이브러리 내부 동작 (React, 외부 패키지)
- 구현 상세 — 특정 함수 호출 여부, 내부 state 값
- 스타일·레이아웃

## 테스트 명명 규칙

`{주어}가 {상황}일 때 {결과}를 {기댓값}으로 반환한다`

```
사용자가 잘못된 이메일을 입력했을 때 에러 메시지를 표시한다
할인율이 0%일 때 원래 가격을 그대로 반환한다
```

## Arrange - Act - Assert

각 단계를 빈 줄로 구분해 명확히 분리한다.

```ts
// Arrange
const input = 'invalid-email'

// Act
render(<EmailField value={input} />)

// Assert
expect(screen.getByRole('alert')).toBeInTheDocument()
```

## 테스트 독립성

- 각 테스트는 다른 테스트의 실행 순서에 의존하지 않는다
- 공유 상태는 `beforeEach`로 초기화한다
- 실제 네트워크·파일시스템 접근은 mock으로 대체한다
