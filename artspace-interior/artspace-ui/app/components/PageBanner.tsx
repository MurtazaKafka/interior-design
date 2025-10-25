export const PageBanner = () => (
  <header className="flex flex-col items-center gap-10 py-16 text-center">
    <div className="flex flex-col gap-5">
      <span className="pillar-heading">Transform Your Space with AI</span>
      <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl">
        Design Your Perfect Room
      </h1>
    </div>
    <div className="flex flex-col items-center gap-10">
      <p className="supporting-copy max-w-3xl text-lg">
        Experience the future of interior design. Upload your room's floorplan, choose your style preferences,
        and watch as <span className="text-[var(--accent)]">AI</span> transforms your space into a stunning
        <span className="text-[var(--accent)]"> 3D</span> visualization.
      </p>
      <div className="flex items-center justify-center gap-10 text-base font-medium">
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-[var(--accent)]">1</span>
          <span>Upload Floorplan</span>
        </div>
        <span className="h-0.5 w-12 bg-[var(--border)]" />
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-[var(--accent)]">2</span>
          <span>Choose Style</span>
        </div>
        <span className="h-0.5 w-12 bg-[var(--border)]" />
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-[var(--accent)]">3</span>
          <span>Get 3D Design</span>
        </div>
      </div>
    </div>
  </header>
)
