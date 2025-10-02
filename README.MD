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
- Context + Reducer 기반 전역 상태에 파일 기반 API 동기화 지원
- Vitest + React Testing Library 단위 테스트, Playwright E2E 샘플 포함

## 사용 방법
```bash
# 의존성 설치
npm install

# API 서버(포트 4000)와 프론트엔드 동시 실행
npm run dev:full
# 또는
npm run dev:server  # API 서버만 실행
npm run dev         # 프론트엔드만 실행 (프록시를 통해 API 서버와 통신)

# 타입 검사 및 번들 빌드
npm run build

# 단위 테스트 실행
npm run test

# E2E 테스트 실행 (API 서버 필요)
npm run test:e2e
```

### 데이터 영속화
- 모든 업무 데이터는 API 서버가 관리하며 `server/data/app-state.json` 파일에 JSON 형태로 저장됩니다. 서버를 다른 PC에서 띄우면 동일한 데이터 파일을 공유해 여러 사용자가 동시에 접근할 수 있습니다.
- API 엔드포인트: `GET/PUT/DELETE /api/app-state`. 필요 시 `VITE_API_BASE_URL` 환경 변수로 엔드포인트 베이스 URL을 변경할 수 있습니다.
- 앱은 최초 접속 시 서버에 데이터가 없으면 초기 시드 데이터를 자동으로 업로드하고, 이후 변경 사항을 실시간 브로드캐스트 채널로 동기화합니다.
- 동기화 상태는 헤더 우측에서 확인할 수 있으며, 마지막 동기화 시각과 서버/캐시 여부를 표시합니다.
- 로그인 세션은 여전히 브라우저에 저장되어 새로고침 후에도 유지됩니다. (서버 단 세션 관리가 필요한 경우 별도 구현이 필요합니다.)

## 테스트 계정
- **관리자**: 비밀번호 `admin1234`
- **일반 사용자**: 아이디 `jdoe`, 비밀번호 `password1`

## 라이선스
프로젝트 예제 용도로 작성되었습니다.
