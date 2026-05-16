"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import { useToast } from "@/components/sibooking/ToastProvider";
import { ApiError, api, clearAuth, persistAuth } from "@/lib/api";
import { getDashboardPathForRoles, isAllowedForLoginMode, type LoginMode } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("E-mail tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  mode?: LoginMode;
};

const loginConfig = {
  user: {
    redirectTo: "/user/dashboard",
    roleError: "Akun admin/owner harus masuk lewat halaman login admin.",
    submitLabel: "Login",
    demoAccounts: [
      { role: "User", email: "ahmad@gmail.com", password: "123123123A" },
    ],
  },
  admin: {
    redirectTo: "/admin/dashboard",
    roleError: "Akun ini tidak memiliki akses admin/owner.",
    submitLabel: "Login Admin",
    demoAccounts: [
      { role: "Owner", email: "owner@sibooking.test", password: "123123123A" },
      { role: "Admin", email: "admin@sibooking.test", password: "123123123A" },
    ],
  },
} satisfies Record<
  LoginMode,
  {
    redirectTo: string;
    roleError: string;
    submitLabel: string;
    demoAccounts: { role: string; email: string; password: string }[];
  }
>;

export function LoginForm({ mode = "user" }: LoginFormProps) {
  const router = useRouter();
  const toast = useToast();
  const config = loginConfig[mode];
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setError(null);

    try {
      const auth = await api.auth.login({
        email: values.email,
        password: values.password,
      });

      if (!isAllowedForLoginMode(auth.roles, mode)) {
        clearAuth();
        setError(config.roleError);
        toast.error(config.roleError);
        return;
      }

      persistAuth(auth, true);
      toast.success("Login berhasil, diarahkan ke dashboard.");

      router.push(mode === "admin" ? getDashboardPathForRoles(auth.roles) : config.redirectTo);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("E-mail atau kata sandi salah.");
        toast.error("E-mail atau kata sandi salah.");
        return;
      }

      const message = err instanceof Error ? err.message : "Login gagal. Coba lagi.";
      setError(message);
      toast.error(message);
    }
  };

  const handleInvalidSubmit = () => {
    const message = "Periksa kembali data login.";
    setError(message);
    toast.error(message);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}
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
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            {...register("password")}
            className="h-18 w-full rounded-full border border-white/70 bg-[#fffafb] pl-8 pr-20 text-lg font-medium text-[#26463f] shadow-[0_12px_28px_rgba(31,71,54,0.12)] outline-none transition-all duration-300 placeholder:text-[#8a9692] focus:border-[#57a784] focus:shadow-[0_0_0_4px_rgba(88,176,134,0.18),0_12px_28px_rgba(31,71,54,0.12)]"
          />
          <button
            type="button"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#55736b] transition-colors duration-300 hover:bg-[#e8f4ee] hover:text-[#173d35] focus:outline-none focus:ring-4 focus:ring-[rgba(88,176,134,0.18)]"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            )}
          </button>
        </div>
        <FieldError message={errors.password?.message} />
      </div>

      <div className="rounded-[1.15rem] border border-white/55 bg-white/28 px-4 py-3 text-[#193c35] shadow-[0_10px_24px_rgba(31,71,54,0.08)] backdrop-blur-sm">
        <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#31584d]">
          Demo akun
        </p>
        <div className="mt-2 space-y-2">
          {config.demoAccounts.map((account) => (
            <div
              key={account.email}
              className="rounded-[0.95rem] bg-white/50 px-3 py-2.5 text-[0.82rem] font-semibold text-[#23463d] shadow-[0_6px_14px_rgba(31,71,54,0.06)]"
            >
              <p className="text-[0.92rem] font-black text-[#173d35]">{account.role}</p>
              <p className="mt-1 break-all">Email: {account.email}</p>
              <p className="break-all">Password: {account.password}</p>
            </div>
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-[1.5rem] border border-[#e9a3a9] bg-[#fff4f5] px-5 py-4 text-sm font-semibold text-[#b14250] shadow-[0_12px_24px_rgba(177,66,80,0.08)]">
          {error}
        </div>
      ) : null}

      <div className="pt-2 sm:pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-[#fff8fb] px-10 py-4 text-3xl font-black text-[#1c433a] shadow-[0_16px_28px_rgba(31,71,54,0.16)] transition-all duration-300 ease-out hover:scale-105 hover:bg-white hover:shadow-[0_22px_34px_rgba(31,71,54,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:bg-white/70 disabled:text-[#55736b] disabled:shadow-none"
        >
          {isSubmitting ? "Loading..." : config.submitLabel}
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
