'use client';

export function AppLoading() {
  return (
    <main className="divi-page" aria-busy="true" aria-label="Cargando Divi">
      <div className="divi-page-shell">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="divi-skeleton size-11 rounded-full" />
            <div className="space-y-2">
              <div className="divi-skeleton h-3 w-20 rounded-full" />
              <div className="divi-skeleton h-4 w-32 rounded-full" />
            </div>
          </div>
          <div className="divi-skeleton size-11 rounded-full" />
        </div>

        <div className="mt-8 space-y-2">
          <div className="divi-skeleton h-3 w-24 rounded-full" />
          <div className="divi-skeleton h-8 w-52 rounded-full" />
        </div>

        <div className="mt-5 rounded-[var(--radius-panel)] border border-[#dcd6ff] bg-[#ebe8ff] p-5">
          <div className="divi-skeleton h-3 w-28 rounded-full" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="divi-skeleton h-20 rounded-[var(--radius-control)]" />
            <div className="divi-skeleton h-20 rounded-[var(--radius-control)]" />
          </div>
          <div className="mt-4 flex justify-between border-t border-[#d4cefa] pt-4">
            <div className="divi-skeleton h-3 w-28 rounded-full" />
            <div className="divi-skeleton h-3 w-20 rounded-full" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="divi-skeleton h-14 rounded-full" />
          <div className="divi-skeleton h-14 rounded-full" />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="divi-skeleton h-5 w-40 rounded-full" />
          <div className="divi-skeleton h-4 w-14 rounded-full" />
        </div>
        <div className="app-list mt-4 divide-y divide-line">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-3 px-4 py-3.5">
              <div className="divi-skeleton size-11 rounded-[var(--radius-control)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="divi-skeleton h-4 w-3/4 rounded-full" />
                <div className="divi-skeleton h-3 w-1/2 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="divi-skeleton h-4 w-16 rounded-full" />
                <div className="divi-skeleton ml-auto h-3 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
