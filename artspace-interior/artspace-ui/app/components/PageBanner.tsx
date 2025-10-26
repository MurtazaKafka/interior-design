export const PageBanner = () => (
  <header className="flex flex-col items-center gap-12 py-20 text-center border-b border-[var(--border)]">
    <div className="flex flex-col gap-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">
        Spatial Design Studio
      </p>
      <h1 className="serif max-w-4xl text-5xl leading-[1.1] tracking-[-0.01em] md:text-6xl lg:text-7xl">
        Compose Your Interior
      </h1>
    </div>
    <div className="flex flex-col items-center gap-10">
      <p className="supporting-copy max-w-3xl text-lg text-[var(--foreground-subtle)]">
        Upload architectural plans, curate mood references, and guide the process with your personal style.
        Experience how <span className="text-[var(--accent)]">AI</span> transforms every intention into a polished
        <span className="text-[var(--accent)]"> 3D</span> interior you can explore.
      </p>
      <div className="flex items-center justify-center gap-8 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)]">
            <span className="serif text-lg font-semibold">I</span>
          </div>
          <span className="text-[var(--foreground-subtle)]">Import</span>
        </div>
        <span className="h-[1px] w-16 bg-[var(--border)]" />
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)]">
            <span className="serif text-lg font-semibold">II</span>
          </div>
          <span className="text-[var(--foreground-subtle)]">Direct</span>
        </div>
        <span className="h-[1px] w-16 bg-[var(--border)]" />
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--accent)] text-[var(--accent)]">
            <span className="serif text-lg font-semibold">III</span>
          </div>
          <span className="text-[var(--foreground-subtle)]">Inhabit</span>
        </div>
      </div>
    </div>
  </header>
)
