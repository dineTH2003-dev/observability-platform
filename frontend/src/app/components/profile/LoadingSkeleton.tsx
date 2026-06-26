export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/8 bg-nebula-navy-light p-6">
        <div className="h-4 w-28 animate-pulse rounded-full bg-nebula-navy-dark" />
        <div className="mt-4 h-9 w-64 animate-pulse rounded bg-nebula-navy-dark" />
        <div className="mt-3 h-4 w-[32rem] max-w-full animate-pulse rounded bg-nebula-navy-dark" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-white/8 bg-nebula-navy-light p-6">
          <div className="mx-auto h-32 w-32 animate-pulse rounded-full bg-nebula-navy-dark" />
          <div className="mt-6 h-7 animate-pulse rounded bg-nebula-navy-dark" />
          <div className="mt-3 h-5 w-32 animate-pulse rounded-full bg-nebula-navy-dark" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-nebula-navy-dark" />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-nebula-navy-dark" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/8 bg-nebula-navy-light p-6">
            <div className="h-5 w-40 animate-pulse rounded-full bg-nebula-navy-dark" />
            <div className="mt-4 h-8 w-64 animate-pulse rounded bg-nebula-navy-dark" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-nebula-navy-dark" />
                  <div className="h-12 animate-pulse rounded-2xl bg-nebula-navy-dark" />
                </div>
              ))}
            </div>
            <div className="mt-4 h-28 animate-pulse rounded-2xl bg-nebula-navy-dark" />
          </div>

          <div className="rounded-[28px] border border-white/8 bg-nebula-navy-light p-6">
            <div className="h-5 w-32 animate-pulse rounded-full bg-nebula-navy-dark" />
            <div className="mt-4 h-8 w-52 animate-pulse rounded bg-nebula-navy-dark" />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-nebula-navy-dark" />
                  <div className="h-12 animate-pulse rounded-2xl bg-nebula-navy-dark" />
                </div>
              ))}
            </div>
            <div className="mt-6 h-24 animate-pulse rounded-[24px] bg-nebula-navy-dark" />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-red-500/20 bg-nebula-navy-light p-6">
        <div className="h-5 w-32 animate-pulse rounded-full bg-nebula-navy-dark" />
        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-nebula-navy-dark" />
        <div className="mt-3 h-4 w-[28rem] max-w-full animate-pulse rounded bg-nebula-navy-dark" />
      </div>
    </div>
  );
}
