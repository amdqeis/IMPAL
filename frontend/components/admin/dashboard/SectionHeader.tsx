type SectionHeaderProps = {
  title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div>
      <h2 className="text-[18px] font-bold leading-none text-[#111827]">
        {title}
      </h2>
      <div className="mt-4 h-[4px] w-[64px] rounded-full bg-[#F59E0B]" />
    </div>
  );
}
