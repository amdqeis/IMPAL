"use client";

import { ArrowUpRight, Search } from "lucide-react";

import { AppShell } from "@/components/sibooking/AppShell";
import { ErrorState, LoadingState } from "@/components/sibooking/States";
import { api, type Pembayaran } from "@/lib/api";
import { fallbackPayments } from "@/lib/fallback-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";

export default function AdminCashflowPage() {
  const payments = useApiData<Pembayaran[]>(() => api.pembayaran.list(), fallbackPayments);
  const income = payments.data
    .filter((payment) => payment.status.toLowerCase() === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <AppShell role="admin">
      <div className="mx-auto w-full max-w-[1004px] px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-[8px] bg-[#0E3A2E] shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
          <div className="min-h-[295px] p-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[34px] font-black leading-none">Cashflow</h1>
                <p className="mt-4 text-[16px] font-bold text-[#CBD5E1]">Overview of your transaction</p>
              </div>
              <button className="rounded-[6px] bg-[#21684E] px-4 py-3 text-[20px] font-black">+Add Transaction</button>
            </div>
            <div className="mt-12 flex h-[105px] w-full max-w-[356px] items-center justify-between rounded-[8px] bg-[#EEFFF4] px-7 text-[#4B5563]">
              <div className="flex items-center gap-5">
                <span className="flex h-40px w-10 items-center justify-center rounded-full bg-[#BBF7D0]">
                  <ArrowUpRight className="h-7 w-7 text-[#16A34A]" />
                </span>
                <div>
                  <p className="text-[16px] font-black">Income</p>
                  <p className="mt-2 text-[22px] font-black text-[#17C653]">+ {formatCurrency(income)}</p>
                </div>
              </div>
              <p className="text-[18px] font-black text-[#17C653]">+12%</p>
            </div>
          </div>
          <div className="bg-[#E5E7EB] p-8">
            <h2 className="text-[20px] font-black text-[#1F2937]">Recent Transactions</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[8px] bg-[#F1F5F9] p-1">
              <select className="h-38px rounded-[8px] px-3 text-[20px] font-black text-[#1F2937]">
                <option>From&nbsp; 01 Apr 2024</option>
              </select>
              <select className="h-38px rounded-[8px] px-3 text-[20px] font-black text-[#1F2937]">
                <option>To&nbsp; 16 Apr 2024</option>
              </select>
              <select className="h-38px rounded-[8px] px-12 text-[20px] font-black text-[#1F2937]">
                <option>All</option>
              </select>
              <label className="ml-auto flex h-[38px] min-w-[320px] items-center gap-2 rounded-[10px] border border-black bg-white px-3">
                <Search className="h-7 w-7 text-[#B6C1D0]" />
                <input className="min-w-0 flex-1 text-[20px] font-bold outline-none placeholder:text-[#B6C1D0]" placeholder="Search Transaction..." />
              </label>
            </div>
            {payments.error ? <div className="mt-4"><ErrorState message={payments.error} /></div> : null}
            {payments.loading ? <div className="mt-4"><LoadingState /></div> : null}
            <div className="mt-3 overflow-x-auto rounded-[8px] bg-white/60 p-4">
              <table className="w-full min-w-[720px] text-left">
                <thead className="text-[20px] font-black text-[#6B7280]">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.data.slice(0, 6).map((payment) => (
                    <tr key={payment.id_payment} className="border-t border-black text-[20px] font-black text-[#1F2937]">
                      <td className="py-2 text-[#6B7280]">{formatDate(payment.reservasi?.tanggal ?? "2024-04-14")}</td>
                      <td className="py-2">Sewa Meja</td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-2 bg-[#DCFCE7] px-4 py-1 text-[16px] text-[#374151]">
                          <ArrowUpRight className="h-5 w-5 text-[#16A34A]" />
                          Income
                        </span>
                      </td>
                      <td className="py-2 text-right text-[#069B4F]">+ {formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
