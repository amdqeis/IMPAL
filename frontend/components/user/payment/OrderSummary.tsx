"use client";

import Image from "next/image";

import { ErrorState } from "@/components/sibooking/States";
import type { Pembayaran, Reservasi, Tempat } from "@/lib/api";
import { formatCurrency, roomLabel, roomTypeFromPrice } from "@/lib/format";

type OrderSummaryProps = {
  formId: string;
  selectedTable: Tempat | null;
  total: number;
  payment: Pembayaran | null;
  pendingReservation: Reservasi | null;
  submitError: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  isRetryingPayment: boolean;
  onRetryPayment: () => void;
};

export function OrderSummary({
  formId,
  selectedTable,
  total,
  payment,
  pendingReservation,
  submitError,
  canSubmit,
  isSubmitting,
  isRetryingPayment,
  onRetryPayment,
}: OrderSummaryProps) {
  return (
    <aside className="min-h-[255px] rounded-[6px] border border-[#D9D9D9] bg-white/80 p-4">
      <h2 className="text-[18px] font-black text-[#0F4C3E]">Pesanan Anda</h2>
      <div className="mt-2 flex gap-4">
        <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[6px] bg-black">
          <Image src="/user (Icon Admin User).png" alt="" width={46} height={46} />
        </div>
        <div>
          <h3 className="text-[16px] font-black text-[#0F4C3E]">
            {selectedTable
              ? `${roomLabel(selectedTable.nomor_meja, `Room #${selectedTable.id_tempat}`)} - ${roomTypeFromPrice(selectedTable.harga)}`
              : "Pilih Room"}
          </h3>
          <p className="mt-2 text-[12px] font-bold text-[#D1D5DB]">Sehat, dan bertenaga</p>
        </div>
      </div>
      <div className="mt-20 flex items-center justify-between">
        <p className="text-[16px] font-black text-[#C4C4C4]">Total</p>
        <p className="text-[16px] font-black text-[#0F4C3E]">{formatCurrency(total)}</p>
      </div>
      {submitError ? (
        <div className="mt-4">
          <ErrorState message={submitError} />
        </div>
      ) : null}
      <button
        type="submit"
        form={formId}
        disabled={!canSubmit || isSubmitting || Boolean(payment)}
        className="mx-auto mt-4 block h-[28px] w-[294px] max-w-full rounded-[6px] bg-[#2F80ED] text-[16px] font-black text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#93C5FD]"
      >
        {isSubmitting ? "Processing..." : "Place Order"}
      </button>
      {pendingReservation && !payment ? (
        <button
          type="button"
          onClick={onRetryPayment}
          disabled={isRetryingPayment}
          className="mx-auto mt-3 block h-[30px] w-[294px] max-w-full rounded-[6px] border border-[#005344] bg-white text-[14px] font-black text-[#005344] transition hover:bg-[#ECFDF3] disabled:opacity-60"
        >
          {isRetryingPayment ? "Membuat payment..." : "Retry Payment"}
        </button>
      ) : null}
    </aside>
  );
}
