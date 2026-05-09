export function formatCurrency(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function normalizeTime(value: string | null | undefined) {
  if (!value) {
    return "--:--";
  }

  return value.slice(0, 5);
}

export function roomLabel(nomorMeja?: string, fallback = "Room A") {
  if (!nomorMeja) {
    return fallback;
  }

  const normalized = nomorMeja.toLowerCase().startsWith("room")
    ? nomorMeja
    : `Room ${nomorMeja}`;
  return normalized.replace(/\s+/g, " ").trim();
}

export function roomTypeFromPrice(price: number | string | null | undefined) {
  return Number(price ?? 0) >= 70000 ? "VIP" : "Regular";
}

export function reservationStatusLabel(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();
  if (value === "confirmed" || value === "completed") {
    return "Confirmed";
  }
  if (value === "cancelled" || value === "declined") {
    return "Declined";
  }
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending";
}
