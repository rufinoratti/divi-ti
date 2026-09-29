'use client';

import { UsersIcon } from 'lucide-react';
import { Avatar } from '@/components/layout/Avatar';
import { ProfileRow } from '@/components/layout/ProfileRow';
import { type Member } from '@/lib/ledger';
import { InviteMemberForm } from '@/components/features/InviteMemberForm';
import { CreateGroupDialog } from '@/components/features/CreateGroupDialog';

interface ProfileSectionProps {
  currentMemberId: string;
  members: Member[];
  groupName: string;
  groupId: string | null;
  canInvite: boolean;
}

export function ProfileSection({ currentMemberId, members, groupName, groupId, canInvite }: ProfileSectionProps) {
  const currentMember = members.find((m) => m.id === currentMemberId) ?? members[0];

  return (
    <section className="mt-8" aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-3xl font-bold tracking-[-0.045em]">Perfil</h1>
      <section className="mt-7 rounded-[30px] bg-[#f6f6f6] p-6">
        <div className="flex items-center gap-4">
          <Avatar member={currentMember} />
          <div>
            <p className="text-lg font-bold tracking-[-0.03em]">{currentMember?.name ?? 'Integrante'}</p>
            <p className="text-sm text-[#5d5d5d]">Integrante de {groupName || 'tu grupo'}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4 border-t border-[#e7e7e7] pt-5 text-sm">
          <ProfileRow label="Idioma" value="Español" />
          <ProfileRow label="Moneda" value="Pesos argentinos (ARS)" />
          <ProfileRow label="Datos" value="Guardados en este dispositivo" />
        </div>
      </section>
      {canInvite && groupId && <InviteMemberForm groupId={groupId} />}

      <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6">
        <UsersIcon aria-hidden="true" size={23} className="text-[#594ff4]" strokeWidth={1.8} />
        <h2 className="mt-4 text-xl font-bold tracking-[-0.035em]">Tu espacio compartido</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">
          Tus grupos, integrantes y movimientos quedan vinculados a tu cuenta para que puedas retomarlos cuando quieras.
        </p>
      </section>
      <CreateGroupDialog />
    </section>
  );
}
