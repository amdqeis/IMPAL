type PaginationProps = {
  items: string[];
  activePage: string;
};

export function Pagination({ items, activePage }: PaginationProps) {
  return (
    <nav className="mt-10 flex items-center justify-end overflow-x-auto pb-1">
      <div className="flex overflow-hidden rounded-full border border-black bg-white">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = item === activePage;

          return (
            <button
              key={`${item}-${index}`}
              className={`flex h-[40px] w-[48px] items-center justify-center text-[20px] leading-none transition hover:bg-[#F8FAFC] ${
                isLast ? "" : "border-r border-black"
              } ${
                isActive
                  ? "font-bold text-black"
                  : "font-medium text-[#94A3B8]"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
