# 리마인드 한몽 최종 구현 계획서

작성일: 2026-07-12  
기준 문서:
- `aws-s3-image-storage-analysis.md`
- `리마인드 한몽 프로젝트 계획서`

## 1. 문서 목적

이 문서는 리마인드 한몽 서비스를 실제로 구현하기 위한 최종 기준안이다.  
기존 프로젝트 계획서의 기능 요구사항을 유지하면서, AWS S3 분석 문서에서 확인된 운영 리스크를 반영해 최종 아키텍처, 우선순위, 구현 순서, 데이터 구조를 하나의 실행 문서로 정리한다.

이 문서의 핵심 목표는 다음 세 가지다.

1. 무엇을 1차 버전에서 반드시 구현할지 확정한다.
2. 어떤 기술 구조로 구현할지 더 이상 흔들리지 않도록 결정한다.
3. 개발을 바로 시작할 수 있도록 화면, API, 데이터, 저장 구조, 단계별 작업 항목을 구체화한다.

---

## 2. 최종 한 줄 결론

리마인드 한몽은 `Next.js + Supabase PostgreSQL + AWS S3` 구조로 구현하며, 업로드는 `Presigned URL 기반 브라우저 직접 업로드`, 메타데이터는 `Supabase`, 원본 파일은 `S3`, 갤러리용 썸네일과 미리보기 자산은 `S3 파생 경로`에 저장하는 방식으로 진행한다.

---

## 3. 최종 의사결정 요약

| 항목 | 최종 결정 | 이유 |
|---|---|---|
| 프레임워크 | Next.js App Router + TypeScript | 화면, API, 서버 로직을 한 프로젝트에서 관리하기 쉽다 |
| UI | Tailwind CSS | 빠른 반응형 구현에 적합하다 |
| 데이터베이스 | Supabase PostgreSQL | 계층형 카테고리, 메타데이터 관리, 확장성 측면에서 적합하다 |
| 파일 저장소 | AWS S3 | 대용량 이미지/영상 저장에 적합하다 |
| 업로드 방식 | S3 Presigned PUT URL 직접 업로드 | 서버 중계 업로드 병목을 제거한다 |
| 다운로드 방식 | S3 Presigned GET URL 발급 | 원본 파일을 공개 URL에 직접 노출하지 않는다 |
| 원본 파일 공개 여부 | 비공개 유지 | 보안과 운영 통제를 위해 필요하다 |
| 갤러리 표시 자산 | 썸네일 또는 미리보기 파생 파일 사용 | 목록 화면 성능을 확보한다 |
| 메타데이터 저장 | Supabase `media`, `categories`, `upload_sessions` 테이블 | 조회와 운영 관리가 단순해진다 |
| 1차 범위 | 업로드, 카테고리, 갤러리, 상세 보기, 개별 다운로드, 관리 화면 | 서비스 핵심 가치를 가장 빠르게 제공한다 |
| 2차 범위 | 다중 다운로드 ZIP, 고급 영상 썸네일 생성, 다국어 확장, CloudFront 고도화 | 초기 복잡도를 낮추고 안정적으로 확장한다 |

---

## 4. 기존 구조에서 반드시 바꿔야 하는 점

AWS S3 분석 문서 기준 기존 구조는 `Next.js API 서버 중계 업로드 + Firebase Realtime Database + 공개 S3 URL 의존` 방식이다.  
최종 구현에서는 아래 항목을 반드시 변경한다.

### 4.1 저장소 메타데이터 구조 변경

- 기존: Firebase Realtime Database
- 최종: Supabase PostgreSQL

이유:
- 계층형 카테고리 구조를 더 안정적으로 관리할 수 있다.
- 정렬, 필터, 페이지네이션, 재귀 조회, 운영용 집계가 수월하다.
- 향후 다른 행사 확장에도 유리하다.

### 4.2 업로드 방식 변경

- 기존: 브라우저 -> Next.js API -> S3
- 최종: 브라우저 -> Presigned URL -> S3 직접 업로드

이유:
- 대용량 영상 업로드 시 서버 병목을 줄인다.
- 서버리스 요청 크기 제한과 실행 시간 제한을 피할 수 있다.
- 진행률 표시와 재시도가 쉬워진다.

### 4.3 공개 URL 의존 제거

- 기존: 업로드 후 공개 S3 URL을 저장하고 화면과 다운로드가 모두 그 URL에 의존
- 최종: 원본은 비공개 S3 객체로 저장하고, 화면 표시는 파생 자산 또는 서명된 접근 방식으로 처리

이유:
- 공개 URL이 남아 있으면 접근 제어와 폐기 관리가 어렵다.
- 운영 정책을 바꿔도 구조를 유지하기 어렵다.

### 4.4 환경 변수 명명 정리

- 기존처럼 `NEXT_PUBLIC_AWS_ACCESS_KEY_ID` 같은 이름은 사용하지 않는다.
- 서버 전용 환경 변수만 사용한다.

최종 예시:

```env
AWS_REGION=
AWS_S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 5. 최종 범위 정의

## 5.1 1차 버전(MVP) 범위

1차 버전에서 반드시 구현할 항목은 아래와 같다.

- 사진 업로드
- 영상 업로드
- 다중 파일 업로드
- 업로드 진행률 표시
- 업로드 실패 및 재시도
- 계층형 카테고리 생성, 수정, 삭제, 이동
- 카테고리별 미디어 목록 조회
- 갤러리 목록 화면
- 사진 상세 보기
- 영상 상세 보기
- 개별 파일 다운로드
- 관리 화면에서 미디어 수정 및 삭제
- 기본 반응형 UI
- 기본 운영 보호 장치

## 5.2 1차 버전에서 포함하지만 단순화하는 항목

- 영상 썸네일은 1차에서 단순한 방식으로 처리한다.
  - 우선순위 1: 업로드 시 클라이언트 추출 포스터 업로드
  - 우선순위 2: 포스터가 없으면 기본 플레이스홀더 사용
- 이미지 미리보기는 원본 대신 파생 이미지 사용을 기본으로 한다.
- 다운로드는 개별 파일 우선 구현한다.

## 5.3 2차 버전으로 미루는 항목

- 여러 파일 ZIP 다운로드
- 카테고리 단위 대량 다운로드
- 영상 자동 썸네일/트랜스코딩 파이프라인
- HLS 변환
- 사용자 로그인/권한 체계
- 댓글, 반응, SNS 공유
- 다국어 전체 적용
- AI 분류

---

## 6. 목표 사용자 경험

서비스는 참가자가 사진과 영상을 쉽게 찾고, 보고, 내려받는 경험에 집중한다.

핵심 UX 원칙:

- 모바일 우선
- 업로드 과정은 최대한 짧고 직관적으로 구성
- 카테고리 경로를 항상 보여 주어 현재 위치를 잃지 않도록 설계
- 목록 화면은 빠르게 열리고, 상세 화면 진입 시 더 큰 자산을 불러오는 구조 사용
- 관리 기능은 별도 비공개 경로로 제공

---

## 7. 최종 시스템 아키텍처

```text
사용자 브라우저
    ├─ 페이지 조회
    │    └─ Next.js App Router
    ├─ 업로드 시작 요청
    │    └─ Next.js API
    ├─ 원본 파일 직접 업로드
    │    └─ AWS S3 Presigned PUT URL
    ├─ 업로드 완료 통지
    │    └─ Next.js API
    └─ 다운로드 요청
         └─ Next.js API -> S3 Presigned GET URL

Next.js
    ├─ Supabase PostgreSQL
    └─ AWS S3
```

### 7.1 구성 요소별 역할

#### Next.js

- 서비스 페이지 렌더링
- 업로드 요청 검증
- Presigned URL 발급
- 업로드 완료 처리
- 다운로드 URL 발급
- 카테고리 및 미디어 관리 API 제공

#### Supabase PostgreSQL

- 카테고리 구조 저장
- 미디어 메타데이터 저장
- 업로드 세션 추적
- 상태 관리와 운영용 조회 처리

#### AWS S3

- 이미지 및 영상 원본 저장
- 썸네일, 포스터, 미리보기 자산 저장
- 업로드 대상 버킷 역할 수행

---

## 8. 저장 구조 최종안

## 8.1 S3 버킷 구조

버킷은 행사 확장을 고려해 이벤트 단위 prefix를 포함한다.

```text
remind-hanmong/
└─ events/
   └─ {event-slug}/
      ├─ originals/
      │  ├─ images/{yyyy}/{mm}/{media-id}.{ext}
      │  └─ videos/{yyyy}/{mm}/{media-id}.{ext}
      ├─ derived/
      │  ├─ images/thumbs/{yyyy}/{mm}/{media-id}.webp
      │  ├─ images/previews/{yyyy}/{mm}/{media-id}.webp
      │  └─ videos/posters/{yyyy}/{mm}/{media-id}.jpg
      └─ temporary/
         └─ uploads/{upload-session-id}/{file-id}
```

### 8.2 공개 정책

- `originals/*`는 비공개 유지
- `derived/*`는 서비스 정책에 따라 두 가지 중 하나를 선택한다
  - 기본안: 공개 읽기 허용 또는 CDN 공개 배포
  - 대안: API를 통해 짧은 수명의 서명 URL 발급

최종 구현에서는 초기 복잡도를 낮추기 위해 `derived/*`는 공개 접근 가능 자산으로 운영하고, `originals/*`만 비공개로 유지한다.

이유:
- 갤러리 목록과 이미지 상세 페이지 성능을 안정적으로 확보할 수 있다.
- 다운로드 원본만 통제하면 운영 리스크를 크게 줄일 수 있다.

---

## 9. 데이터베이스 설계 최종안

## 9.1 `categories`

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | 카테고리 ID |
| event_slug | text | 행사 식별값 |
| parent_id | uuid, nullable | 상위 카테고리 ID |
| name | text | 카테고리명 |
| slug | text | URL 식별값 |
| description | text, nullable | 설명 |
| cover_media_id | uuid, nullable | 대표 미디어 |
| sort_order | integer | 정렬 순서 |
| depth | integer | 깊이 |
| path | text | 경로 문자열 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |

권장 인덱스:

- `(event_slug, parent_id, sort_order)`
- `(event_slug, path)`
- `(event_slug, slug)`

## 9.2 `media`

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | 미디어 ID |
| event_slug | text | 행사 식별값 |
| category_id | uuid | 소속 카테고리 |
| media_type | text | `image` 또는 `video` |
| title | text | 표시 제목 |
| description | text, nullable | 설명 |
| original_filename | text | 원본 파일명 |
| original_extension | text | 확장자 |
| mime_type | text | MIME 타입 |
| file_size | bigint | 파일 크기 |
| checksum | text, nullable | 중복 검사용 해시 |
| width | integer, nullable | 가로 길이 |
| height | integer, nullable | 세로 길이 |
| duration_seconds | numeric, nullable | 영상 길이 |
| original_s3_key | text | 원본 S3 키 |
| preview_s3_key | text, nullable | 이미지 미리보기 키 |
| thumbnail_s3_key | text, nullable | 목록용 썸네일 키 |
| poster_s3_key | text, nullable | 영상 포스터 키 |
| status | text | `pending`, `uploading`, `processing`, `ready`, `failed`, `deleted` |
| upload_session_id | uuid, nullable | 업로드 세션 ID |
| captured_at | timestamptz, nullable | 촬영일 |
| created_at | timestamptz | 생성일 |
| updated_at | timestamptz | 수정일 |
| deleted_at | timestamptz, nullable | 소프트 삭제 시각 |

권장 인덱스:

- `(event_slug, category_id, created_at desc)`
- `(event_slug, media_type, created_at desc)`
- `(event_slug, status)`
- `(checksum)`

## 9.3 `upload_sessions`

| 필드 | 타입 | 설명 |
|---|---|---|
| id | uuid | 업로드 세션 ID |
| event_slug | text | 행사 식별값 |
| category_id | uuid | 대상 카테고리 |
| total_files | integer | 전체 파일 수 |
| completed_files | integer | 완료 파일 수 |
| failed_files | integer | 실패 파일 수 |
| status | text | `pending`, `uploading`, `processing`, `completed`, `failed`, `cancelled` |
| created_at | timestamptz | 생성일 |
| completed_at | timestamptz, nullable | 완료일 |

---

## 10. 카테고리 구조 구현 방식

최종안에서는 `parent_id + depth + path` 조합을 사용한다.

이유:

- 무제한 하위 카테고리를 지원할 수 있다.
- 경로 표시가 쉽다.
- 재귀 조회와 단순 조회를 적절히 혼합할 수 있다.
- 운영자가 카테고리를 이동할 때 영향 범위를 계산하기 쉽다.

규칙:

- 루트 카테고리의 `parent_id`는 `null`
- `path`는 slug 기준으로 저장
- 카테고리 이동 시 자신과 모든 하위 카테고리의 `path`, `depth`를 함께 갱신

예시:

```text
/16th-retreat/day-2/culture-exchange/mongol-performance
```

---

## 11. 업로드 처리 방식 최종안

## 11.1 업로드 흐름

```text
1. 사용자가 카테고리와 파일을 선택
2. 브라우저가 서버에 presign 요청
3. 서버가 파일 형식/크기/카테고리 유효성 검증
4. 서버가 upload_session과 임시 media 레코드 생성
5. 서버가 각 파일별 S3 Presigned PUT URL 반환
6. 브라우저가 원본 파일을 S3에 직접 업로드
7. 브라우저가 업로드 완료 결과를 서버에 전달
8. 서버가 media 상태를 processing 또는 ready로 갱신
9. 파생 자산 생성 또는 검증 처리
10. 최종적으로 media 상태를 ready로 변경
```

## 11.2 파일 검증 기준

### 이미지

- 허용 형식: `jpg`, `jpeg`, `png`, `webp`, `heic`
- 기본 최대 크기: `20MB`

### 영상

- 허용 형식: `mp4`, `mov`, `webm`
- 기본 최대 크기: `1GB`

### 공통 검증

- MIME 타입 검증
- 확장자 검증
- 파일 크기 검증
- 카테고리 존재 여부 검증
- 파일 수 제한 검증

## 11.3 썸네일 및 미리보기 생성 전략

초기 구현은 안정성과 개발 속도를 고려해 아래처럼 단계화한다.

### 이미지

- 업로드 완료 후 서버가 `sharp`로 다음 파생 파일 생성
  - 목록용 `thumbnail`
  - 상세 보기용 `preview`
- 생성이 끝나면 `status=ready`

### 영상

- 1차 버전에서는 다음 순서로 처리
  1. 클라이언트가 가능하면 포스터 프레임을 추출해 함께 업로드
  2. 실패하면 기본 플레이스홀더 포스터 사용
  3. 원본 영상은 상세 페이지에서 직접 재생
- 2차 버전에서 AWS Lambda + FFmpeg 기반 자동 포스터 생성 검토

이 결정으로 1차 버전에서 영상 업로드와 재생은 제공하되, 서버 인프라 복잡도는 통제한다.

---

## 12. 다운로드 처리 방식 최종안

다운로드는 원본 파일 기준으로 처리한다.

### 개별 다운로드 흐름

1. 사용자가 다운로드 버튼 클릭
2. 서버가 대상 `media` 레코드 조회
3. 서버가 `original_s3_key` 기준 Presigned GET URL 생성
4. 브라우저를 해당 URL로 이동시키거나 응답으로 전달

규칙:

- URL 유효시간은 짧게 유지한다
  - 권장: 1분 ~ 5분
- 다운로드 시 `original_filename`을 반영한다
- 삭제되었거나 준비되지 않은 미디어는 다운로드를 막는다

### 2차 확장

- 여러 파일 선택 후 ZIP 다운로드
- 카테고리 단위 다운로드

ZIP 다운로드는 서버 부하가 크므로 1차 범위에서 제외한다.

---

## 13. 화면 구성 최종안

## 13.1 공개 화면

### `/`

- 프로젝트 소개
- 대표 이미지 또는 대표 카테고리
- 최근 업로드 미디어
- 주요 카테고리 바로가기
- 업로드 바로가기

### `/gallery`

- 전체 미디어 목록
- 이미지/영상 필터
- 최신순/오래된순/이름순 정렬
- 페이지네이션 또는 무한 스크롤

### `/categories/[...slug]`

- 현재 카테고리명
- breadcrumb 경로
- 하위 카테고리 목록
- 해당 카테고리 미디어 목록
- 필터 및 정렬

### `/media/[id]`

- 이미지 상세 또는 영상 플레이어
- 제목
- 카테고리
- 업로드일
- 파일 크기
- 다운로드 버튼
- 이전/다음 미디어 이동

### `/upload`

- 파일 선택
- 드래그 앤 드롭
- 선택 파일 목록
- 대상 카테고리 선택
- 업로드 진행률
- 성공/실패 상태
- 실패 파일 재시도

## 13.2 관리 화면

### `/manage`

- 전체 미디어 수
- 최근 업로드 현황
- 저장 용량 요약
- 실패한 업로드 확인

### `/manage/categories`

- 카테고리 생성, 수정, 삭제
- 정렬 순서 변경
- 이동
- 대표 이미지 지정

### `/manage/media`

- 미디어 검색
- 수정
- 삭제
- 카테고리 변경
- 상태 확인

---

## 14. API 구성 최종안

## 14.1 업로드

### `POST /api/uploads/presign`

역할:
- 업로드 요청 검증
- `upload_session` 생성
- 파일별 임시 `media` 레코드 생성
- S3 Presigned PUT URL 반환

### `POST /api/uploads/complete`

역할:
- 업로드 완료 결과 반영
- 성공 파일 상태를 `processing` 또는 `ready`로 변경
- 파생 자산 생성 작업 시작

### `POST /api/uploads/cancel`

역할:
- 업로드 세션 취소
- 미완료 임시 레코드 정리

## 14.2 카테고리

### `GET /api/categories/tree`

- 전체 카테고리 트리 조회

### `POST /api/categories`

- 카테고리 생성

### `PATCH /api/categories/[id]`

- 카테고리 이름, 설명, 정렬, 부모 변경

### `DELETE /api/categories/[id]`

- 카테고리 삭제

## 14.3 미디어

### `GET /api/media`

- 목록 조회
- 카테고리, 미디어 타입, 정렬, 페이지네이션 지원

### `GET /api/media/[id]`

- 상세 조회

### `PATCH /api/manage/media/[id]`

- 제목, 설명, 카테고리 등 수정

### `DELETE /api/manage/media/[id]`

- 소프트 삭제 후 S3 객체 정리 작업 수행

## 14.4 다운로드

### `POST /api/downloads/presign`

- 개별 다운로드용 Presigned GET URL 반환

---

## 15. 삭제와 교체 처리 원칙

기존 분석 문서에서 가장 큰 운영 리스크 중 하나는 orphan 파일이다.  
최종 구현에서는 아래 원칙을 적용한다.

### 15.1 삭제 처리

1. 대상 미디어를 `deleted` 예정 상태로 표시
2. S3 원본 및 파생 자산 삭제 시도
3. 성공 시 `deleted_at` 반영 또는 완전 삭제
4. 실패 시 재처리 가능한 상태로 기록

즉, 단순히 DB를 먼저 지우는 방식은 사용하지 않는다.

### 15.2 교체 처리

1. 새 파일 업로드 완료
2. 새 레코드 또는 새 S3 키 준비
3. DB 참조를 새 파일로 전환
4. 이전 파일 삭제 예약

이 방식으로 참조가 끊긴 파일과 화면 깨짐을 줄인다.

### 15.3 정리 작업

- 실패한 업로드 세션 정리 배치
- `deleted` 상태 장기 보관 객체 정리 배치
- S3와 DB 불일치 검사용 운영 스크립트

---

## 16. 보안 및 운영 정책

## 16.1 필수 보안 원칙

- AWS 비밀키는 서버 전용 환경 변수로만 관리
- S3 버킷 퍼블릭 쓰기 금지
- 원본 파일은 비공개 저장
- 업로드 및 다운로드는 Presigned URL 사용
- 서버 측 입력 검증 적용
- 허용 MIME 타입과 확장자만 통과
- 파일 크기 제한 적용

## 16.2 로그인 없이 운영할 때의 최소 보호 장치

로그인 기능이 1차 범위에 없으므로 아래 중 최소 하나는 반드시 적용한다.

- 업로드 페이지 공용 비밀번호
- 관리 화면 비공개 경로 + 추가 비밀번호
- 업로드 가능 기간 제한
- 행사 종료 후 업로드 기능 비활성화
- Cloudflare Access 같은 외부 접근 통제

최종 구현에서는 최소한 아래 두 가지를 권장한다.

1. `/upload`, `/manage` 경로에 간단한 비밀번호 보호
2. 운영 종료 후 업로드 비활성화 토글

---

## 17. 비기능 요구사항

## 17.1 성능

- 목록은 원본이 아니라 썸네일 사용
- 이미지 지연 로딩 적용
- 페이지네이션 기본 적용
- 서버는 파일 바이너리를 중계하지 않음

## 17.2 안정성

- 업로드 실패 시 파일별 재시도 지원
- 업로드 세션 상태 저장
- 파생 자산 생성 실패 시 `failed` 상태 기록
- 삭제 실패 객체 재처리 가능 상태 유지

## 17.3 확장성

- `event_slug` 기준 다중 행사 지원
- 카테고리 무제한 깊이
- 다국어 확장 가능한 텍스트 구조

## 17.4 호환성

- 최신 Chrome
- 최신 Safari
- 최신 Edge
- iOS Safari
- Android Chrome

---

## 18. 권장 폴더 구조

```text
src/
├─ app/
│  ├─ page.tsx
│  ├─ gallery/
│  ├─ categories/
│  ├─ media/
│  ├─ upload/
│  ├─ manage/
│  └─ api/
│     ├─ uploads/
│     ├─ downloads/
│     ├─ categories/
│     └─ media/
├─ components/
│  ├─ common/
│  ├─ layout/
│  ├─ gallery/
│  ├─ media/
│  ├─ upload/
│  └─ manage/
├─ features/
│  ├─ categories/
│  ├─ media/
│  └─ uploads/
├─ lib/
│  ├─ aws/
│  ├─ supabase/
│  ├─ validation/
│  ├─ media/
│  └─ security/
├─ types/
└─ styles/
```

---

## 19. 단계별 구현 순서

## 19.1 1단계: 기본 환경 구성

- Next.js 프로젝트 생성
- TypeScript, ESLint, Tailwind 설정
- Supabase 프로젝트 연결
- AWS S3 버킷 준비
- 환경 변수 구조 정리
- 기본 레이아웃과 라우팅 골격 구성

산출물:

- 실행 가능한 기본 앱
- Supabase 연결 확인
- S3 연결 확인

## 19.2 2단계: 데이터 모델 및 카테고리 기능

- `categories`, `media`, `upload_sessions` 스키마 생성
- 카테고리 CRUD 구현
- 카테고리 트리 조회 구현
- breadcrumb 경로 계산 구현

산출물:

- 카테고리 관리 가능
- 계층 구조 렌더링 가능

## 19.3 3단계: 업로드 파이프라인

- 업로드 화면 구현
- `presign` API 구현
- S3 직접 업로드 연결
- `complete` API 구현
- 업로드 세션 상태 표시 구현

산출물:

- 이미지/영상 직접 업로드 가능
- 진행률과 성공/실패 상태 확인 가능

## 19.4 4단계: 파생 자산과 갤러리

- 이미지 썸네일/미리보기 생성
- 기본 영상 포스터 처리
- 전체 갤러리 구현
- 카테고리별 목록 구현
- 상세 화면 구현

산출물:

- 목록과 상세 화면 동작
- 이미지/영상 표시 가능

## 19.5 5단계: 다운로드와 관리 화면

- 개별 다운로드 URL 발급
- 미디어 수정/삭제 구현
- 관리 대시보드 구현
- 실패 상태 및 정리 흐름 반영

산출물:

- 원본 다운로드 가능
- 관리 화면 운영 가능

## 19.6 6단계: 테스트와 배포

- 모바일 테스트
- 대용량 파일 업로드 테스트
- 브라우저 호환성 테스트
- 실패 시나리오 테스트
- 배포 환경 변수 구성
- Vercel 배포

산출물:

- 운영 배포 가능한 1차 버전

---

## 20. 테스트 우선순위

반드시 검증해야 하는 시나리오는 아래와 같다.

### 업로드

- 이미지 단일 업로드
- 이미지 다중 업로드
- 영상 업로드
- 업로드 중 네트워크 실패 후 재시도
- 허용되지 않은 확장자 차단
- 최대 크기 초과 차단

### 카테고리

- 루트 카테고리 생성
- 하위 카테고리 생성
- 깊은 경로 breadcrumb 표시
- 카테고리 이동 후 path 갱신

### 갤러리

- 목록 필터링
- 정렬 변경
- 모바일 레이아웃 확인
- 상세 페이지 이동

### 다운로드

- 개별 원본 다운로드
- 만료된 URL 처리
- 삭제된 미디어 다운로드 차단

### 관리

- 미디어 삭제 후 S3 정리
- 실패 상태 표시
- 업로드 종료 후 관리 반영

---

## 21. 주요 리스크와 대응 전략

### 리스크 1: 영상 처리 복잡도

대응:

- 1차에서는 원본 재생 + 단순 포스터 전략으로 제한
- 고급 변환은 2차로 분리

### 리스크 2: orphan 파일 누적

대응:

- `upload_sessions` 도입
- 삭제와 교체에 정리 상태 추적
- 배치 정리 작업 추가

### 리스크 3: 무인증 운영의 보안 취약성

대응:

- 업로드/관리 경로 비밀번호 보호
- 업로드 기간 제한
- 원본 비공개 유지

### 리스크 4: 목록 성능 저하

대응:

- 파생 썸네일 사용
- 페이지네이션 기본 적용
- 상세 화면에서만 큰 자산 로드

---

## 22. 최종 구현 착수 기준

아래 항목이 준비되면 구현을 시작한다.

1. 행사 식별값(`event_slug`) 확정
2. S3 버킷 생성 완료
3. Supabase 프로젝트 생성 완료
4. 환경 변수 발급 완료
5. 초기 카테고리 구조 초안 작성 완료
6. 업로드 제한 정책 확정

---

## 23. 최종 결론

리마인드 한몽의 최종 구현은 기존의 단순 공개 URL 기반 업로드/조회 구조가 아니라, `Supabase 메타데이터 + S3 직접 업로드 + 비공개 원본 + 파생 자산 기반 갤러리` 구조로 가야 한다.

이 구조는 다음 요구를 가장 균형 있게 만족한다.

- 사진과 영상의 장기 보관
- 모바일 중심 사용자 경험
- 대용량 업로드 대응
- 향후 행사 확장 가능성
- 초기 개발 복잡도 통제
- 운영 안정성 확보

따라서 실제 개발은 이 문서를 기준으로 `카테고리 -> 업로드 파이프라인 -> 갤러리 -> 다운로드 -> 관리 -> 테스트/배포` 순서로 진행한다.
