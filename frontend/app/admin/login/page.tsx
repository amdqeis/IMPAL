import Image from "next/image";

import { LoginForm } from "@/app/login/login-form";
import { AuthPageGuard } from "@/components/sibooking/AuthPageGuard";

export default function AdminLoginPage() {
  return (
    <AuthPageGuard>
      <main className="relative min-h-screen overflow-hidden bg-[#8ed25c] text-[#183832]">
      <div className="absolute inset-0 bg-[linear-gradient(100deg,_#4eaabd_0%,_#66c59d_48%,_#94de5c_100%)]" />
      <div className="absolute inset-0 opacity-[0.08]">
        {Array.from({ length: 42 }).map((_, index) => (
          <span
            key={`sbs-admin-pattern-${index}`}
            className="absolute select-none text-[4.2rem] font-black uppercase tracking-normal text-white"
            style={{
              left: `${(index % 6) * 17}%`,
              top: `${Math.floor(index / 6) * 12}%`,
              transform: "rotate(-45deg)",
            }}
          >
            SBS
          </span>
        ))}
      </div>

      <section className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-14 xl:px-20">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div className="login-fade-up flex flex-col justify-center">
            <div className="max-w-[34rem]">
              <div className="font-[family-name:var(--font-display)] text-[4.35rem] font-black leading-[0.84] tracking-normal text-[#173b34] drop-shadow-[0_8px_10px_rgba(16,52,45,0.18)] sm:text-[5.9rem] xl:text-[6.8rem]">
                ADMIN LOGIN
              </div>
              <p className="-mt-1 text-2xl font-medium text-[#355057] sm:text-[2.3rem]">
                SiBooking management
              </p>

              <div className="mt-16 max-w-[33rem] text-[#314a50]">
                <h1 className="text-2xl font-extrabold sm:text-[2.15rem]">
                  Halo, Selamat Bertugas.
                </h1>
                <p className="mt-5 text-xl font-semibold leading-8 sm:text-[2rem] sm:leading-10">
                  Masuk untuk mengelola cabang, jadwal, reservasi, dan laporan
                  operasional SiBooking.
                </p>
              </div>

              <div className="login-fade-up mt-12 flex items-center gap-4 [animation-delay:180ms]">
                <div className="floating-icon flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-[0_12px_28px_rgba(24,56,50,0.14)]">
                  <Image
                    src="/Logo Sibooking.png"
                    alt="SiBooking logo"
                    width={34}
                    height={34}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="rounded-full border border-white/30 bg-white/16 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-[#264740]/72 shadow-[0_12px_28px_rgba(24,56,50,0.08)] backdrop-blur-sm">
                  Admin and owner access
                </div>
              </div>
            </div>
          </div>

          <div className="right-visual-enter flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[37rem] rounded-[2.2rem] border border-white/18 bg-white/10 p-6 shadow-[0_22px_80px_rgba(18,57,48,0.14)] backdrop-blur-md sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
              <LoginForm mode="admin" />
            </div>
          </div>
        </div>
      </section>
      </main>
    </AuthPageGuard>
  );
}
