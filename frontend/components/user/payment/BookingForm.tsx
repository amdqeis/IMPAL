import type { PaymentOrder } from "@/data/paymentDummy";

type BookingFormProps = {
  order: PaymentOrder;
};

export function BookingForm({ order }: BookingFormProps) {
  return (
    <section className="rounded-[20px] border border-[#D9D9D9] bg-white/80 p-6 shadow-sm">
      <h2 className="mb-4 text-[18px] font-bold leading-none text-[#0F5B47]">
        Detail Pemesanan
      </h2>

      <div className="grid gap-3">
        <FormField label="Name" value={order.customerName} placeholder="First & Last Name" />
        <FormField label="No. Telp" value={order.phone} placeholder="08123456" />
        <FormField label="Tipe Ruangan" value={order.roomType} placeholder="VIP/Reguler" />
        <FormField
          label="Tanggal Pemesanan"
          value={order.bookingDate}
          placeholder="MM/DD/YY"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField label="Jam Mulai" value={order.startTime} />
          <SelectField label="Jam Selesai" value={order.endTime} />
        </div>
      </div>
    </section>
  );
}

function FormField({
  label,
  placeholder,
  value,
}: {
  label: string;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold text-[#4B5563]">
        {label}
      </span>
      <input
        value={value}
        readOnly
        placeholder={placeholder}
        className="h-[42px] w-full rounded-[10px] border border-[#D1D5DB] bg-[#FAFAFA] px-4 text-[14px] font-medium text-[#334155] outline-none placeholder:text-[#C4C4C4]"
      />
    </label>
  );
}

function SelectField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] font-semibold text-[#4B5563]">
        {label}
      </span>
      <select
        value={value}
        disabled
        className="h-[42px] w-full rounded-[10px] border border-[#D1D5DB] bg-[#FAFAFA] px-4 text-[14px] font-medium text-[#334155] opacity-100 outline-none"
      >
        <option>{value}</option>
      </select>
    </label>
  );
}
