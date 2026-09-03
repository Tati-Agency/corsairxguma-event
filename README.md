# CORSAIR × GUMAYUSI — Event Landing Page

Landing page check-in sự kiện, theo design system Corsair (đen `#050505` / vàng `#FFD400`,
font Saira Condensed + Barlow). Headline tiếng Anh phong cách Corsair, nội dung thân tiếng Việt.

## Techstack

| Thành phần | Công nghệ | Chi phí |
|---|---|---|
| Frontend + API | Next.js 15 (App Router, TypeScript) + Tailwind v4 | Vercel Hobby — free |
| Database | Appwrite — TablesDB: `events`, `checkins`, `visit_logs` | Gói Pro hiện có — $0 thêm |
| Lưu ảnh check-in | Appwrite — Storage bucket `event-photos` (private) | Cùng project |
| QR trên Event Pass | `qrcode` (client-side canvas) | — |

- **Chịu tải:** trang landing render tĩnh (SSG) qua Vercel CDN — 500 users đồng thời là bài toán đọc, không vấn đề.
- **Chống sốc mạng:** nén ảnh client-side ≤300KB, retry 4 lần với exponential backoff, rate limit server-side.
- **Đa event:** mọi bảng có `event_id` — event mới chỉ cần thêm 1 dòng trong collection `events`.

## Cấu trúc

```
src/
├─ app/
│  ├─ page.tsx                 # Landing (static)
│  ├─ admin/page.tsx           # Dashboard bảo vệ bằng ADMIN_KEY
│  └─ api/
│     ├─ checkin/route.ts      # POST — validate, dedupe, upload ảnh, sinh player_code
│     ├─ track/route.ts        # POST — ghi visit log (dedupe theo session)
│     └─ admin/                # stats / checkins / export CSV / photo proxy
├─ components/                 # Nav, Hero, Intro, Journey, Arena, Checkin, EventPass…
└─ lib/                        # appwrite client, UA parser, rate limit, compress, retry
```

## Setup

### 1. Appwrite (project Pro sẵn có)

Trong project Appwrite, tạo:

1. **Database** `event_db` (hoặc tên bất kỳ → điền vào env)
2. **Collections** (attributes xem chi tiết bên dưới):
   - `checkins`
   - `visit_logs`
   - `events` (cho multi-event sau này)
3. **Storage bucket** `event-photos` — **private**, cho phép upload qua API key.
   Vai trò: không cho quyền đọc public nào.
4. **API key** với scopes: `documents.*`, `files.*`, `buckets.read`.

**`checkins`** (string unless noted): `event_id` (256, index), `player_code` (16,
unique index theo `event_id + player_code`), `full_name` (256), `phone` (16,
unique index theo `event_id + phone`), `email` (256), `photo_file_id` (256),
`session_hash` (64), `consent` (boolean), `user_agent` (256).

**`visit_logs`**: `event_id` (256, index), `session_id` (64, index), `session_hash`
(64), `device` (16, enum mobile/tablet/desktop), `browser` (32), `os` (32),
`referrer` (256).

**`events`**: `slug` (64, unique), `name` (256), `status` (16), `starts_at`
(datetime), `venue` (256).

### 2. Environment variables

```bash
cp .env.example .env.local
# điền APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
# đặt ADMIN_KEY và IDENTITY_SALT là chuỗi random dài
```

### 3. Chạy

```bash
npm run dev      # dev — http://localhost:3000
npm run build && npm run start   # production check
```

Admin: `http://localhost:3000/admin` — nhập `ADMIN_KEY`.

### 4. Deploy Vercel

1. Push repo lên GitHub → import vào Vercel.
2. Thêm toàn bộ biến env trong `.env.example` vào Project Settings → Environment Variables.
3. Deploy. QR in ấn trỏ về URL landing.

## Đóng gói sau sự kiện

1. `/admin` → **⬇ CSV Check-in** + **⬇ CSV Analytics** (Excel đọc được UTF-8, có BOM).
2. Tải ảnh: qua `/admin` hoặc dùng Appwrite Console → bucket `event-photos`.
3. Xoá documents của `event_id` tương ứng + xoá files trong bucket → sạch sẽ, không ảnh hưởng project chính.

## Ghi chú bảo mật

- Appwrite API key **chỉ** tồn tại server-side (API routes) — không bao giờ xuống bundle.
- IP không lưu thô — chỉ hash SHA-256 (salt bằng `IDENTITY_SALT`), đủ để đếm unique.
- Bot User-Agent bị lọc ở cả `/api/track` và `/api/checkin`.
- Admin auth: shared key qua header `x-admin-key` (query `?k=` chỉ dùng cho `<img>`).
- Rate limit: check-in 8 req/phút/IP, track 30 req/phút/IP (in-memory, per-instance).
- Dedupe chuẩn vẫn là unique index `event_id + phone` trên DB.
