import type { BookingSummary } from "@/data/adminDashboardDummy";

type TopSummaryCardProps = {
  summary: BookingSummary;
};

export function TopSummaryCard({ summary }: TopSummaryCardProps) {
  return (
    <article className="min-h-[170px] rounded-[24px] border border-[#DCEFE4] bg-[#EDF8F2] p-6 shadow-[0_8px_24px_rgba(15,91,71,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-bold leading-none text-[#6B7280]">
            {summary.label}
          </p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-bold leading-none text-[#0F5B47]">
              {summary.title}
            </h2>
            <span className="rounded-full bg-[#F7D046] px-4 py-1 text-[14px] font-semibold leading-none text-[#111827]">
              {summary.status}
            </span>
          </div>
        </div>

        <a
          href="#"
          className="shrink-0 text-[14px] font-bold leading-none text-[#0B74FF]"
        >
          Lihat Kalender
        </a>
      </div>

      <p className="mt-4 text-[14px] font-medium text-[#A3A3A3]">
        {summary.subtitle}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[22px] font-bold leading-none text-[#0F5B47]">
          {summary.venue}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#D6F5D8] text-[16px] font-bold text-[#16A34A]">
            {summary.initials}
          </div>
          <div className="rounded-full bg-[#FCE7F3] px-5 py-2 text-[16px] font-semibold leading-none text-[#E11D48]">
            {summary.duration}
          </div>
        </div>
      </div>
    </article>
  );
}
