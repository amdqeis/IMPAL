"use client";

import Link from "next/link";

export default function BookingCompletedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#EFFBF6] text-[#0F4C3E]">
      <div className="absolute inset-0 opacity-[0.18]">
        <div className="absolute right-[-40px] top-[-20px] h-[840px] w-[300px] rounded-[36px] border-[16px] border-[#5E6964]" />
        <div className="absolute right-[290px] top-[155px] h-[620px] w-[46px] rounded-full border-[16px] border-[#5E6964]" />
      </div>
      <section className="relative z-10 flex w-full max-w-[620px] flex-col items-center px-6">
        <h1 className="text-center text-[54px] font-black leading-none text-[#0F4C3E] drop-shadow-[0_7px_6px_rgba(15,76,62,0.28)]">
          Booking Completed!
        </h1>
        <div className="mt-6 h-[50px] w-full rounded-[8px] border border-[#D9D9D9] bg-white px-4 py-2 text-[24px] font-black text-[#C4C4C4]">
          #ID_Booking
        </div>
        <Link href="/user/dashboard" className="mt-3 rounded-[8px] bg-[#005344] px-3 py-1 text-[18px] font-black text-white shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
          Dashboard
        </Link>
      </section>
    </main>
  );
}
