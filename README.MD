# 사내 소모품 관리 웹사이트

React + Vite + TypeScript 기반의 사내 소모품 관리 웹사이트입니다. TailwindCSS와 shadcn/ui 패턴을 활용하여 관리자/사용자 별 기능을 제공합니다.

## 주요 기능
- **대시보드**: 월별 지급/구매 추세, 사용자별 요청 비중, 저재고 알림, 최근 활동 타임라인.
- **품목 관리**: CRUD, 검색/필터, CSV 업로드/다운로드, 품목 옵션과 임계치 관리.
- **재고 관리**: 재고 증감 및 조정, 저재고 태그, CSV 다운로드.
- **지급/구매 요청**: 장바구니 방식 요청, 상태 전환(draft → submitted → approved/fulfilled 등), 관리자 승인/단위 변환, 첨부 파일 메타 정보.
- **이력 관리**: Audit 로그 필터링/다운로드, 타임라인 확인.
- **사용자 관리**: 관리자 전용 사용자 CRUD 및 권한 지정.
- **권한 분리**: 사용자(User)는 본인 요청 중심, 관리자(Admin)는 전체 관리 기능 수행.

## 개발 환경
- Node.js 18 이상 권장
- Vite 5, React 18, TypeScript 5
- TailwindCSS, Radix UI 기반 shadcn/ui 컴포넌트
- Context + Reducer 기반 전역 상태에 로컬 스토리지/원격 API 동기화 지원
- Vitest + React Testing Library 단위 테스트, Playwright E2E 샘플 포함

## 사용 방법
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 타입 검사 및 번들 빌드
npm run build

# 단위 테스트 실행
npm run test

# E2E 테스트 실행 (서버가 필요하므로 별도 터미널에서 dev 서버 구동)
npm run test:e2e
```

### 데이터 영속화
- 기본적으로 브라우저 `localStorage` (테스트 환경에서는 인메모리 스토리지)에 모든 품목/요청/사용자/이력 데이터가 저장됩니다.
- `VITE_API_BASE_URL` 환경 변수를 지정하면 `GET/PUT/DELETE {BASE_URL}/app-state` 엔드포인트와 자동 동기화합니다. 실패 시 로컬 데이터로 폴백합니다.
- 동기화 상태는 헤더 우측에서 확인할 수 있으며, 마지막 동기화 시각과 원격/로컬 여부를 표시합니다.
- 세션 정보 또한 브라우저 스토리지에 저장되어 새로고침 후에도 로그인 상태가 유지됩니다.

## 테스트 계정
- **관리자**: 비밀번호 `admin1234`
- **일반 사용자**: 아이디 `jdoe`, 비밀번호 `password1`

## 라이선스
프로젝트 예제 용도로 작성되었습니다.
