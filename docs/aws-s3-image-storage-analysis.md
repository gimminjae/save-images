# AWS S3 이미지 저장 방식 분석

## 요약

현재 프로젝트는 브라우저가 presigned URL을 먼저 발급받고, 이미지를 S3에 직접 업로드한 뒤, 업로드된 공개 URL과 S3 오브젝트 키를 `Supabase`의 `memories` 테이블에 저장하는 구조입니다.

- 이미지 파일 저장소: AWS S3
- 메타데이터 저장소: Supabase Postgres
- 공개 조회 경로: `/api/memories`
- S3 업로드 prefix: `hanmong/`

## 관련 파일

- `components/image-upload-console.tsx`
- `app/api/memories/route.ts`
- `app/api/memories/presign/route.ts`
- `app/api/admin/memories/[id]/route.ts`
- `app/api/admin/memories/presign/route.ts`
- `lib/aws/s3.ts`
- `lib/direct-upload-client.ts`
- `lib/supabase/memories.ts`

## 업로드 흐름

1. 사용자가 `/upload` 페이지 또는 `/images` 관리 화면에서 이미지를 선택합니다.
2. 브라우저가 `POST /api/memories/presign` 또는 `POST /api/admin/memories/presign` 으로 presigned URL을 요청합니다.
3. 서버가 파일 형식과 용량을 검증하고 `hanmong/YYYY-MM-DD/...` 형식의 S3 키와 업로드 토큰을 발급합니다.
4. 브라우저가 발급받은 presigned URL로 이미지를 S3에 직접 `PUT` 업로드합니다.
5. 브라우저가 `POST /api/memories` 또는 `PATCH /api/admin/memories/:id` 로 업로드 결과 메타데이터를 저장합니다.
6. 서버가 업로드 토큰을 검증한 뒤 `lib/supabase/memories.ts`를 통해 Supabase 레코드를 생성하거나 수정합니다.

## S3 키 형식

예시:

```text
hanmong/2026-07-14/my-photo-a1b2c3d4.jpg
```

즉, 기존 `memories/...` 루트 대신 `hanmong/...` 아래로 저장됩니다.

## 공개 URL 생성 방식

`lib/aws/s3.ts`의 `getPublicAssetUrl()`이 URL을 계산합니다.

1. `NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL`가 있으면 그 값을 기준으로 조합
2. 없으면 버킷명과 리전으로 기본 S3 공개 URL 조합

## Supabase 저장 필드

`public.memories` 테이블에는 아래 값이 저장됩니다.

- `id`
- `name`
- `nickname`
- `department`
- `description`
- `image_url`
- `image_key`
- `image_width`
- `image_height`
- `status`
- `is_visible`
- `is_deleted`
- `created_at`
- `updated_at`

## 수정과 삭제

- 관리자 수정 시 새 이미지를 올리면 브라우저가 새 파일을 S3에 직접 업로드한 뒤 Supabase 레코드를 갱신합니다.
- 갱신이 성공하면 이전 S3 파일 삭제를 시도합니다.
- 갱신이 실패하면 방금 업로드한 새 S3 파일을 롤백 삭제합니다.
- 관리자 삭제 시 Supabase 레코드를 지운 뒤 S3 파일 삭제를 시도합니다.

## 직접 업로드 전제 조건

S3 버킷 CORS에서 브라우저의 `PUT` 요청이 허용되어야 합니다.

- 허용 메서드: `PUT`, `GET`, `HEAD`
- 허용 헤더: `Content-Type`, `Cache-Control`
- 허용 Origin: 실제 서비스 도메인, `http://localhost:3000`

## 실시간 전시 화면

예전 Firebase 실시간 구독 대신, 현재는 `components/display-slideshow.tsx`가 `/api/memories`를 주기적으로 조회해 전시 목록을 갱신합니다.
