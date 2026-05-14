"use client";

import type { FormEventHandler, InputHTMLAttributes } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { Jadwal, Tempat } from "@/lib/api";
import { normalizeTime, roomLabel, roomTypeFromPrice } from "@/lib/format";

export type PaymentBookingFormValues = {
  nama: string;
  no_hp: string;
  id_tempat: number;
  id_jadwal: number;
  tanggal: string;
};

type BookingFormProps = {
  form: UseFormReturn<PaymentBookingFormValues>;
  formId: string;
  tables: Tempat[];
  availableSchedules: Jadwal[];
  selectedTableId: number;
  selectedSchedule: Jadwal | null;
  tablesLoading: boolean;
  availabilityLoading: boolean;
  disabled?: boolean;
  minDate: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function BookingForm({
  form,
  formId,
  tables,
  availableSchedules,
  selectedTableId,
  selectedSchedule,
  tablesLoading,
  availabilityLoading,
  disabled = false,
  minDate,
  onSubmit,
}: BookingFormProps) {
  const errors = form.formState.errors;

  return (
    <section className="min-h-[382px] rounded-[6px] border border-[#D9D9D9] bg-white/80 px-10 py-6">
      <h2 className="mb-3 text-[16px] font-black text-[#0F4C3E]">Detail Pemesanan</h2>
      <form id={formId} onSubmit={onSubmit} className="max-w-[295px] space-y-2">
        <Input label="Name" readOnly {...form.register("nama")} />
        <Input label="No. Telp" readOnly {...form.register("no_hp")} />
        <label className="block">
          <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Tipe Ruangan</span>
          <select
            {...form.register("id_tempat", { valueAsNumber: true })}
            disabled={tables.length === 0 || disabled || tablesLoading}
            className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] bg-white px-3 text-[12px] font-bold text-[#334155] outline-none disabled:opacity-60"
          >
            <option value={0}>{tablesLoading ? "Memuat..." : "Pilih ruangan"}</option>
            {tables.map((table) => (
              <option key={table.id_tempat} value={table.id_tempat}>
                {roomLabel(table.nomor_meja, `Room #${table.id_tempat}`)} - {roomTypeFromPrice(table.harga)}
              </option>
            ))}
          </select>
          <FieldError message={errors.id_tempat?.message} />
        </label>
        <Input
          label="Tanggal Pemesanan"
          type="date"
          min={minDate}
          disabled={disabled}
          {...form.register("tanggal")}
        />
        <FieldError message={errors.tanggal?.message} />
        <div className="grid grid-cols-2 gap-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Jam Mulai</span>
            <select
              {...form.register("id_jadwal", { valueAsNumber: true })}
              disabled={availabilityLoading || availableSchedules.length === 0 || disabled}
              className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] bg-white px-2 text-[12px] font-bold text-[#334155] outline-none disabled:opacity-60"
            >
              <option value={0}>{availabilityLoading ? "Memuat..." : "Select"}</option>
              {availableSchedules.map((schedule) => (
                <option key={schedule.id_jadwal} value={schedule.id_jadwal}>
                  {normalizeTime(schedule.jam_mulai)}
                </option>
              ))}
            </select>
            <FieldError message={errors.id_jadwal?.message} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-black text-[#4B5563]">Jam Selesai</span>
            <input
              readOnly
              value={normalizeTime(selectedSchedule?.jam_selesai)}
              className="h-[30px] w-full rounded-[7px] border border-[#D1D5DB] bg-white px-2 text-[12px] font-bold text-[#334155]"
            />
          </label>
        </div>
      </form>
      {!availabilityLoading && selectedTableId > 0 && availableSchedules.length === 0 ? (
        <p className="mt-3 max-w-[295px] rounded-[6px] bg-[#FFF7ED] px-3 py-2 text-[12px] font-bold text-[#B45309]">
          Tidak ada jadwal tersedia untuk tanggal ini.
        </p>
      ) : null}
    </section>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...inputProps } = props;
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-black text-[#4B5563]">{label}</span>
      <input
        {...inputProps}
        className={`h-[30px] w-full rounded-[7px] border border-[#D1D5DB] bg-white px-3 text-[12px] font-bold text-[#334155] outline-none disabled:opacity-60 ${className ?? ""}`}
      />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-[11px] font-bold text-[#DC2626]">{message}</p>;
}
