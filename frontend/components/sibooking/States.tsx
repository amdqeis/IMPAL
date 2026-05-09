export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[8px] border border-[#DCEFE4] bg-white/70 text-[16px] font-bold text-[#6B7280]">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[14px] font-bold text-[#B91C1C]">
      {message}
    </div>
  );
}

export function EmptyState({ message = "Belum ada data." }: { message?: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-[8px] border border-dashed border-[#BFD9CB] bg-white/60 text-[16px] font-bold text-[#6B7280]">
      {message}
    </div>
  );
}
