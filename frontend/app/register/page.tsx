"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { api, persistAuth } from "@/lib/api";

const registerSchema = z
  .object({
    nama: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("E-mail tidak valid"),
    no_hp: z.string().min(11, "No.HP minimal 11 digit").max(12, "No.HP maksimal 12 digit"),
    password: z.string().min(8, "Kata sandi minimal 8 karakter"),
    confirmPassword: z.string().min(8, "Konfirmasi sandi wajib diisi"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi sandi tidak sama",
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    setError(null);
    const auth = await api.auth.register({
      nama: values.nama,
      email: values.email,
      no_hp: values.no_hp,
      password: values.password,
    });
    persistAuth(auth, true);
    router.push("/user/dashboard");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#8ed25c] text-[#183832]">
      <div className="absolute inset-0 bg-[linear-gradient(100deg,_#4eaabd_0%,_#66c59d_48%,_#94de5c_100%)]" />
      <div className="absolute inset-0 opacity-[0.08]">
        {Array.from({ length: 48 }).map((_, index) => (
          <span
            key={`sbs-register-${index}`}
            className="absolute select-none text-[4.2rem] font-black uppercase tracking-normal text-white"
            style={{ left: `${(index % 8) * 14}%`, top: `${Math.floor(index / 8) * 16}%`, transform: "rotate(-45deg)" }}
          >
            SBS
          </span>
        ))}
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[580px] flex-col justify-center px-6 py-8">
        <h1 className="mb-7 text-center text-[70px] font-black leading-none text-[#173b34] drop-shadow-[0_8px_10px_rgba(16,52,45,0.18)] sm:text-[88px]">
          Daftar Akun
        </h1>
        <form onSubmit={handleSubmit(onSubmit, () => setError("Periksa kembali data pendaftaran."))} className="space-y-3">
          {error ? <p className="rounded-lg bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#B91C1C]">{error}</p> : null}
          <RegisterField label="Nama" error={errors.nama?.message} inputProps={register("nama")} />
          <RegisterField label="E-mail" type="email" error={errors.email?.message} inputProps={register("email")} />
          <RegisterField label="No.HP" error={errors.no_hp?.message} inputProps={register("no_hp")} />
          <RegisterField label="Kata Sandi" type="password" error={errors.password?.message} inputProps={register("password")} />
          <RegisterField label="Konfirmasi Sandi" type="password" error={errors.confirmPassword?.message} inputProps={register("confirmPassword")} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mx-auto mt-8 block rounded-full bg-[#fff8fb] px-10 py-3 text-[30px] font-black leading-none text-[#1c433a] shadow-[0_12px_24px_rgba(31,71,54,0.16)] disabled:opacity-70"
          >
            {isSubmitting ? "..." : "Daftar"}
          </button>
        </form>
        <Link href="/login" className="mt-5 text-center text-[18px] font-bold text-[#173b34]">
          Sudah punya akun? Login
        </Link>
      </section>
    </main>
  );
}

function RegisterField({
  label,
  type = "text",
  error,
  inputProps,
}: {
  label: string;
  type?: string;
  error?: string;
  inputProps: object;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[30px] font-black leading-none text-[#173d35]">{label}</span>
      <input
        type={type}
        {...inputProps}
        className="h-[50px] w-full rounded-full border border-white/70 bg-[#fffafb] px-7 text-lg font-bold text-[#26463f] shadow-[0_10px_22px_rgba(31,71,54,0.12)] outline-none focus:border-[#57a784]"
      />
      {error ? <span className="mt-1 block text-sm font-bold text-[#B91C1C]">{error}</span> : null}
    </label>
  );
}
