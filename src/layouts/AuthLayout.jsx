import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/40 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-violet-500/35 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[80px]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(255_255_255/0.08),_transparent_55%)]" />

      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-14"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 text-xl font-bold text-white shadow-xl shadow-indigo-500/40 ring-2 ring-white/20 sm:mb-5">
            S
          </div>
          <h1 className="bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-3xl">
            School Management Suite
          </h1>
          <p className="mx-auto mt-2 max-w-md px-2 text-sm leading-relaxed text-slate-400 sm:mt-3">
            Secure access to schedules, people, and classes — sign in to continue to your workspace.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/50 via-violet-500/40 to-cyan-400/30 opacity-75 blur-sm" />
          <div className="relative">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
