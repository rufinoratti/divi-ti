'use client';

import { Avatar } from '@/components/layout/Avatar';
import { GroupSwitcherSheet } from '@/components/features/GroupSwitcherSheet';
import { PaymentNotificationsSheet } from '@/components/features/PaymentNotificationsSheet';
import { type Member } from '@/lib/ledger';

interface HeaderProps {
  currentMemberId: string | null;
  members: Member[];
  profileMember: Member;
  groups: Array<{ id: string; name: string }>;
  groupId: string | null;
  groupName: string;
  accountName: string;
  onGroupChange: (groupId: string | null) => void;
  onPaymentsChanged: () => void;
}

export function Header({ currentMemberId, members, profileMember, groups, groupId, groupName, accountName, onGroupChange, onPaymentsChanged }: HeaderProps) {
  const member = members.find((m) => m.id === currentMemberId) ?? profileMember;

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar member={member} />
        <div>
          <GroupSwitcherSheet
            groups={groups}
            groupId={groupId}
            groupName={groupName}
            accountName={accountName}
            onGroupChange={onGroupChange}
          />
        </div>
      </div>
      <PaymentNotificationsSheet onPaymentUpdated={onPaymentsChanged} />
    </header>
  );
}
