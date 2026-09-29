'use client';

import { Avatar } from '@/components/layout/Avatar';
import { GroupSwitcherSheet } from '@/components/features/GroupSwitcherSheet';
import { BellIcon } from 'lucide-react';
import { type Member } from '@/lib/ledger';

interface HeaderProps {
  currentMemberId: string;
  members: Member[];
  groups: Array<{ id: string; name: string }>;
  groupId: string;
  groupName: string;
  onGroupChange: (groupId: string) => void;
  onActivityClick: () => void;
}

export function Header({ currentMemberId, members, groups, groupId, groupName, onGroupChange, onActivityClick }: HeaderProps) {
  const member = members.find((m) => m.id === currentMemberId) ?? members[0];

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div>
          <GroupSwitcherSheet
            groups={groups}
            groupId={groupId}
            groupName={groupName}
            onGroupChange={onGroupChange}
          />
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
