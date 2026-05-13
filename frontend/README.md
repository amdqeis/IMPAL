# Frontend Technical Reference

Dokumen ini dibuat sebagai acuan teknis untuk perubahan kode frontend. Isi di bawah berdasarkan kode yang ditemukan di folder `frontend/` saat dokumen ini dibuat.

## 1. Ringkasan Frontend

Frontend ini adalah aplikasi web SiBooking berbasis Next.js untuk reservasi meja/ruangan biliar. Fitur yang ditemukan di kode mencakup landing page, login user, login admin/owner, register, dashboard user, booking dan history user, simulasi payment QRIS, dashboard admin, manajemen booking, cashflow, schedule, data users, profile user/admin/owner, dan laporan owner.

## 2. Tech Stack Frontend

- Framework: Next.js App Router
- Language: TypeScript
- UI: React 19
- Styling: Tailwind CSS v4 melalui `app/globals.css` dan `@tailwindcss/postcss`
- Icon: `lucide-react`
- Image: `next/image`
- Font: `next/font/google` dengan DM Sans, Inter, dan Playfair Display
- Animation: Framer Motion pada dashboard admin, plus CSS keyframes global
- HTTP Client: native `fetch` melalui wrapper `lib/api.ts`
- Form Handling: React Hook Form pada login, register, dan payment user; manual state pada admin users dan owner reports
- Validation: Zod untuk login, register, dan payment user; validasi manual/native HTML pada form lain
- State Management: React local state, Context API untuk toast dan selected branch, localStorage/sessionStorage untuk auth dan branch terpilih, Map module-level untuk cache resource cabang
- Notification: custom toast provider di `components/sibooking/ToastProvider.tsx`

## 3. Struktur Folder Frontend

```text
frontend/
|-- app/
|   |-- admin/
|   |-- owner/
|   |-- user/
|   |-- booking/
|   |-- dashboard/
|   |-- login/
|   |-- payment/
|   |-- register/
|   |-- globals.css
|   |-- layout.tsx
|   |-- page.tsx
|   `-- providers.tsx
|-- components/
|   |-- admin/
|   |-- dashboard/
|   |-- sibooking/
|   `-- user/
|-- data/
|-- lib/
|-- public/
|-- .env.production.example
|-- Dockerfile
|-- eslint.config.mjs
|-- next.config.ts
|-- package.json
|-- postcss.config.mjs
|-- tsconfig.json
`-- README.md
```

Fungsi folder/file penting:

- `app/`: route Next.js App Router.
- `app/layout.tsx`: root layout, font, global CSS, dan provider global.
- `app/providers.tsx`: membungkus aplikasi dengan `ToastProvider`.
- `app/globals.css`: import Tailwind, theme font/color, dan keyframes global.
- `components/sibooking/`: komponen aktif lintas role, terutama `AppShell`, guard auth page, profile, state UI, dan toast.
- `components/admin/`, `components/dashboard/`, `components/user/`: komponen lama/reusable berbasis dummy data. Beberapa tidak ditemukan dipakai oleh page aktif.
- `data/`: dummy data dan type untuk komponen lama.
- `lib/api.ts`: API client, type kontrak backend, auth storage, dan endpoint wrapper.
- `lib/auth.ts`: helper role dan redirect dashboard.
- `lib/use-api-data.ts`: hook fetch sederhana dengan fallback data.
- `lib/use-branch-resource-cache.ts`: cache client-side per branch/resource.
- `lib/fallback-data.ts`: fallback data jika request page-level gagal.
- `public/`: aset gambar/icon lokal.
- `.next/` dan `node_modules/`: hasil build/dependency lokal, bukan source utama.

## 4. Entry Point dan Routing

Routing menggunakan Next.js App Router dari folder `app/`. Middleware route belum ditemukan di kode.

Root layout:

- File: `app/layout.tsx`
- Fungsi: set metadata, load Google fonts, import `globals.css`, membungkus semua page dengan `Providers`.

Route yang ditemukan:

| Route | File | Fungsi | Akses |
|---|---|---|---|
| `/` | `app/page.tsx` | Landing page dengan CTA ke login | Public |
| `/login` | `app/login/page.tsx` + `app/login/login-form.tsx` | Login user biasa | Public, diarahkan ke dashboard jika sudah login |
| `/admin/login` | `app/admin/login/page.tsx` | Login admin/owner memakai `LoginForm mode="admin"` | Public, diarahkan ke dashboard jika sudah login |
| `/register` | `app/register/page.tsx` | Register user baru | Public, diarahkan ke dashboard jika sudah login |
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard statis/legacy dengan data hardcoded | Belum ditemukan guard; kemungkinan public/legacy |
| `/booking` | `app/booking/page.tsx` | Re-export `app/admin/booking/page.tsx` | Protected admin karena page target memakai `AppShell role="admin"` |
| `/payment` | `app/payment/page.tsx` | Re-export `app/user/payment/page.tsx` | Protected user karena page target memakai `AppShell role="user"` |
| `/user/dashboard` | `app/user/dashboard/page.tsx` | Dashboard user, list room/tempat dan jadwal tersedia | User |
| `/user/booking` | `app/user/booking/page.tsx` | Booking aktif user | User |
| `/user/history` | `app/user/history/page.tsx` | History reservasi user | User |
| `/user/payment` | `app/user/payment/page.tsx` | Form booking dan simulasi QRIS payment | User |
| `/user/payment/completed` | `app/user/payment/completed/page.tsx` | Halaman sukses booking | Belum ditemukan guard eksplisit |
| `/user/profile` | `app/user/profile/page.tsx` | Profile user | User |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Ringkasan admin dan booking pending | Admin |
| `/admin/booking` | `app/admin/booking/page.tsx` | Manajemen booking/reservasi cabang | Admin |
| `/admin/cashflow` | `app/admin/cashflow/page.tsx` | List transaksi/payment cabang | Admin |
| `/admin/schedule` | `app/admin/schedule/page.tsx` | Grid jadwal reservasi cabang | Admin |
| `/admin/users` | `app/admin/users/page.tsx` | Manajemen user | Admin |
| `/admin/profile` | `app/admin/profile/page.tsx` | Profile admin | Admin |
| `/owner/reports` | `app/owner/reports/page.tsx` | Manajemen dan download laporan owner | Owner |
| `/owner/profile` | `app/owner/profile/page.tsx` | Profile owner | Owner |

Catatan akses:

- Protected route utama memakai `AppShell role="user" | "admin" | "owner"`.
- Login/register memakai `AuthPageGuard`, bukan middleware server.
- `/dashboard` dan `/user/payment/completed` belum memakai `AppShell` atau guard eksplisit.

## 5. Layout dan Navigasi

### RootLayout

File:

- `app/layout.tsx`

Fungsi:

- Menentukan font global, metadata, body layout, dan `Providers`.

Page yang menggunakan:

- Semua route.

Catatan:

- Root layout tidak melakukan auth guard.

### Providers

File:

- `app/providers.tsx`

Fungsi:

- Membungkus children dengan `ToastProvider`.

Page yang menggunakan:

- Semua route melalui root layout.

### AppShell

File:

- `components/sibooking/AppShell.tsx`

Fungsi:

- Layout utama protected untuk user/admin/owner.
- Menampilkan sidebar desktop, header mobile, menu role, profile link, logout, dan branch dropdown.
- Mengambil daftar cabang dari `api.masterData.listCabang()`.
- Menyimpan branch terpilih di localStorage key `sibooking_selected_branch_id`.
- Menyediakan `useSelectedBranch()` untuk page admin.

Page yang menggunakan:

- Semua route `/user/*` kecuali `/user/payment/completed`.
- Semua route `/admin/*` kecuali `/admin/login`.
- Semua route `/owner/*`.

Catatan penting:

- `AppShell` melakukan redirect client-side berdasarkan role tersimpan.
- `owner` diarahkan ke `/owner/reports`.
- `admin` tidak boleh masuk page owner dan user.
- `user` tidak boleh masuk page admin/owner.
- Jika tidak ada auth tersimpan, diarahkan ke `/login` untuk role user atau `/admin/login` untuk role admin/owner.

### AuthPageGuard

File:

- `components/sibooking/AuthPageGuard.tsx`

Fungsi:

- Dipakai pada halaman login/register.
- Jika token tersimpan valid, memanggil `/auth/me`, refresh storage auth, lalu redirect ke dashboard sesuai role.
- Jika token invalid/expired, auth dibersihkan dan halaman login/register ditampilkan.

Page yang menggunakan:

- `/login`
- `/admin/login`
- `/register`

### BranchDropdown

File:

- Internal component di `components/sibooking/AppShell.tsx`

Fungsi:

- Search dan pilih cabang dari list cabang yang diambil AppShell.

Page yang menggunakan:

- Semua page dalam `AppShell`.

Catatan:

- Filter search cabang dilakukan di frontend terhadap data cabang yang sudah di-fetch.

### ProfileView

File:

- `components/sibooking/ProfileView.tsx`

Fungsi:

- Menampilkan nama, email, dan no HP dari `getStoredAuth()`.

Page yang menggunakan:

- `/user/profile`
- `/admin/profile`
- `/owner/profile`

## 6. Komponen UI

### Layout Components

#### AppShell

File:

- `components/sibooking/AppShell.tsx`

Props:

- `role`
- `children`

Digunakan di:

- Route protected user/admin/owner.

Catatan:

- Jangan mengubah menu/redirect role tanpa mengecek `lib/auth.ts` dan semua route protected.

#### AuthPageGuard

File:

- `components/sibooking/AuthPageGuard.tsx`

Props:

- `children`

Digunakan di:

- `/login`
- `/admin/login`
- `/register`

### Feedback Components

#### ToastProvider dan useToast

File:

- `components/sibooking/ToastProvider.tsx`

Fungsi:

- Notification toast global dengan tipe `success`, `error`, `warning`, dan `info`.

Props:

- `children`

Digunakan di:

- `app/providers.tsx`, login, register, admin booking, admin cashflow, admin users, owner reports, admin schedule.

#### LoadingState, ErrorState, EmptyState

File:

- `components/sibooking/States.tsx`

Fungsi:

- UI reusable untuk loading, error, dan empty state.

Props:

- `LoadingState`: `label`
- `ErrorState`: `message`
- `EmptyState`: `message`

Digunakan di:

- Page user dashboard/booking/history/payment.
- Page admin dashboard/booking/cashflow/schedule/users.
- Page owner reports.

### Form Components

#### LoginForm

File:

- `app/login/login-form.tsx`

Props:

- `mode?: "user" | "admin"`

Digunakan di:

- `/login`
- `/admin/login`

Catatan:

- Validasi memakai React Hook Form + Zod.
- Role validation memakai `isAllowedForLoginMode()`.

#### Inline RegisterField

File:

- `app/register/page.tsx`

Fungsi:

- Field register lokal.

Catatan:

- Bukan komponen reusable lintas file.

### Table/List Components

Komponen tabel/list aktif banyak didefinisikan inline di page:

- `app/admin/booking/page.tsx`: `BookingCard`, `Pagination`, dialog detail/confirm.
- `app/admin/cashflow/page.tsx`: table transaksi, `Pagination`.
- `app/admin/users/page.tsx`: table desktop, mobile cards, `Pagination`.
- `app/admin/schedule/page.tsx`: grid schedule.
- `app/owner/reports/page.tsx`: list report cards.

Catatan:

- Jangan mengubah struktur inline component tanpa mengecek helper transform/filter di file yang sama.

### Legacy/Dummy Components

Folder berikut berisi komponen yang merujuk data dummy dan beberapa belum ditemukan dipakai oleh page aktif:

- `components/admin/booking/`
- `components/admin/dashboard/`
- `components/dashboard/`
- `components/user/booking/`
- `components/user/payment/`

Catatan:

- Beberapa page aktif sudah menulis ulang UI inline dan tidak lagi import komponen dummy tersebut.
- Jika ingin menghapus atau refactor, cek import dengan `rg` terlebih dahulu.

## 7. Integrasi API

| Kebutuhan | Detail |
|---|---|
| API Client | `lib/api.ts` |
| HTTP Client | native `fetch` |
| Base URL | `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"` |
| Auth Header | `Authorization: Bearer <token>` jika `auth` tidak false dan token tersedia |
| Token Storage | `localStorage` atau `sessionStorage`, key `sibooking_token` |
| Auth Data Storage | `localStorage` atau `sessionStorage`, key `sibooking_user` |
| Request Body | JSON via `JSON.stringify(body)` |
| Cache Fetch | default `cache: "no-store"` |
| Error Class | `ApiError` dengan `status` dan `data` |
| Error Message | Ambil `message` atau `detail` dari response JSON, fallback `Request gagal dengan status ...` |
| Blob Download | `requestBlob()` untuk PDF laporan |

Catatan penting:

- `requestPaginatedData()` tetap tersedia untuk kompatibilitas page lama dan mengembalikan `response.data`.
- `requestPaginatedResponse()` dipakai oleh method `*Paginated` agar page bisa membaca `data` dan `pagination`.
- Helper paginated menambahkan default `limit=100` jika query tidak memberi limit.
- Tidak ditemukan interceptor seperti Axios; handling status dilakukan per page atau di `request()`.

## 8. Environment Variables

| Variable | Fungsi | Digunakan di File |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL backend API yang benar-benar dibaca kode | `lib/api.ts` |

Catatan:

- `.env.production.example` sudah memakai `NEXT_PUBLIC_API_URL=/api`, sesuai variable yang dibaca oleh `lib/api.ts`.
- Jangan menaruh secret backend/database di env frontend karena variable `NEXT_PUBLIC_*` terekspos ke browser.

## 9. Auth Flow

### Login Flow

1. User membuka `/login` atau `/admin/login`.
2. `AuthPageGuard` mengecek token tersimpan.
3. Jika token valid, user diarahkan ke dashboard sesuai role.
4. Jika tidak ada token, form login ditampilkan.
5. `LoginForm` mengirim `api.auth.login()` ke `POST /auth/login`.
6. Role dicek dengan `isAllowedForLoginMode()`.
7. Jika role tidak sesuai mode login, auth dibersihkan dan error ditampilkan.
8. Jika berhasil, `persistAuth()` menyimpan token dan auth response ke localStorage jika `rememberMe=true`, atau sessionStorage jika false.
9. User mode diarahkan ke `/user/dashboard`; admin mode diarahkan dengan `getDashboardPathForRoles()`.

Endpoint terkait:

- `POST /auth/login`
- `GET /auth/me`

### Register Flow

1. User membuka `/register`.
2. `AuthPageGuard` mengecek session.
3. Form register divalidasi dengan Zod.
4. Frontend mengirim `api.auth.register()` ke `POST /auth/register`.
5. Auth response disimpan dengan `persistAuth(auth, true)`.
6. User diarahkan ke `/user/dashboard`.

Endpoint terkait:

- `POST /auth/register`

### Protected Route Flow

1. Page protected dibungkus `AppShell role="..."`.
2. `AppShell` membaca `getStoredAuth()`.
3. Jika auth tidak ada, redirect ke `/login` atau `/admin/login`.
4. Jika role tidak sesuai page, redirect ke dashboard role yang benar.
5. AppShell tidak memanggil `/auth/me` saat masuk protected page; validasi utama berdasarkan auth yang tersimpan di browser.

### Logout Flow

1. User klik logout di `AppShell`.
2. `api.auth.logout()` memanggil `clearAuth()`.
3. Token dan auth data di localStorage/sessionStorage dihapus.
4. User diarahkan ke login path sesuai role shell.

### Expired Token Handling

- `AuthPageGuard` membersihkan auth jika `/auth/me` mengembalikan 401.
- Beberapa admin/owner page menangani `ApiError` 401 dengan `clearAuth()` dan redirect ke `/admin/login`.
- User pages yang memakai `useApiData` hanya menampilkan error message dan fallback data; redirect 401 belum ditemukan di user dashboard/booking/history.

## 10. Role-Based Access dan Rendering

| Role | Page yang Dapat Diakses Berdasarkan Kode | UI yang Ditampilkan |
|---|---|---|
| `user` | `/user/dashboard`, `/user/booking`, `/user/history`, `/user/payment`, `/user/profile` | Menu Dashboard, Booking, History, Profile, Logout |
| `admin` | `/admin/dashboard`, `/admin/booking`, `/admin/cashflow`, `/admin/users`, `/admin/schedule`, `/admin/profile` | Menu Dashboard, Booking, Cashflow, Data Users, Schedule, Profile, Logout |
| `owner` | `/owner/reports`, `/owner/profile` | Menu Reports, Profile, Logout |

Cara role disimpan:

- Role disimpan dalam auth response di browser key `sibooking_user`.
- Helper role ada di `lib/auth.ts`.

Route guard:

- `AppShell` melakukan redirect client-side berdasarkan `hasOwnerRole()` dan `hasAdminRole()`.
- `privilegedRoles` berisi `admin` dan `owner`.
- Login user menolak role privileged.
- Login admin menerima `admin` atau `owner`.

Fallback unauthorized:

- Tidak ditemukan halaman unauthorized khusus.
- User diarahkan ke dashboard role yang sesuai.

## 11. Daftar Page dan Fitur

### Landing Page

File:

- `app/page.tsx`

Fungsi:

- Hero/landing public dengan CTA ke `/login`.

API yang digunakan:

- Tidak ada.

State penting:

- Tidak ada.

### Login User

File:

- `app/login/page.tsx`
- `app/login/login-form.tsx`

Fungsi:

- Login user biasa dan menolak akun admin/owner dari login user.

API yang digunakan:

- `POST /auth/login`
- `GET /auth/me` melalui `AuthPageGuard`

State penting:

- `error`
- `showPassword`
- React Hook Form state

### Login Admin/Owner

File:

- `app/admin/login/page.tsx`
- `app/login/login-form.tsx`

Fungsi:

- Login untuk admin dan owner.

API yang digunakan:

- `POST /auth/login`
- `GET /auth/me` melalui `AuthPageGuard`

State penting:

- Sama seperti `LoginForm`.

### Register

File:

- `app/register/page.tsx`

Fungsi:

- Register user baru dan langsung login.

API yang digunakan:

- `POST /auth/register`

State penting:

- `error`
- React Hook Form state

### User Dashboard

File:

- `app/user/dashboard/page.tsx`

Fungsi:

- Menampilkan kartu Regular/VIP Room, daftar tempat, jadwal tersedia, dan link booking.

API yang digunakan:

- `GET /master-data/tempat`
- `GET /jadwal/tersedia`

State penting:

- `tables` dari `useApiData`
- `schedules` dari `useApiData`

Catatan:

- Menggunakan fallback data jika fetch gagal.
- List tempat/jadwal tidak difilter berdasarkan selected branch di AppShell.

### User Booking

File:

- `app/user/booking/page.tsx`

Fungsi:

- Menampilkan reservasi aktif user (`pending`, `confirmed`) dan status payment paid/unpaid.

API yang digunakan:

- `GET /reservasi/` dengan `id_user`
- `GET /pembayaran/`

State penting:

- `reservations`
- `payments`

Catatan:

- `api.pembayaran.list()` tidak diberi filter `id_user`; backend akan membatasi jika user biasa, tetapi frontend tidak eksplisit filter.

### User History

File:

- `app/user/history/page.tsx`

Fungsi:

- Menampilkan semua reservasi user.

API yang digunakan:

- `GET /reservasi/` dengan `id_user`

State penting:

- `reservations`

### User Payment

File:

- `app/user/payment/page.tsx`

Fungsi:

- Form booking, membuat reservasi pending, membuat payment pending, menampilkan QRIS simulasi, lalu mengubah payment menjadi paid dan reservasi menjadi confirmed.

API yang digunakan:

- `GET /master-data/tempat`
- `GET /jadwal/tersedia`
- `POST /reservasi/`
- `POST /pembayaran/`
- `PATCH /pembayaran/{payment_id}/status`
- `PATCH /reservasi/{reservasi_id}/status`

State penting:

- `reservation`
- `payment`
- `error`
- React Hook Form state

Catatan:

- Payment adalah simulasi QRIS. Tidak ditemukan integrasi gateway eksternal.
- Setelah create, ID disimpan di sessionStorage: `sibooking_latest_reservation`, `sibooking_latest_payment`.

### Booking Completed

File:

- `app/user/payment/completed/page.tsx`

Fungsi:

- Halaman sukses booking statis.

API yang digunakan:

- Tidak ada.

Catatan:

- Belum membaca ID booking terbaru dari sessionStorage walaupun payment page menyimpannya.
- Belum ditemukan guard auth eksplisit.

### Admin Dashboard

File:

- `app/admin/dashboard/page.tsx`

Fungsi:

- Menampilkan ringkasan cabang, booking pending mendatang, statistik booking/payment, dan action accept/decline.

API yang digunakan:

- `GET /reservasi/` dengan `status_reservasi=pending`, `start_date`, sort tanggal
- `GET /laporan/summary` dengan `id_cabang`
- `PATCH /reservasi/{reservasi_id}/status`

State penting:

- `summary`
- `summaryLoading`
- `summaryError`
- `busyId`
- `confirmAction`
- `reservations` dari `useApiData`

Catatan:

- Reservasi pending di-fetch secara global lalu difilter per cabang di frontend.
- Summary di-fetch per selected branch.

### Admin Booking

File:

- `app/admin/booking/page.tsx`

Fungsi:

- Manajemen reservasi cabang dengan tab status, search, filter tanggal/payment/room type, detail, accept/decline, dan pagination.

API yang digunakan:

- `GET /reservasi/` dengan `id_cabang`, `tanggal`, `search`
- `GET /pembayaran/` dengan `id_cabang`, `status_pembayaran`, `search`
- `PATCH /reservasi/{reservasi_id}/status`

State penting:

- `activeTab`
- `searchQuery`
- `debouncedSearchQuery`
- `filters`
- `page`
- `confirmAction`
- `detailBooking`
- `branchBookings` dari `useBranchResourceCache`

Catatan:

- Search dikirim ke backend dan juga difilter ulang di frontend.
- Pagination memakai metadata backend saat filter aktif didukung backend.
- Filter payment status dan room type masih client-side, sehingga page fallback mengambil batch lebih besar dan metadata total tidak selalu mewakili filter tersebut.

### Admin Cashflow

File:

- `app/admin/cashflow/page.tsx`

Fungsi:

- Menampilkan transaksi/payment per cabang, income paid, filter tanggal/status/search, dan pagination backend.

API yang digunakan:

- `GET /pembayaran/` dengan `id_cabang`, `status_pembayaran`, `start_date`, `end_date`, `search`

State penting:

- `filters`
- `searchQuery`
- `debouncedSearchQuery`
- `pageState`
- `branchPayments` dari `useBranchResourceCache`

Catatan:

- Query mengirim `page` dan `limit`, lalu UI memakai metadata `pagination`.
- Tombol `+Add Transaction` hanya menampilkan toast bahwa fitur belum tersedia.

### Admin Schedule

File:

- `app/admin/schedule/page.tsx`

Fungsi:

- Menampilkan grid schedule reservasi cabang berdasarkan date range, status, dan search.

API yang digunakan:

- `GET /reservasi/` dengan `id_cabang`, `start_date`, `end_date`, `status_reservasi`, `search`

State penting:

- `dateRange`
- `statusFilter`
- `searchQuery`
- `branchReservations` dari `useBranchResourceCache`

Catatan:

- Status query backend hanya dikirim untuk `pending`, `confirmed`, dan `completed`; status lain seperti cancelled/refunded difilter di frontend dari hasil yang lebih umum.
- Validasi range tanggal manual di `getRangeError()`.

### Admin Users

File:

- `app/admin/users/page.tsx`

Fungsi:

- List users, search, role/status filter, create user, edit user, delete user, pagination backend.

API yang digunakan:

- `GET /auth/users`
- `POST /auth/register`
- `PATCH /auth/users/{user_id}`
- `DELETE /auth/users/{user_id}`

State penting:

- `users`
- `loading`
- `refreshing`
- `error`
- `searchQuery`
- `roleFilter`
- `statusFilter`
- `page`
- `pagination`
- `dialogMode`
- `editingUser`
- `deleteTarget`
- `form`

Catatan:

- Search dan role dikirim ke backend bersama `page`/`limit`.
- Status masih difilter di frontend karena schema backend saat ini mengembalikan status default `Active`.
- Create user memakai endpoint register, sehingga role default mengikuti backend dan frontend tidak menyediakan pemilihan role.
- Delete akun yang sedang digunakan dicegah di frontend.

### Admin/User/Owner Profile

File:

- `app/admin/profile/page.tsx`
- `app/user/profile/page.tsx`
- `app/owner/profile/page.tsx`
- `components/sibooking/ProfileView.tsx`

Fungsi:

- Menampilkan data profile dari auth storage.

API yang digunakan:

- Tidak ada saat render profile.

Catatan:

- Data profile bisa stale karena tidak memanggil `/auth/me`.

### Owner Reports

File:

- `app/owner/reports/page.tsx`

Fungsi:

- List laporan dengan pagination backend, search/filter tipe, request PDF, edit metadata laporan, download PDF.

API yang digunakan:

- `GET /laporan/`
- `POST /laporan/`
- `PATCH /laporan/{laporan_id}`
- `GET /laporan/{laporan_id}/pdf`

State penting:

- `reports`
- `loading`
- `refreshing`
- `error`
- `searchQuery`
- `typeFilter`
- `page`
- `pagination`
- `form`
- `editingReport`
- `busyReportId`

Catatan:

- Query list mengirim `page`, `limit`, `search`, dan `tipe`.
- Download PDF dilakukan dengan Blob URL dan anchor sementara.

### Legacy Static Dashboard

File:

- `app/dashboard/page.tsx`

Fungsi:

- Dashboard statis dengan data hardcoded.

API yang digunakan:

- Tidak ada.

Catatan:

- Belum ditemukan link aktif dari `AppShell` ke route ini.
- Belum ditemukan auth guard.

## 12. Form dan Validasi

| Form | File | Field | Endpoint | Validasi |
|---|---|---|---|---|
| Login | `app/login/login-form.tsx` | `email`, `password`, `rememberMe` | `POST /auth/login` | Zod: email valid, password wajib; role disesuaikan mode login |
| Register | `app/register/page.tsx` | `nama`, `email`, `no_hp`, `password`, `confirmPassword` | `POST /auth/register` | Zod: nama wajib, email valid, no HP 11-12 digit, password min 8, confirm sama |
| User Payment/Booking | `app/user/payment/page.tsx` | `nama`, `no_hp`, `id_tempat`, `id_jadwal`, `tanggal` | `POST /reservasi/`, `POST /pembayaran/` | Zod: nama wajib, no HP min 8, id tempat/jadwal min 1, tanggal wajib |
| Admin Users Create/Edit | `app/admin/users/page.tsx` | `nama`, `email`, `no_hp`, `password` create only | `POST /auth/register`, `PATCH /auth/users/{user_id}` | Manual: nama/email/no_hp wajib, password create min 8; input no_hp min 11 max 12 |
| Admin Booking Filters | `app/admin/booking/page.tsx` | search, tanggal, payment status, room type, status tab | `GET /reservasi/`, `GET /pembayaran/` | Manual state; debounce search 350ms |
| Admin Cashflow Filters | `app/admin/cashflow/page.tsx` | from date, to date, status, search | `GET /pembayaran/` | Manual state; debounce search 350ms; belum ditemukan validasi from <= to |
| Admin Schedule Filters | `app/admin/schedule/page.tsx` | from date, to date, status, search | `GET /reservasi/` | Manual `getRangeError()` untuk tanggal wajib, format valid, from <= to |
| Owner Report Request/Edit | `app/owner/reports/page.tsx` | `tipe`, `lampiran` | `POST /laporan/`, `PATCH /laporan/{laporan_id}` | Manual: tipe wajib, filename dinormalisasi ke `.pdf`; edit lampiran required |

Catatan:

- Backend juga punya validasi, tetapi frontend tidak boleh bergantung hanya pada validasi backend untuk UX.
- Admin Users create lewat register backend bisa gagal jika password backend butuh angka/huruf kapital; frontend hanya mengecek minimal 8.

## 13. Data Fetching dan State Management

Pola fetching yang ditemukan:

- `lib/api.ts` berisi API client global dengan wrapper domain: `auth`, `masterData`, `jadwal`, `reservasi`, `pembayaran`, `laporan`.
- `useApiData(loader, fallback)` fetch on mount, menyimpan fallback saat error.
- `useBranchResourceCache()` fetch/cache data per resource dan selected branch, mendukung foreground/background refetch dan abort controller.
- Beberapa page memakai `useEffect` manual untuk load data, misalnya summary dashboard, users, reports.
- Tidak ditemukan React Query, SWR, Zustand, atau Redux.

State global/client:

- Toast: Context di `ToastProvider`.
- Selected branch: Context di `AppShell` dan localStorage `sibooking_selected_branch_id`.
- Auth: localStorage/sessionStorage via `lib/api.ts`.
- Branch resource cache: Map module-level di `lib/use-branch-resource-cache.ts`.

Data yang di-fetch saat page load:

- `AppShell`: daftar cabang.
- User dashboard/payment: tempat dan jadwal tersedia.
- User booking/history: reservasi user; booking juga payment.
- Admin dashboard: reservasi pending dan summary cabang.
- Admin booking: reservasi dan payment cabang/filter.
- Admin cashflow: payment cabang/filter.
- Admin schedule: reservasi cabang/range.
- Admin users: user list.
- Owner reports: laporan list.

Catatan penting:

- Untuk data besar, frontend tidak boleh mengambil semua data sekaligus.
- Page Admin Users, Admin Cashflow, Owner Reports, dan sebagian state Admin Booking sudah memakai method `*Paginated` untuk membaca metadata pagination backend.
- Page lama yang masih memakai `requestPaginatedData()` hanya menerima array `data` dan belum membaca metadata.
- Banyak page lama masih melakukan pagination client-side. Jika data membesar, ubah API client/page agar memakai `page`, `limit`, dan metadata pagination backend.

## 14. Table, Pagination, Search, dan Filter

| Page | Data | Pagination | Search | Filter | Catatan |
|---|---|---|---|---|---|
| Admin Booking | Reservasi + payment | Backend pagination 9 item/page saat filter didukung backend; fallback client-side untuk filter client-only | Debounce 350ms, dikirim ke backend dan difilter lagi di frontend | status tab, tanggal, payment status, room type, cabang | Payment status/room type masih client-side sehingga metadata total hanya akurat penuh saat filter backend-compatible |
| Admin Cashflow | Payment/transaksi | Backend pagination 8 item/page | Debounce 350ms, dikirim ke backend | date range, status, cabang | Belum validasi date range from <= to |
| Admin Users | Users | Backend pagination 6 item/page | Debounce 350ms, dikirim ke backend | role, status | Status masih difilter frontend karena backend schema saat ini mengembalikan `status: "Active"` |
| Admin Schedule | Reservasi dalam grid | Tidak ada pagination; horizontal scroll | Search langsung dipakai query/cache, tidak debounce | date range, status, cabang | Range tanggal besar bisa membuat grid sangat lebar |
| Owner Reports | Laporan | Backend pagination 8 item/page | Debounce 350ms, dikirim ke backend | tipe laporan | Metadata backend dipakai untuk kontrol pagination |
| User Booking | Reservasi aktif | Belum ada pagination UI | Tidak ada | status aktif di frontend | Bisa berat jika reservasi user banyak |
| User History | Reservasi user | Belum ada pagination UI | Tidak ada | Tidak ada | Bisa berat jika history banyak |
| User Dashboard | Tempat dan jadwal | Belum ada pagination UI | Tidak ada | Tidak ada | Tidak memfilter cabang terpilih |

Rekomendasi:

- Pertahankan query server-side untuk search/filter yang sudah tersedia.
- Untuk list besar, jangan hanya filter array di frontend.
- Jika page baru butuh metadata pagination, gunakan method `*Paginated` atau tambah wrapper yang mengembalikan `PaginatedResponse<T>`.

## 15. Loading, Empty State, Error State, dan Notification

Komponen feedback:

- `LoadingState`: `components/sibooking/States.tsx`
- `ErrorState`: `components/sibooking/States.tsx`
- `EmptyState`: `components/sibooking/States.tsx`
- Toast: `components/sibooking/ToastProvider.tsx`

Pola yang ditemukan:

- Page data besar menampilkan `LoadingState`, `ErrorState`, dan `EmptyState`.
- Admin/owner page memakai toast untuk error dan aksi sukses.
- `ApiError` 401 pada beberapa admin/owner page membersihkan auth dan redirect ke `/admin/login`.
- `AuthPageGuard` menampilkan loading "Memeriksa sesi..." saat validasi token.
- `useApiData` fallback ke data lokal saat request gagal.

Catatan penting:

- Jangan hanya menampilkan "Failed to fetch"; gunakan pesan `ApiError.message` atau fallback yang kontekstual.
- Hati-hati dengan fallback data karena bisa membuat UI terlihat terisi walau API gagal.

## 16. Styling dan Design System

Styling:

- Tailwind CSS v4 diaktifkan via `@import "tailwindcss";` pada `app/globals.css`.
- Tidak ditemukan `tailwind.config.*`.
- Theme inline mendefinisikan `--font-sans` dan `--font-display`.
- Warna banyak ditulis langsung sebagai arbitrary Tailwind color, misalnya `#0F4C3E`, `#174D3D`, `#D3F0D6`, `#F5A400`.
- Banyak card memakai radius 6-14px pada page aktif, tetapi komponen legacy memakai radius besar 20-24px.
- Button dan form style mostly custom className.

Font:

- DM Sans sebagai body font.
- Inter dipakai di `AppShell` section.
- Playfair Display dipakai pada landing/static dashboard/login headline.

Dark mode:

- Belum ditemukan implementasi dark mode.

shadcn/ui:

- Belum ditemukan folder atau generated component shadcn/ui.

Catatan:

- Jaga konsistensi `AppShell` karena menjadi layout aktif lintas role.
- Komponen generated shadcn tidak relevan saat ini.

## 17. Animasi dan Interaksi

Library:

- Framer Motion pada `app/admin/dashboard/page.tsx`.

Animasi CSS:

- `rightVisualEnter`
- `loginFadeUp`
- `floatingIcon`
- `floatingIconSlow`
- `floatingTilt`

Komponen/page yang memakai:

- Landing page memakai floating classes.
- Login/register/admin login memakai login/floating classes.
- Admin dashboard memakai `motion` untuk header, card list, hover, dan modal.
- Toast memakai transition CSS.

Catatan performa:

- `prefers-reduced-motion` sudah mematikan animasi CSS global.
- Jangan menambah animasi yang menyebabkan layout shift besar pada table/grid.
- Framer Motion belum dipakai luas; jika ditambah ke page list besar, cek performa render.

## 18. Responsiveness

| Page/Component | Status Responsive | Catatan |
|---|---|---|
| `AppShell` | Sudah ada desktop sidebar dan mobile header/drawer | Perlu cek manual semua menu mobile |
| Landing `/` | Responsive grid, visual kanan hidden di mobile | H1 memakai ukuran besar |
| Login/Admin Login | Responsive grid dan card form | Perlu cek text besar di viewport kecil |
| Register | Form single column max width | Perlu cek tinggi viewport kecil |
| User Dashboard | Grid card responsive | Tidak ada table overflow |
| User Booking/History | Grid cards responsive | Card punya elemen absolut gambar |
| User Payment | Grid 1 kolom ke 2 kolom | Tombol Place Order fixed width `294px` max full |
| Booking Completed | Centered layout | Belum protected |
| Admin Dashboard | Grid responsive | Card list bisa banyak; hanya slice 6 |
| Admin Booking | Cards responsive, filter grid, pagination responsive | Tidak memakai table |
| Admin Cashflow | Table wrapped `overflow-x-auto` min width 760px | Mobile horizontal scroll |
| Admin Schedule | Grid horizontal scroll dengan min width dinamis | Range besar sangat lebar |
| Admin Users | Desktop table dan mobile cards | Table min width 900px |
| Owner Reports | Card list responsive | Dialog perlu cek mobile height |
| Legacy `/dashboard` | Banyak layout responsive tapi static | Belum guard |

## 19. Integrasi dengan Backend

| Frontend Page/Component | Endpoint | Method | Query/Body | Response yang Dipakai |
|---|---|---|---|---|
| `AuthPageGuard` | `/auth/me` | GET | Bearer token | `AuthResponse.roles`, `user`, token refresh |
| `LoginForm` | `/auth/login` | POST | `email`, `password` | `AuthResponse`, roles, token |
| `RegisterPage` | `/auth/register` | POST | `nama`, `email`, `password`, `no_hp` | `AuthResponse` |
| `AppShell` | `/master-data/cabang` | GET | default `limit=100` | `Cabang[]` |
| `UserDashboardPage` | `/master-data/tempat` | GET | default `limit=100` | `Tempat[]` |
| `UserDashboardPage` | `/jadwal/tersedia` | GET | default `limit=100` | `Jadwal[]` |
| `UserBookingPage` | `/reservasi/` | GET | `id_user` jika auth ada | `Reservasi[]` |
| `UserBookingPage` | `/pembayaran/` | GET | default `limit=100` | `Pembayaran[]` |
| `UserHistoryPage` | `/reservasi/` | GET | `id_user` jika auth ada | `Reservasi[]` |
| `UserPaymentPage` | `/master-data/tempat` | GET | default `limit=100` | `Tempat[]` |
| `UserPaymentPage` | `/jadwal/tersedia` | GET | default `limit=100` | `Jadwal[]` |
| `UserPaymentPage` | `/reservasi/` | POST | `id_user`, `id_tempat`, `id_jadwal`, `tanggal`, `status`, `total_harga` | `Reservasi` |
| `UserPaymentPage` | `/pembayaran/` | POST | `id_reservasi`, `amount`, `status` | `Pembayaran` |
| `UserPaymentPage` | `/pembayaran/{payment_id}/status` | PATCH | `status: "paid"` | `Pembayaran` |
| `UserPaymentPage` | `/reservasi/{reservasi_id}/status` | PATCH | `status: "confirmed"` | `Reservasi` |
| `AdminDashboardPage` | `/reservasi/` | GET | `status_reservasi`, `start_date`, `sort_by`, `sort_order`, `limit` | `Reservasi[]` |
| `AdminDashboardPage` | `/laporan/summary` | GET | `id_cabang` | `AdminSummary` |
| `AdminDashboardPage` | `/reservasi/{reservasi_id}/status` | PATCH | `confirmed` atau `declined` | `Reservasi` |
| `AdminBookingPage` | `/reservasi/` | GET | `page`, `limit`, `id_cabang`, `tanggal`, `search`, `status_reservasi` jika didukung tab | `PaginatedResponse<Reservasi>` |
| `AdminBookingPage` | `/pembayaran/` | GET | `limit`, `id_cabang`, `status_pembayaran`, `search` | `PaginatedResponse<Pembayaran>` |
| `AdminBookingPage` | `/reservasi/{reservasi_id}/status` | PATCH | `confirmed` atau `declined` | `Reservasi` |
| `AdminCashflowPage` | `/pembayaran/` | GET | `page`, `limit`, `id_cabang`, `status_pembayaran`, `start_date`, `end_date`, `search` | `PaginatedResponse<Pembayaran>` |
| `AdminSchedulePage` | `/reservasi/` | GET | `id_cabang`, `start_date`, `end_date`, `status_reservasi`, `search` | `Reservasi[]` |
| `AdminUsersPage` | `/auth/users` | GET | `page`, `limit`, `search`, `role` | `PaginatedResponse<UserWithAccess>` |
| `AdminUsersPage` | `/auth/register` | POST | `nama`, `email`, `no_hp`, `password` | `AuthResponse` |
| `AdminUsersPage` | `/auth/users/{user_id}` | PATCH | `nama`, `email`, `no_hp` | `UserWithAccess` |
| `AdminUsersPage` | `/auth/users/{user_id}` | DELETE | path param | void |
| `OwnerReportsPage` | `/laporan/` | GET | `page`, `limit`, `search`, `tipe` | `PaginatedResponse<Laporan>` |
| `OwnerReportsPage` | `/laporan/` | POST | `tipe`, `lampiran`, `dibuat_oleh` | `Laporan` |
| `OwnerReportsPage` | `/laporan/{laporan_id}` | PATCH | `tipe`, `lampiran` | `Laporan` |
| `OwnerReportsPage` | `/laporan/{laporan_id}/pdf` | GET | path param | Blob PDF |

Catatan kontrak API:

- Frontend mengharapkan response list backend berbentuk `PaginatedResponse<T>`.
- Method lama mengembalikan array `data`; method `*Paginated` mengembalikan envelope lengkap `data` dan `pagination`.
- Jika kontrak API berubah, jelaskan endpoint terdampak, response lama, response baru, page/komponen terdampak, dan perubahan frontend yang dibutuhkan.

## 20. Catatan Optimasi Frontend

| Area | Masalah/Potensi Masalah | Rekomendasi |
|---|---|---|
| API list lama | Method lama `requestPaginatedData()` tetap hanya mengembalikan array | Gunakan method `*Paginated` untuk page yang butuh metadata total/page |
| Admin Booking | Metadata backend belum akurat untuk filter payment status/room type karena filter itu masih client-side | Tambahkan filter backend jika ingin total page selalu sesuai semua filter |
| Admin Cashflow | Sudah memakai pagination backend | Tambahkan validasi `fromDate <= toDate` |
| Admin Users | Sudah memakai pagination backend untuk search/role | Tambahkan filter status backend jika status user nanti benar-benar dinamis |
| Owner Reports | Sudah memakai pagination backend | Pertahankan `page`/`limit` saat menambah filter baru |
| User History | Semua reservasi user dirender sebagai card | Tambahkan pagination/filter status/tanggal jika data banyak |
| User Dashboard | Fetch semua tempat dan semua jadwal tersedia | Filter berdasarkan cabang terpilih atau cache per cabang |
| Admin Schedule | Range tanggal besar membuat grid sangat lebar | Batasi range default atau tambahkan virtualisasi/weekly view |
| Search input | Sebagian sudah debounce, schedule belum debounce | Tambahkan debounce pada schedule search jika request terasa sering |
| Branch selector | Cabang di-fetch setiap AppShell mount | Cache daftar cabang atau simpan hasil dengan stale refresh |
| Fallback data | UI bisa menampilkan data dummy saat API gagal | Tandai fallback mode dengan pesan jelas jika dipakai di production |
| Komponen inline besar | Banyak helper/UI berada dalam file page besar | Pecah komponen jika mulai sulit dites/dirawat |
| Image assets | Banyak PNG lokal dengan nama mengandung spasi/kurung | Pastikan path tidak berubah; pertimbangkan normalisasi nama aset saat refactor |

## 21. Catatan untuk Perubahan Kode Selanjutnya

- Jangan mengubah route tanpa mengecek link, sidebar, redirect auth, dan re-export route `/booking` serta `/payment`.
- Jangan mengubah nama field response API tanpa mengecek semua type dan pemakaian di `lib/api.ts`.
- Jangan menghapus `AppShell` dari route protected.
- Jangan menampilkan menu admin/owner ke role yang tidak sesuai.
- Jangan mengubah `getDashboardPathForRoles()` tanpa mengecek login dan `AuthPageGuard`.
- Jangan load semua data untuk table/list besar.
- Jangan filter data besar hanya di frontend jika backend mendukung filter.
- Jika menambahkan pagination, sesuaikan API query, state UI, dan gunakan metadata pagination backend.
- Jika mengubah API contract, jelaskan dampaknya dulu.
- Jika mengubah layout dashboard atau AppShell, pastikan sidebar desktop dan drawer mobile tetap responsive.
- Jika mengubah komponen reusable seperti `ToastProvider`, `States`, atau `AppShell`, cek semua tempat pemakaiannya.
- Jika menambahkan animasi, pastikan performa tetap aman dan hormati `prefers-reduced-motion`.
- Jangan mengubah alur payment menjadi integrasi gateway eksternal tanpa persetujuan; payment frontend saat ini adalah simulasi QRIS/internal.
- Jika mengubah payment flow, pertahankan pencatatan reservasi, payment status, dan redirect completed sesuai kontrak backend saat ini.
- Jika ada logic ambigu, minta konfirmasi terlebih dahulu.

## 22. Area yang Perlu Dicek Manual

- `/dashboard` adalah dashboard statis/legacy dan belum ditemukan guard.
- `/user/payment/completed` belum memakai `AppShell` atau guard.
- Beberapa page masih memakai fallback data dummy saat API gagal.
- Komponen di `components/admin/*`, `components/dashboard/*`, dan `components/user/*` sebagian terlihat legacy/dummy dan belum ditemukan dipakai oleh page aktif.
- Admin Users create user lewat endpoint register sehingga role default mengikuti backend; belum ada UI assign role.
- User Dashboard dan User Payment belum memfilter tempat/jadwal berdasarkan selected branch.
- User Booking mengambil payment list tanpa query eksplisit user/reservasi.
- Admin Schedule search belum debounce dan range besar bisa membuat grid berat.
- Cashflow belum ditemukan validasi frontend untuk `fromDate <= toDate`.
- Responsive mobile tabel cashflow, users, dan schedule perlu dicek manual.
