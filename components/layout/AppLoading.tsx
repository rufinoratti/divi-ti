'use client';

export function AppLoading() {
  return (
    <main className="min-h-[100dvh] bg-white px-5 py-6 text-[#1f1f1f]">
      <div className="mx-auto max-w-[500px] animate-pulse space-y-7">
        <div className="flex items-center justify-between">
          <div className="h-11 w-36 rounded-full bg-[#f6f6f6]" />
          <div className="size-11 rounded-full bg-[#f6f6f6]" />
        </div>
        <div className="h-56 rounded-[30px] bg-[#f6f6f6]" />
        <div className="h-6 w-40 rounded-full bg-[#f6f6f6]" />
        <div className="h-44 rounded-[30px] bg-[#f6f6f6]" />
      </div>
    </main>
  );
}
