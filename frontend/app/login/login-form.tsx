"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.auth.login({
        email,
        password,
      });

      if (typeof window !== "undefined" && data?.token) {
        if (rememberMe) {
          window.localStorage.setItem("sibooking_token", data.token);
        } else {
          window.sessionStorage.setItem("sibooking_token", data.token);
        }
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="login-fade-up w-full max-w-[33rem] space-y-6 [animation-delay:120ms]"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-3 block text-[2rem] leading-none font-black text-[#173d35] sm:text-[3.1rem]"
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Masukkan e-mail"
          autoComplete="email"
          inputMode="email"
          required
          className="h-18 w-full rounded-full border border-white/70 bg-[#fffafb] px-8 text-lg font-medium text-[#26463f] shadow-[0_12px_28px_rgba(31,71,54,0.12)] outline-none transition-all duration-300 placeholder:text-[#8a9692] focus:border-[#57a784] focus:shadow-[0_0_0_4px_rgba(88,176,134,0.18),0_12px_28px_rgba(31,71,54,0.12)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-3 block text-[2rem] leading-none font-black text-[#173d35] sm:text-[3.1rem]"
        >
          Kata Sandi
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan kata sandi"
          autoComplete="current-password"
          required
          className="h-18 w-full rounded-full border border-white/70 bg-[#fffafb] px-8 text-lg font-medium text-[#26463f] shadow-[0_12px_28px_rgba(31,71,54,0.12)] outline-none transition-all duration-300 placeholder:text-[#8a9692] focus:border-[#57a784] focus:shadow-[0_0_0_4px_rgba(88,176,134,0.18),0_12px_28px_rgba(31,71,54,0.12)]"
        />
      </div>

      <div className="flex flex-col gap-4 pt-1 text-lg font-bold text-[#193c35] sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
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
          disabled={loading}
          className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-[#fff8fb] px-10 py-4 text-3xl font-black text-[#1c433a] shadow-[0_16px_28px_rgba(31,71,54,0.16)] transition-all duration-300 ease-out hover:scale-105 hover:bg-white hover:shadow-[0_22px_34px_rgba(31,71,54,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:scale-100 disabled:bg-white/70 disabled:text-[#55736b] disabled:shadow-none"
        >
          {loading ? "Loading..." : "Login"}
        </button>
      </div>
    </form>
  );
}
