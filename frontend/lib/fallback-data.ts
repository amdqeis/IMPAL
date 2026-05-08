import type { Cabang, Jadwal, Pembayaran, Reservasi, Tempat, UserWithAccess } from "@/lib/api";

export const fallbackBranches: Cabang[] = [
  { id_cabang: 1, nama: "SiBooking Blok M", lokasi: "Blok M" },
  { id_cabang: 2, nama: "SiBooking Depok", lokasi: "Depok" },
];

export const fallbackTables: Tempat[] = [
  { id_tempat: 1, id_cabang: 1, nomor_meja: "A", harga: "35000", status: "available" },
  { id_tempat: 2, id_cabang: 1, nomor_meja: "B", harga: "75000", status: "available" },
  { id_tempat: 3, id_cabang: 1, nomor_meja: "C", harga: "35000", status: "occupied" },
  { id_tempat: 4, id_cabang: 1, nomor_meja: "D", harga: "75000", status: "occupied" },
  { id_tempat: 5, id_cabang: 1, nomor_meja: "E", harga: "75000", status: "available" },
  { id_tempat: 6, id_cabang: 1, nomor_meja: "F", harga: "35000", status: "occupied" },
];

export const fallbackSchedules: Jadwal[] = [
  { id_jadwal: 1, id_tempat: 1, jam_mulai: "11:00:00", jam_selesai: "12:00:00" },
  { id_jadwal: 2, id_tempat: 2, jam_mulai: "19:00:00", jam_selesai: "20:00:00" },
  { id_jadwal: 3, id_tempat: 3, jam_mulai: "17:00:00", jam_selesai: "19:00:00" },
  { id_jadwal: 4, id_tempat: 4, jam_mulai: "14:00:00", jam_selesai: "16:00:00" },
  { id_jadwal: 5, id_tempat: 5, jam_mulai: "15:00:00", jam_selesai: "17:00:00" },
  { id_jadwal: 6, id_tempat: 6, jam_mulai: "18:00:00", jam_selesai: "20:00:00" },
];

export const fallbackUsers: UserWithAccess[] = [
  {
    id_user: 1,
    nama: "Ruviera Rifa'i",
    email: "Rifai@gmail.com",
    no_hp: "08123456789",
    roles: ["admin"],
    permissions: [],
    status: "Active",
  },
  {
    id_user: 2,
    nama: "Zalfa Ismail",
    email: "zalfa@gmail.com",
    no_hp: "08123456780",
    roles: ["user"],
    permissions: [],
    status: "Active",
  },
  {
    id_user: 3,
    nama: "Ahmad Alvaro",
    email: "ahmd@gmail.com",
    no_hp: "08123456781",
    roles: ["admin"],
    permissions: [],
    status: "Active",
  },
  {
    id_user: 4,
    nama: "Ali Ahabadin",
    email: "Ali@gmail.com",
    no_hp: "08123456782",
    roles: ["user"],
    permissions: [],
    status: "Active",
  },
];

export const fallbackReservations: Reservasi[] = [
  {
    id_reservasi: 1,
    id_user: 2,
    id_tempat: 1,
    id_jadwal: 1,
    tanggal: "2026-03-23",
    status: "confirmed",
    total_harga: "210000",
    user: fallbackUsers[1],
    tempat: fallbackTables[0],
    jadwal: fallbackSchedules[0],
  },
  {
    id_reservasi: 2,
    id_user: 2,
    id_tempat: 3,
    id_jadwal: 3,
    tanggal: "2025-10-15",
    status: "completed",
    total_harga: "245000",
    user: fallbackUsers[1],
    tempat: fallbackTables[2],
    jadwal: fallbackSchedules[2],
  },
  {
    id_reservasi: 3,
    id_user: 3,
    id_tempat: 2,
    id_jadwal: 2,
    tanggal: "2026-04-17",
    status: "pending",
    total_harga: "75000",
    user: fallbackUsers[2],
    tempat: fallbackTables[1],
    jadwal: fallbackSchedules[1],
  },
];

export const fallbackPayments: Pembayaran[] = [
  { id_payment: 1, id_reservasi: 1, amount: "210000", status: "paid", reservasi: fallbackReservations[0] },
  { id_payment: 2, id_reservasi: 2, amount: "245000", status: "paid", reservasi: fallbackReservations[1] },
  { id_payment: 3, id_reservasi: 3, amount: "75000", status: "pending", reservasi: fallbackReservations[2] },
];
