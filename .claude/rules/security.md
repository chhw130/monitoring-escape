# 보안 원칙

## XSS 방지

- `dangerouslySetInnerHTML` 사용 금지 — 꼭 필요하면 DOMPurify로 sanitize 후 사용
- 사용자 입력을 직접 HTML에 삽입하지 않는다

## 민감 정보 처리

- 토큰·세션은 httpOnly 쿠키로 관리 — `localStorage` / `sessionStorage`에 저장 금지
- 클라이언트 코드에 API 키, 시크릿 포함 금지
- `NEXT_PUBLIC_` 접두사 변수에는 공개 가능한 값만 사용

## 입력 검증

- 클라이언트 검증은 UX 목적 — 보안 검증은 서버에서 반드시 수행
- 사용자 입력 기반 URL 리다이렉트 금지 (Open Redirect 방지)

## 환경변수

- `.env` 파일은 git 커밋 금지 (`.gitignore` 확인)
- `.env.example`로 필요한 변수 목록만 공유
