'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOutIcon, UsersIcon } from 'lucide-react';
import { Avatar } from '@/components/layout/Avatar';
import { ProfileRow } from '@/components/layout/ProfileRow';
import { type Member } from '@/lib/ledger';
import { InviteMemberForm } from '@/components/features/InviteMemberForm';
import { CreateGroupDialog } from '@/components/features/CreateGroupDialog';
import { GroupJoinCode } from '@/components/features/GroupJoinCode';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProfileSectionProps {
  currentMemberId: string;
  members: Member[];
  groupName: string;
  groupId: string | null;
  groupJoinCode: string;
  canInvite: boolean;
}

export function ProfileSection({ currentMemberId, members, groupName, groupId, groupJoinCode, canInvite }: ProfileSectionProps) {
  const currentMember = members.find((m) => m.id === currentMemberId) ?? members[0];
  const { logout } = useAuth();
  const router = useRouter();
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  }

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
      {groupJoinCode && <GroupJoinCode code={groupJoinCode} groupName={groupName || 'tu grupo'} />}
      {canInvite && groupId && <InviteMemberForm groupId={groupId} />}

      <section className="mt-7 rounded-[30px] border border-[#e7e7e7] p-6">
        <UsersIcon aria-hidden="true" size={23} className="text-[#594ff4]" strokeWidth={1.8} />
        <h2 className="mt-4 text-xl font-bold tracking-[-0.035em]">Tu espacio compartido</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d5d5d]">
          Tus grupos, integrantes y movimientos quedan vinculados a tu cuenta para que puedas retomarlos cuando quieras.
        </p>
      </section>
      <CreateGroupDialog />

      <section className="mt-8 border-t border-[#e7e7e7] pt-6" aria-label="Sesión">
        <button
          type="button"
          onClick={() => setLogoutConfirmationOpen(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f0c8c4] px-5 text-sm font-bold text-[#b42318] transition hover:bg-[#fef4f4] active:scale-[0.98]"
        >
          <LogOutIcon aria-hidden="true" size={17} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </section>

      <AlertDialog open={logoutConfirmationOpen} onOpenChange={setLogoutConfirmationOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-[28px] border border-[#e7e7e7] bg-white p-6 sm:max-w-sm">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-xl font-bold tracking-[-0.035em]">
              ¿Querés cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-[#5d5d5d]">
              Vas a salir de tu cuenta de Divi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mx-0 mb-0 grid grid-cols-2 gap-3 rounded-none border-0 bg-transparent p-0">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="min-h-12 rounded-full border-[#e7e7e7] bg-white px-4 text-sm font-bold text-[#1f1f1f] hover:bg-[#f6f6f6]"
            >
              No, quedarme
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoggingOut}
              onClick={() => { void handleLogout(); }}
              className="min-h-12 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white hover:bg-[#912018]"
            >
              {isLoggingOut ? 'Saliendo...' : 'Sí, cerrar sesión'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
