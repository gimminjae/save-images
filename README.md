# 구리교회 추억 전시관

카테고리 기반 이미지 업로드, 메인 전시 노출, 대표 이미지 관리, 관리자 수정/삭제를 지원하는 Next.js 앱입니다.

## 현재 저장 구조

- 이미지 바이너리: AWS S3
- 메타데이터: Supabase Postgres
- 전시 화면 자동 갱신: `/api/memories` 폴링

S3 업로드 키는 모두 `hanmong/...` 경로 아래에 생성됩니다.

## 실행 방법

1. 의존성 설치

```bash
yarn install
```

2. 환경변수 작성

```bash
cp .env.example .env.local
```

필수 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

NEXT_PUBLIC_AWS_REGION=
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=
NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL=

UPLOAD_ACCESS_PASSWORD=
MANAGE_ACCESS_PASSWORD=
```

- 이 프로젝트는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 만으로 Supabase를 사용합니다.
- 업로드, 카테고리 관리, 이미지 수정/삭제 보호는 Supabase 서버 키가 아니라 앱의 `UPLOAD_ACCESS_PASSWORD`, `MANAGE_ACCESS_PASSWORD` Basic Auth로 동작합니다.

3. Supabase SQL 적용

`supabase/migrations/20260714230000_add_gallery_features.sql` 내용을 Supabase SQL Editor 또는 마이그레이션으로 적용합니다.
이 SQL은 `memories` 테이블이 아직 없는 새 프로젝트 기준으로 `categories`와 `memories`를 처음부터 생성합니다.

이미 이미그레이션을 적용한 프로젝트라면 아래 정책 보정 SQL도 추가로 적용해 주세요.

- `supabase/migrations/20260715002000_enable_publishable_key_crud.sql`

4. 개발 서버 실행

```bash
yarn dev
```

## 비밀번호 보호

- `/upload`, `POST /api/memories`, `POST /api/memories/presign` 는 `UPLOAD_ACCESS_PASSWORD` 로 보호됩니다.
- `/category`, `/images`, `/admin`, 관리자 수정/삭제 API, 카테고리 쓰기 API는 `MANAGE_ACCESS_PASSWORD` 로 보호됩니다.
- 브라우저에서 접근할 때 Basic Auth 입력창으로 비밀번호를 받습니다.

## 주요 경로

- `/` : 메인 페이지, 메인 노출 이미지와 카테고리 대표 이미지 표시
- `/gallery` : 모든 공개 이미지
- `/upload` : 단건/다건 이미지 업로드
- `/category` : 카테고리 생성, 수정, 삭제
- `/images` : 이미지 검색, 수정, 삭제, 카테고리/대표/메인 설정
- `/display` : 전시 슬라이드
- `/download` : 이미지 다운로드
- `/admin` : `/images` 로 리다이렉트

## API

- `GET /api/memories` : 공개 목록 조회
- `POST /api/memories/presign` : 브라우저 직접 S3 업로드용 presigned URL 발급
- `POST /api/memories` : 업로드 완료된 이미지 메타데이터를 Supabase 저장
- `GET /api/categories/tree` : 카테고리 트리 조회
- `POST /api/categories` : 카테고리 생성
- `PATCH /api/categories/:id` : 카테고리 수정
- `DELETE /api/categories/:id` : 카테고리 삭제
- `POST /api/admin/memories/presign` : 관리자 이미지 교체용 presigned URL 발급
- `PATCH /api/admin/memories/:id` : 이름, 카테고리, 대표 이미지, 메인 노출, 이미지 파일 수정
- `DELETE /api/admin/memories/:id` : 데이터와 S3 파일 삭제

## S3 CORS

직접 업로드를 쓰려면 S3 버킷 CORS에서 브라우저의 `PUT` 요청을 허용해야 합니다.

- 허용 메서드: `PUT`, `GET`, `HEAD`
- 허용 헤더: `Content-Type`, `Cache-Control`
- 허용 Origin: 실제 서비스 도메인과 로컬 개발 도메인
