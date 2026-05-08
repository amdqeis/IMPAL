import Image from "next/image";

export function PaymentMethod() {
  return (
    <section className="min-h-[368px] rounded-[20px] border border-[#D9D9D9] bg-white/80 p-6 shadow-sm">
      <h2 className="text-[18px] font-bold leading-none text-[#0F5B47]">
        Payment Method
      </h2>

      <button className="mt-3 flex h-[140px] w-[132px] flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-[#3B82F6] bg-white">
        <Image
          src="/Qris.png"
          alt="QRIS"
          width={88}
          height={88}
          className="h-[82px] w-[82px] object-contain"
        />
        <span className="text-[18px] font-extrabold leading-none text-black">
          QRIS
        </span>
      </button>
    </section>
  );
}
