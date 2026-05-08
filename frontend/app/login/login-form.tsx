"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ApiError, api, persistAuth } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("E-mail tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  rememberMe: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);

    try {
      const auth = await api.auth.login({
        email: values.email,
        password: values.password,
      });

      persistAuth(auth, values.rememberMe);

      const roles = auth.roles.map((role) => role.toLowerCase());
      router.push(roles.includes("admin") ? "/admin/dashboard" : "/user/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("E-mail atau kata sandi salah.");
        return;
      }

      setError(err instanceof Error ? err.message : "Login gagal. Coba lagi.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () => setError("Periksa kembali data login."))}
      className="login-fade-up w-full max-w-[33rem] space-y-6 [animation-delay:120ms]"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-3 block text-[2rem] font-black leading-none text-[#173d35] sm:text-[3.1rem]"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Masukkan e-mail"
          {...register("email")}
          className="h-18 w-full rounded-full border border-white/70 bg-[#fffafb] px-8 text-lg font-medium text-[#26463f] shadow-[0_12px_28px_rgba(31,71,54,0.12)] outline-none transition-all duration-300 placeholder:text-[#8a9692] focus:border-[#57a784] focus:shadow-[0_0_0_4px_rgba(88,176,134,0.18),0_12px_28px_rgba(31,71,54,0.12)]"
        />
        <FieldError message={errors.email?.message} />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-3 block text-[2rem] font-black leading-none text-[#173d35] sm:text-[3.1rem]"
        >
          Kata Sandi
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          {...register("password")}
          className="h-18 w-full rounded-full border border-white/70 bg-[#fffafb] px-8 text-lg font-medium text-[#26463f] shadow-[0_12px_28px_rgba(31,71,54,0.12)] outline-none transition-all duration-300 placeholder:text-[#8a9692] focus:border-[#57a784] focus:shadow-[0_0_0_4px_rgba(88,176,134,0.18),0_12px_28px_rgba(31,71,54,0.12)]"
        />
        <FieldError message={errors.password?.message} />
      </div>

      <div className="flex flex-col gap-4 pt-1 text-lg font-bold text-[#193c35] sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            {...register("rememberMe")}
            className="h-10 w-10 appearance-none rounded-full border border-white/70 bg-white shadow-[0_8px_18px_rgba(31,71,54,0.12)] transition-colors duration-300 checked:border-[#1f4736] checked:bg-[#1f4736]"
          />
          <span>Ingat saya</span>
        </label>
        <button
          type="button"
          className="text-left transition-colors duration-300 hover:text-[#102a24] sm:text-right"
        >
          Lupa Sandi ?
        </button>
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-[#e9a3a9] bg-[#fff4f5] px-5 py-4 text-sm font-semibold text-[#b14250] shadow-[0_12px_24px_rgba(177,66,80,0.08)]">
          {error}
        </div>
      ) : null}

      <div className="pt-4 sm:pt-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-[#fff8fb] px-10 py-4 text-3xl font-black text-[#1c433a] shadow-[0_16px_28px_rgba(31,71,54,0.16)] transition-all duration-300 ease-out hover:scale-105 hover:bg-white hover:shadow-[0_22px_34px_rgba(31,71,54,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:bg-white/70 disabled:text-[#55736b] disabled:shadow-none"
        >
          {isSubmitting ? "Loading..." : "Login"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm font-bold text-[#b14250]">{message}</p>;
}
