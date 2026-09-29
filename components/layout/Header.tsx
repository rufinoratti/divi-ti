'use client';

import { Avatar } from '@/components/layout/Avatar';
import { BellIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { type Member } from '@/lib/ledger';

interface HeaderProps {
  currentMemberId: string;
  members: Member[];
  groups: Array<{ id: string; name: string }>;
  groupId: string;
  groupName: string;
  onGroupChange: (groupId: string) => void;
  onActivityClick: () => void;
  onBalanceClick: () => void;
}

export function Header({ currentMemberId, members, groups, groupId, groupName, onGroupChange, onActivityClick, onBalanceClick }: HeaderProps) {
  const member = members.find((m) => m.id === currentMemberId) ?? members[0];

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div>
          <p className="text-sm text-[#5d5d5d]">Grupo activo</p>
          {groups.length > 1 ? (
            <div className="relative max-w-56">
              <select
                aria-label="Grupo activo"
                value={groupId}
                onChange={(event) => onGroupChange(event.target.value)}
                className="max-w-full appearance-none rounded-md bg-transparent pr-6 text-base font-bold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-[#594ff4]"
              >
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
              <ChevronDownIcon aria-hidden="true" size={16} className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
            </div>
          ) : (
            <button
              type="button"
              onClick={onBalanceClick}
              className="flex items-center gap-1 text-left text-base font-bold tracking-[-0.02em] active:scale-[0.98]"
            >
              {groupName}
              <ChevronRightIcon aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          )}
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
