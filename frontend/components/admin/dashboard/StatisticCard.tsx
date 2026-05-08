import type {
  ProgressSegment,
  StatisticItem,
} from "@/data/adminDashboardDummy";

type StatisticCardProps = {
  items: StatisticItem[];
  segments: ProgressSegment[];
};

export function StatisticCard({ items, segments }: StatisticCardProps) {
  return (
    <article className="min-h-[170px] rounded-[24px] border border-[#DCEFE4] bg-[#EDF8F2] p-6 shadow-[0_8px_24px_rgba(15,91,71,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-bold leading-none text-[#6B7280]">
          Booking Statistic
        </h2>
        <a
          href="#"
          className="shrink-0 text-[14px] font-bold leading-none text-[#0B74FF]"
        >
          View all statistic
        </a>
      </div>

      <div className="mt-5 flex h-[14px] overflow-hidden rounded-full bg-[#E5E7EB]">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.className} h-full`}
            aria-label={segment.label}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[13px] font-bold leading-none text-[#A3A3A3]">
              {item.label}
            </p>
            <p className="mt-2 text-[16px] font-semibold leading-none text-[#0F5B47]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
