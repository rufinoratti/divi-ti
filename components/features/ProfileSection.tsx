'use client';

import { UsersIcon } from 'lucide-react';
import { Avatar } from '@/components/layout/Avatar';
import { ProfileRow } from '@/components/layout/ProfileRow';
import { type Member } from '@/lib/ledger';
import { InviteMemberForm } from '@/components/features/InviteMemberForm';

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
          <ProfileRow label="Datos" value="Guardados en tu cuenta" />
        </div>
      </section>
      {canInvite && groupId && <InviteMemberForm groupId={groupId} />}

      <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6" aria-labelledby="members-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="members-title" className="text-xl font-bold tracking-[-0.035em]">Integrantes</h2>
            <p className="mt-1 text-sm text-[#5d5d5d]">Personas que participan de los gastos del grupo.</p>
          </div>
          <span className="rounded-full bg-[#f0efff] px-3 py-1 text-xs font-bold text-[#594ff4]">{members.length}</span>
        </div>
        <div className="mt-5 space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-2xl bg-[#f6f6f6] px-3 py-2.5">
              <Avatar member={member} size="small" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{member.name}</p>
                <p className="text-xs text-[#5d5d5d]">{member.id === currentMemberId ? 'Vos' : 'Integrante del grupo'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6">
        <UsersIcon aria-hidden="true" size={23} className="text-[#594ff4]" strokeWidth={1.8} />
        <h2 className="mt-4 text-xl font-bold tracking-[-0.035em]">Tu espacio compartido</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">
          Tus grupos, integrantes y movimientos quedan vinculados a tu cuenta para que puedas retomarlos cuando quieras.
        </p>
      </section>
    </section>
  );
}
