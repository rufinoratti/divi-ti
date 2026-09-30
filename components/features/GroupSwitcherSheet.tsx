'use client';

import { useState } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, UsersRoundIcon, XIcon } from 'lucide-react';

import { CreateGroupDialog } from '@/components/features/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/features/JoinGroupDialog';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface GroupSwitcherSheetProps {
  groups: Array<{ id: string; name: string }>;
  groupId: string | null;
  groupName: string;
  accountName: string;
  onGroupChange: (groupId: string | null) => void;
}

export function GroupSwitcherSheet({ groups, groupId, groupName, accountName, onGroupChange }: GroupSwitcherSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" className="h-auto max-w-56 flex-col items-start rounded-lg p-0 text-left whitespace-normal hover:bg-transparent" />}
        aria-label={`${groupId ? `Grupo activo: ${groupName}` : 'Vista general de todos tus grupos'}. Abrir selector`}
      >
        <span className="text-sm text-[#5d5d5d]">{groupId ? 'Grupo activo' : `Hola, ${accountName}`}</span>
        <span className="flex max-w-full items-center gap-1 text-base font-bold tracking-[-0.02em]">
          <span className="truncate">{groupId ? groupName : 'Todos tus grupos'}</span>
          <ChevronDownIcon aria-hidden="true" size={16} className="shrink-0 text-[#594ff4] transition-transform duration-200 group-data-[popup-open]:rotate-180" />
        </span>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[82dvh] gap-0 overflow-hidden rounded-t-[28px] border-[#e7e7e7] bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="relative px-5 pb-4 pt-6 pr-16">
          <SheetTitle className="text-xl font-bold tracking-[-0.035em]">Tus grupos</SheetTitle>
          <SheetDescription className="leading-6 text-[#5d5d5d]">
            Elegí un grupo o volvé a la vista general.
          </SheetDescription>
          <SheetClose
            aria-label="Cerrar"
            className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f]"
          >
            <XIcon aria-hidden="true" size={18} />
          </SheetClose>
        </SheetHeader>

        <div className="max-h-[48dvh] overflow-y-auto px-5 pb-3">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant={groupId === null ? 'secondary' : 'outline'}
              aria-pressed={groupId === null}
              onClick={() => {
                onGroupChange(null);
                setOpen(false);
              }}
              className="h-auto min-h-[4.25rem] w-full justify-start gap-3 rounded-2xl px-3 py-2 text-left whitespace-normal"
            >
              <span className={cn(
                'grid size-11 shrink-0 place-items-center rounded-2xl',
                groupId === null ? 'bg-white text-[#594ff4]' : 'bg-[#f6f6f6] text-[#5d5d5d]',
              )}>
                <UsersRoundIcon aria-hidden="true" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">Todos tus grupos</span>
                <span className="mt-0.5 block text-xs text-[#5d5d5d]">
                  {groupId === null ? 'Vista general activa' : 'Actividad y balances generales'}
                </span>
              </span>
              {groupId === null
                ? <CheckIcon aria-hidden="true" size={19} className="shrink-0" />
                : <ChevronRightIcon aria-hidden="true" size={19} className="shrink-0 text-[#888888]" />}
            </Button>

            {groups.map((group) => {
              const isActive = group.id === groupId;

              return (
                <Button
                  key={group.id}
                  type="button"
                  variant={isActive ? 'secondary' : 'outline'}
                  aria-pressed={isActive}
                  onClick={() => {
                    onGroupChange(group.id);
                    setOpen(false);
                  }}
                  className="h-auto min-h-[4.25rem] w-full justify-start gap-3 rounded-2xl px-3 py-2 text-left whitespace-normal"
                >
                  <span className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-2xl',
                    isActive ? 'bg-white text-[#594ff4]' : 'bg-[#f6f6f6] text-[#5d5d5d]',
                  )}>
                    <UsersRoundIcon aria-hidden="true" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{group.name}</span>
                    <span className="mt-0.5 block text-xs text-[#5d5d5d]">
                      {isActive ? 'Grupo activo' : 'Cambiar a este grupo'}
                    </span>
                  </span>
                  {isActive
                    ? <CheckIcon aria-hidden="true" size={19} className="shrink-0" />
                    : <ChevronRightIcon aria-hidden="true" size={19} className="shrink-0 text-[#888888]" />}
                </Button>
              );
            })}
          </div>
        </div>

        <SheetFooter className="mt-auto border-t border-[#e7e7e7] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <JoinGroupDialog compact />
          <CreateGroupDialog compact />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
