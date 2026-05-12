type Primitive = string | number | boolean;
type QueryValue = Primitive | Date | null | undefined;
type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type RoleName = "admin" | "user" | string;

export type User = {
  id_user: number;
  nama: string;
  email: string;
  no_hp: string;
};

export type UserWithAccess = User & {
  roles: RoleName[];
  permissions: string[];
  status?: "Active" | "Inactive";
};

export type AuthResponse = {
  user: User;
  roles: RoleName[];
  permissions: string[];
  token: string | null;
  access_token?: string | null;
  token_type?: string;
  expires_at?: string | null;
  expires_in?: number | null;
  message: string;
};

export type RegisterPayload = {
  nama: string;
  email: string;
  password: string;
  no_hp: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UserUpdatePayload = Partial<Pick<User, "nama" | "email" | "no_hp">>;

export type Cabang = {
  id_cabang: number;
  nama: string;
  lokasi: string;
};

export type CabangCreatePayload = {
  nama: string;
  lokasi: string;
};

export type CabangUpdatePayload = Partial<CabangCreatePayload>;

export type Tempat = {
  id_tempat: number;
  id_cabang: number;
  nomor_meja: string;
  harga: string;
  status: string;
  cabang?: Cabang | null;
};

export type TempatCreatePayload = {
  id_cabang: number;
  nomor_meja: string;
  harga: number | string;
  status: string;
};

export type TempatUpdatePayload = Partial<TempatCreatePayload>;

export type Jadwal = {
  id_jadwal: number;
  id_tempat: number;
  jam_mulai: string;
  jam_selesai: string;
  available?: boolean;
  tempat?: Tempat | null;
};

export type JadwalCreatePayload = {
  id_tempat: number;
  jam_mulai: string;
  jam_selesai: string;
};

export type JadwalUpdatePayload = Partial<JadwalCreatePayload>;

export type Reservasi = {
  id_reservasi: number;
  id_user: number;
  id_tempat: number;
  id_jadwal: number;
  tanggal: string;
  status: string;
  total_harga: string;
  user?: User | null;
  tempat?: Tempat | null;
  jadwal?: Jadwal | null;
  payments?: Pembayaran[];
};

export type ReservasiCreatePayload = {
  id_user: number;
  id_tempat: number;
  id_jadwal: number;
  tanggal: string;
  status?: string;
  total_harga: number | string;
};

export type ReservasiUpdateStatusPayload = {
  status: string;
};

export type Pembayaran = {
  id_payment: number;
  id_reservasi: number;
  amount: string;
  status: string;
  reservasi?: Reservasi | null;
};

export type PembayaranCreatePayload = {
  id_reservasi: number;
  amount: number | string;
  status?: string;
};

export type PembayaranUpdateStatusPayload = {
  status: string;
};

export type PaymentLog = {
  id_log: number;
  id_payment: number;
  response: string;
};

export type PaymentLogCreatePayload = {
  response: string;
};

export type Refund = {
  id_refund: number;
  id_payment: number;
  amount: string;
  status: string;
};

export type RefundCreatePayload = {
  amount: number | string;
  status?: string;
};

export type RefundUpdateStatusPayload = {
  status: string;
};

export type Laporan = {
  id_laporan: number;
  tipe: string;
  lampiran: string;
  dibuat_oleh: number;
};

export type LaporanCreatePayload = {
  tipe: string;
  lampiran: string;
  dibuat_oleh: number;
};

export type LaporanUpdatePayload = Partial<LaporanCreatePayload>;

export type AdminSummary = {
  total_bookings: number;
  active_bookings: number;
  paid_payments: number;
  pending_payments: number;
  income_total: string;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: QueryParams;
  auth?: boolean;
};
type ApiCallOptions = Pick<RequestOptions, "signal">;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

const TOKEN_KEY = "sibooking_token";
const USER_KEY = "sibooking_user";

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function persistAuth(auth: AuthResponse, remember: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  const token = auth.access_token ?? auth.token;
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);

  if (token) {
    target.setItem(TOKEN_KEY, token);
  }
  target.setItem(USER_KEY, JSON.stringify(auth));
}

export function refreshStoredAuth(auth: AuthResponse) {
  if (typeof window === "undefined") {
    return;
  }

  const localToken = window.localStorage.getItem(TOKEN_KEY);
  const sessionToken = window.sessionStorage.getItem(TOKEN_KEY);
  const token = localToken ?? sessionToken ?? auth.access_token ?? auth.token;

  if (!token) {
    return;
  }

  persistAuth(
    {
      ...auth,
      access_token: token,
      token,
    },
    Boolean(localToken),
  );
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

function toQueryString(query?: QueryParams) {
  if (!query) {
    return "";
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
  }

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

function buildUrl(path: string, query?: QueryParams) {
  return `${API_BASE_URL}${path}${toQueryString(query)}`;
}

async function request<T>(
  path: string,
  { body, headers, query, auth = true, ...init }: RequestOptions = {},
): Promise<T> {
  const token = auth ? getStoredToken() : null;
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: init.cache ?? "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = response.status === 204 ? null : isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      ("message" in data || "detail" in data)
        ? String((data as { message?: string; detail?: string }).message ?? (data as { detail?: string }).detail)
        : `Request gagal dengan status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

async function requestBlob(
  path: string,
  { body, headers, query, auth = true, ...init }: RequestOptions = {},
): Promise<Blob> {
  const token = auth ? getStoredToken() : null;
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: init.cache ?? "no-store",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    const message =
      typeof data === "object" &&
      data !== null &&
      ("message" in data || "detail" in data)
        ? String((data as { message?: string; detail?: string }).message ?? (data as { detail?: string }).detail)
        : `Request gagal dengan status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return response.blob();
}

export const api = {
  auth: {
    register: (payload: RegisterPayload) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: payload,
        auth: false,
      }),
    login: (payload: LoginPayload) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: payload,
        auth: false,
      }),
    me: () => request<AuthResponse>("/auth/me"),
    listUsers: (options?: ApiCallOptions) => request<UserWithAccess[]>("/auth/users", { ...options }),
    updateUser: (userId: number, payload: UserUpdatePayload) =>
      request<UserWithAccess>(`/auth/users/${userId}`, {
        method: "PATCH",
        body: payload,
      }),
    deleteUser: (userId: number) =>
      request<void>(`/auth/users/${userId}`, {
        method: "DELETE",
      }),
    getUserAccess: (userId: number) => request<AuthResponse>(`/auth/users/${userId}/access`),
    listPermissions: () => request<string[]>("/auth/permissions"),
    logout: clearAuth,
  },
  masterData: {
    listCabang: () => request<Cabang[]>("/master-data/cabang"),
    createCabang: (payload: CabangCreatePayload) =>
      request<Cabang>("/master-data/cabang", {
        method: "POST",
        body: payload,
      }),
    updateCabang: (cabangId: number, payload: CabangUpdatePayload) =>
      request<Cabang>(`/master-data/cabang/${cabangId}`, {
        method: "PATCH",
        body: payload,
      }),
    deleteCabang: (cabangId: number) =>
      request<void>(`/master-data/cabang/${cabangId}`, {
        method: "DELETE",
      }),
    listTempat: (query?: { id_cabang?: number; status_tempat?: string }) =>
      request<Tempat[]>("/master-data/tempat", { query }),
    createTempat: (payload: TempatCreatePayload) =>
      request<Tempat>("/master-data/tempat", {
        method: "POST",
        body: payload,
      }),
    updateTempat: (tempatId: number, payload: TempatUpdatePayload) =>
      request<Tempat>(`/master-data/tempat/${tempatId}`, {
        method: "PATCH",
        body: payload,
      }),
    deleteTempat: (tempatId: number) =>
      request<void>(`/master-data/tempat/${tempatId}`, {
        method: "DELETE",
      }),
  },
  jadwal: {
    list: (query?: { id_tempat?: number }) => request<Jadwal[]>("/jadwal/", { query }),
    listAvailability: (query: { id_tempat: number; tanggal: string }) =>
      request<Jadwal[]>("/jadwal/availability", { query }),
    listTersedia: () => request<Jadwal[]>("/jadwal/tersedia"),
    create: (payload: JadwalCreatePayload) =>
      request<Jadwal>("/jadwal/", {
        method: "POST",
        body: payload,
      }),
    update: (jadwalId: number, payload: JadwalUpdatePayload) =>
      request<Jadwal>(`/jadwal/${jadwalId}`, {
        method: "PATCH",
        body: payload,
      }),
    delete: (jadwalId: number) =>
      request<void>(`/jadwal/${jadwalId}`, {
        method: "DELETE",
      }),
  },
  reservasi: {
    list: (query?: { id_user?: number; id_cabang?: number; status_reservasi?: string }, options?: ApiCallOptions) =>
      request<Reservasi[]>("/reservasi/", { query, ...options }),
    create: (payload: ReservasiCreatePayload) =>
      request<Reservasi>("/reservasi/", {
        method: "POST",
        body: payload,
      }),
    updateStatus: (reservasiId: number, payload: ReservasiUpdateStatusPayload) =>
      request<Reservasi>(`/reservasi/${reservasiId}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  pembayaran: {
    list: (query?: { id_reservasi?: number; id_cabang?: number; status_pembayaran?: string }, options?: ApiCallOptions) =>
      request<Pembayaran[]>("/pembayaran/", { query, ...options }),
    create: (payload: PembayaranCreatePayload) =>
      request<Pembayaran>("/pembayaran/", {
        method: "POST",
        body: payload,
      }),
    updateStatus: (paymentId: number, payload: PembayaranUpdateStatusPayload) =>
      request<Pembayaran>(`/pembayaran/${paymentId}/status`, {
        method: "PATCH",
        body: payload,
      }),
    createLog: (paymentId: number, payload: PaymentLogCreatePayload) =>
      request<PaymentLog>(`/pembayaran/${paymentId}/logs`, {
        method: "POST",
        body: payload,
      }),
    createRefund: (paymentId: number, payload: RefundCreatePayload) =>
      request<Refund>(`/pembayaran/${paymentId}/refunds`, {
        method: "POST",
        body: payload,
      }),
    updateRefundStatus: (refundId: number, payload: RefundUpdateStatusPayload) =>
      request<Refund>(`/pembayaran/refunds/${refundId}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  laporan: {
    list: (options?: ApiCallOptions) => request<Laporan[]>("/laporan/", { ...options }),
    summary: () => request<AdminSummary>("/laporan/summary"),
    create: (payload: LaporanCreatePayload) =>
      request<Laporan>("/laporan/", {
        method: "POST",
        body: payload,
      }),
    update: (laporanId: number, payload: LaporanUpdatePayload) =>
      request<Laporan>(`/laporan/${laporanId}`, {
        method: "PATCH",
        body: payload,
      }),
    downloadPdf: (laporanId: number, options?: ApiCallOptions) =>
      requestBlob(`/laporan/${laporanId}/pdf`, { ...options }),
  },
};

export type ApiClient = typeof api;
