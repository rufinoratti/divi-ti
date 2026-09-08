'use client';

import { Avatar } from '@/components/layout/Avatar';
import { BellIcon, ChevronRightIcon } from 'lucide-react';
import { type Member } from '@/lib/ledger';

interface HeaderProps {
  currentMemberId: string;
  members: Member[];
  groupName: string;
  onActivityClick: () => void;
  onBalanceClick: () => void;
}

export function Header({ currentMemberId, members, groupName, onActivityClick, onBalanceClick }: HeaderProps) {
  const member = members.find((m) => m.id === currentMemberId) ?? members[0];

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div>
          <p className="text-sm text-[#5d5d5d]">Grupo activo</p>
          <button
            type="button"
            onClick={onBalanceClick}
            className="flex items-center gap-1 text-left text-base font-bold tracking-[-0.02em] active:scale-[0.98]"
          >
            {groupName}
            <ChevronRightIcon aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onActivityClick}
        aria-label="Ver actividad"
        className="grid size-11 place-items-center rounded-full border border-[#e7e7e7] bg-white text-[#1f1f1f] transition active:scale-[0.96]"
      >
        <BellIcon aria-hidden="true" size={19} strokeWidth={1.8} />
      </button>
    </header>
  );
}
