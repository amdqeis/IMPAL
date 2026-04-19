import Image from "next/image";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#8fd25f] text-[#23352f]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),linear-gradient(90deg,_#4ba6be_0%,_#68c49f_46%,_#95dc5b_100%)]" />
      

      <section className="relative z-10 flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="floating-icon flex h-30 w-30 items-center justify-center">
              <Image
                src="/Logo Sibooking(White).png"
                alt="Logo"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <div className="text-3xl font-extrabold text-[#1f443a] drop-shadow-[0_6px_10px_rgba(255,255,255,0.2)] md:text-4xl">
              SiBooking
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 items-center lg:items-start">
          <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,620px)_1fr] lg:items-start">
            <div className="max-w-xl pt-2 lg:pt-0">
              <h1 className="max-w-lg font-[family-name:var(--font-playfair)] text-[3.35rem] leading-[0.9] font-semibold tracking-[-0.04em] text-[#1e312a] sm:text-[4.5rem]">
                The Fun of Playing Together
              </h1>
              <p className="mt-5 max-w-xl text-xl leading-8 font-semibold text-[#30443d]/85 sm:text-[2rem] sm:leading-10">
                Enjoy every shot, every laugh, and every moment around the
                table.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a
                  href="/login"
                  className="inline-flex min-w-[14rem] items-center justify-center rounded-[0.2rem] bg-[#1f4736] px-8 py-5 text-xl font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_18px_40px_rgba(31,71,54,0.28)] transition-all duration-300 ease-out hover:scale-105 hover:bg-[#1a3c2d] hover:shadow-[0_24px_48px_rgba(31,71,54,0.36)] active:scale-[0.98]"
                >
                  <p className="text-white">Play Now</p>
                </a>
              </div>
            </div>

            <div className="right-visual-enter relative hidden min-h-[44rem] items-center justify-center lg:flex">
              <div className="floating-icon-slow relative flex h-[26rem] w-[26rem] items-center justify-center rounded-full bg-white/12 shadow-[0_24px_60px_rgba(31,71,54,0.18)] backdrop-blur-sm">
                <Image
                  src="/billiard-ball(Dashboard User).png"
                  alt="Billiard ball icon"
                  width={320}
                  height={320}
                  className="floating-tilt h-auto w-[18rem] object-contain drop-shadow-[0_20px_30px_rgba(31,71,54,0.22)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
