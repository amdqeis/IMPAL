"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, getStoredAuth, type Jadwal, type Pembayaran, type Reservasi, type Tempat } from "@/lib/api";
import { fallbackSchedules, fallbackTables } from "@/lib/fallback-data";
import { formatCurrency, normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

const bookingSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  no_hp: z.string().min(8, "No. Telp wajib diisi"),
  id_tempat: z.number().min(1),
  id_jadwal: z.number().min(1),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
});

type BookingValues = z.infer<typeof bookingSchema>;

export default function UserPaymentPage() {
  return (
    <Suspense fallback={<AppShell role="user"><div className="p-8 font-bold">Memuat payment...</div></AppShell>}>
      <UserPaymentContent />
    </Suspense>
  );
}

function UserPaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedTableId = Number(params.get("id_tempat") ?? fallbackTables[1].id_tempat);
  const requestedScheduleId = Number(params.get("id_jadwal") ?? fallbackSchedules.find((item) => item.id_tempat === requestedTableId)?.id_jadwal ?? fallbackSchedules[1].id_jadwal);
  const tables = useApiData<Tempat[]>(() => api.masterData.listTempat(), fallbackTables);
  const schedules = useApiData<Jadwal[]>(
    () => api.jadwal.listTersedia(params.get("id_tempat") ? { id_tempat: requestedTableId } : undefined),
    fallbackSchedules,
  );
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservasi | null>(null);
  const [payment, setPayment] = useState<Pembayaran | null>(null);

  const defaultTableId = requestedTableId;
  const defaultScheduleId = requestedScheduleId;
  const auth = getStoredAuth();

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    values: {
      nama: auth?.user.nama ?? "Jonathan",
      no_hp: auth?.user.no_hp ?? "08123456",
      id_tempat: defaultTableId,
      id_jadwal: defaultScheduleId,
      tanggal: "2026-03-23",
    },
  });

  const selectedTableId = useWatch({ control: form.control, name: "id_tempat" });
  const selectedScheduleId = useWatch({ control: form.control, name: "id_jadwal" });
  const selectedTable = tables.data.find((table) => table.id_tempat === Number(selectedTableId)) ?? tables.data[0];
  const selectedSchedule = schedules.data.find((schedule) => schedule.id_jadwal === Number(selectedScheduleId)) ?? schedules.data[0];
  const roomType = roomTypeFromPrice(selectedTable?.harga);
  const hours = selectedSchedule ? Math.max(1, Number(normalizeTime(selectedSchedule.jam_selesai).slice(0, 2)) - Number(normalizeTime(selectedSchedule.jam_mulai).slice(0, 2))) : 1;
  const total = useMemo(() => Number(selectedTable?.harga ?? 0) * hours, [hours, selectedTable?.harga]);

  const onSubmit = async (values: BookingValues) => {
    setError(null);
    const currentAuth = getStoredAuth();
    if (!currentAuth) {
      router.push("/login");
      return;
    }

    const createdReservation = await api.reservasi.create({
      id_user: currentAuth.user.id_user,
      id_tempat: values.id_tempat,
      id_jadwal: values.id_jadwal,
      tanggal: values.tanggal,
      status: "pending",
      total_harga: total,
    });
    const createdPayment = await api.pembayaran.create({
      id_reservasi: createdReservation.id_reservasi,
      amount: total,
      status: "pending",
    });
    window.sessionStorage.setItem("sibooking_latest_reservation", String(createdReservation.id_reservasi));
    window.sessionStorage.setItem("sibooking_latest_payment", String(createdPayment.id_payment));
    setReservation(createdReservation);
    setPayment(createdPayment);
  };

  const completePayment = async () => {
    if (payment) {
      await api.pembayaran.updateStatus(payment.id_payment, { status: "paid" });
    }
    if (reservation) {
      await api.reservasi.updateStatus(reservation.id_reservasi, { status: "confirmed" });
    }
    router.push("/user/payment/completed");
  };

  return (
    <AppShell role="user">
      <div className="grid w-full max-w-[1180px] grid-cols-1 gap-8 px-4 py-2 sm:px-6 md:grid-cols-[1.05fr_1fr] md:px-8">
        <div className="flex flex-col gap-1">
          <section className="min-h-[382px] rounded-[6px] border border-[#D9D9D9] bg-white/80 px-10 py-6">
            <h2 className="mb-3 text-[16px] font-black text-[#0F4C3E]">Detail Pemesanan</h2>
            {tables.loading || schedules.loading ? <LoadingState /> : null}
            {error ? <ErrorState message={error} /> : null}
            <form onSubmit={form.handleSubmit(onSubmit, () => setError("Lengkapi detail pemesanan."))} className="max-w-[295px] space-y-2">
              <Input label="Name" {...form.register("nama")} />
              <Input label="No. Telp" {...form.register("no_hp")} />
              <label className="block">
                <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Tipe Ruangan</span>
                <select {...form.register("id_tempat", { valueAsNumber: true })} className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] px-3 text-[12px] font-bold">
                  {tables.data.map((table) => (
                    <option key={table.id_tempat} value={table.id_tempat}>
                      {roomLabel(table.nomor_meja)} - {roomTypeFromPrice(table.harga)}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Tanggal Pemesanan" type="date" {...form.register("tanggal")} />
              <div className="grid grid-cols-2 gap-5">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Jam Mulai</span>
                  <select {...form.register("id_jadwal", { valueAsNumber: true })} className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] px-2 text-[12px] font-bold">
                    {schedules.data
                      .filter((schedule) => schedule.id_tempat === Number(selectedTableId))
                      .map((schedule) => (
                        <option key={schedule.id_jadwal} value={schedule.id_jadwal}>
                          {normalizeTime(schedule.jam_mulai)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Jam Selesai</span>
                  <input readOnly value={normalizeTime(selectedSchedule?.jam_selesai)} className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] px-2 text-[12px] font-bold" />
                </label>
              </div>
            </form>
          </section>

          <section className="min-h-[368px] rounded-[6px] border border-[#D9D9D9] bg-white/80 p-3">
            <h2 className="text-[16px] font-black text-[#0F4C3E]">Payment Method</h2>
            <button className="mt-2 flex h-[138px] w-[132px] flex-col items-center justify-center rounded-[8px] border border-[#3B82F6] bg-white">
              <Image src="/Qris.png" alt="QRIS" width={88} height={88} className="h-[82px] w-[82px]" />
              <span className="text-[18px] font-black text-black">QRIS</span>
            </button>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <aside className="min-h-[255px] rounded-[6px] border border-[#D9D9D9] bg-white/80 p-4">
            <h2 className="text-[18px] font-black text-[#0F4C3E]">Pesanan Anda</h2>
            <div className="mt-2 flex gap-4">
              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[6px] bg-black">
                <Image src="/user (Icon Admin User).png" alt="" width={46} height={46} />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-[#0F4C3E]">
                  {roomLabel(selectedTable?.nomor_meja)} - {roomType}
                </h3>
                <p className="mt-2 text-[12px] font-bold text-[#D1D5DB]">Sehat, dan bertenaga</p>
              </div>
            </div>
            <div className="mt-20 flex items-center justify-between">
              <p className="text-[16px] font-black text-[#C4C4C4]">Total</p>
              <p className="text-[16px] font-black text-[#0F4C3E]">{formatCurrency(total)}</p>
            </div>
            <button onClick={form.handleSubmit(onSubmit, () => setError("Lengkapi detail pemesanan."))} className="mx-auto mt-4 block h-[28px] w-[294px] max-w-full rounded-[6px] bg-[#2F80ED] text-[16px] font-black text-white">
              Place Order
            </button>
          </aside>

          {payment ? (
            <section className="flex min-h-[478px] flex-col items-center rounded-[6px] border border-[#D9D9D9] bg-white/85 p-6">
              <div className="text-[64px] font-black tracking-normal text-[#1F2946]">QRIS</div>
              <Image src="/Qris.png" alt="QRIS code" width={230} height={230} className="mt-2 h-[230px] w-[230px] object-contain" />
              <div className="mt-3 rounded-[6px] border border-[#D9D9D9] px-10 py-1 text-[12px] font-black text-[#4B5563]">
                Valid Until 23, March 2026 19:00:34
              </div>
              <button onClick={completePayment} className="mt-5 rounded-[8px] bg-[#005344] px-8 py-2 text-[16px] font-black text-white">
                Confirm Payment
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-black text-[#4B5563]">{label}</span>
      <input {...inputProps} className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] px-3 text-[12px] font-bold" />
    </label>
  );
}
