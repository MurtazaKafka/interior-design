export const PageBanner = () => (
  <header className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <span className="pillar-heading text-[var(--foreground-subtle)]">Art Direction Studio</span>
      <h1 className="text-4xl font-semibold tracking-tight md:text-[2.8rem]">Artspace Interior</h1>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="supporting-copy max-w-2xl">
        Residences composed through museum-grade artwork and architectural linework. Upload a floorplan,
        define your influences, and iterate the composition through dialogue.
      </p>
      <div className="flex items-center gap-4 text-[0.65rem] uppercase tracking-[0.4em] text-[var(--foreground-subtle)]">
        <span className="text-[var(--accent)]">01 Upload</span>
        <span className="h-px w-10 bg-[var(--border-strong)]" />
        <span>02 Curate</span>
        <span className="h-px w-10 bg-[var(--border-strong)]" />
        <span>03 Iterate</span>
      </div>
    </div>
  </header>
)
