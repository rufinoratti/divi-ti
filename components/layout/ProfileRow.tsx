'use client';

interface ProfileRowProps {
  label: string;
  value: string;
}

export function ProfileRow({ label, value }: ProfileRowProps) {
  return (
    <div className="flex items-start justify-between gap-5">
      <p className="text-copy-muted">{label}</p>
      <p className="max-w-[13rem] text-right font-bold text-ink">{value}</p>
    </div>
  );
}
