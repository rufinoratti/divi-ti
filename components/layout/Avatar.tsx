'use client';

import { type Member } from '@/lib/ledger';

interface AvatarProps {
  member: Member;
  size?: 'small' | 'regular';
}

export function Avatar({ member, size = 'regular' }: AvatarProps) {
  const dimensions = size === 'small' ? 'size-8 text-[10px]' : 'size-11 text-xs';

  return (
    <span
      aria-label={member.name}
      className={`grid ${dimensions} shrink-0 place-items-center rounded-full bg-[#594ff4] font-semibold tracking-[0.08em] text-white`}
    >
      {member.initials}
    </span>
  );
}
