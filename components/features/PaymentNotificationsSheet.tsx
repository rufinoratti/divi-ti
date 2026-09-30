'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellIcon, CheckIcon, XIcon } from 'lucide-react';

import { type PaymentNotification } from '@/lib/ledger';
import { formatARS } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface PaymentNotificationsSheetProps {
  onPaymentUpdated: () => void;
}

function notificationMessage(notification: PaymentNotification) {
  const { payment } = notification;
  const movementContext = payment.movementDescription ? ` por ${payment.movementDescription}` : '';
  if (notification.type === 'pago_informado' && payment.status === 'confirmada') {
    return `Confirmaste que ${payment.fromMemberName} te pagó ${formatARS(payment.amount)}${movementContext}.`;
  }
  if (notification.type === 'pago_informado' && payment.status === 'rechazada') {
    return `Marcaste que no recibiste el pago de ${payment.fromMemberName} (${formatARS(payment.amount)})${movementContext}.`;
  }
  if (notification.type === 'pago_confirmado') {
    return `${payment.toMemberName} confirmó que recibió ${formatARS(payment.amount)}${movementContext}.`;
  }
  if (notification.type === 'pago_rechazado') {
    return `${payment.toMemberName} no confirmó la recepción de ${formatARS(payment.amount)}${movementContext}.`;
  }
  return `${payment.fromMemberName} avisó un pago de ${formatARS(payment.amount)}${movementContext}.`;
}

export function PaymentNotificationsSheet({ onPaymentUpdated }: PaymentNotificationsSheetProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const resolutionSignatureRef = useRef('');
  const hasLoadedNotificationsRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('No pudimos cargar tus notificaciones.');
      const data = await response.json() as {
        notifications?: PaymentNotification[];
        unreadCount?: number;
      };
      const nextNotifications = data.notifications ?? [];
      const resolutionSignature = nextNotifications
        .filter((notification) => notification.type !== 'pago_informado')
        .map((notification) => `${notification.id}:${notification.payment.status}`)
        .join('|');
      if (hasLoadedNotificationsRef.current && resolutionSignature !== resolutionSignatureRef.current) {
        onPaymentUpdated();
      }
      resolutionSignatureRef.current = resolutionSignature;
      hasLoadedNotificationsRef.current = true;
      setNotifications(nextNotifications);
      setUnreadCount(data.unreadCount ?? 0);
      setError('');
    } catch {
      setError('No pudimos cargar tus notificaciones. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [onPaymentUpdated]);

  useEffect(() => {
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications();
    }, 20000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (response.ok) setUnreadCount(0);
    } catch {
      // The notification list is still available if marking items as read fails.
    } finally {
      await loadNotifications();
    }
  }

  async function handlePaymentResponse(notification: PaymentNotification, action: 'confirm' | 'reject') {
    setBusyPaymentId(notification.payment.id);
    setError('');

    try {
      const response = await fetch('/api/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: notification.payment.id, action }),
      });
      const data = await response.json() as { error?: { message?: string } | string };

      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        setError(message ?? 'No pudimos guardar tu respuesta. Intentá de nuevo.');
        return;
      }

      await loadNotifications();
      onPaymentUpdated();
    } catch {
      setError('No pudimos conectarnos con Divi. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setBusyPaymentId(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { void handleOpenChange(nextOpen); }}>
      <SheetTrigger
        aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Notificaciones'}
        className="relative grid size-11 place-items-center rounded-full border border-[#e7e7e7] bg-white text-[#1f1f1f] transition active:scale-[0.96]"
      >
        <BellIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#b42318] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[82dvh] gap-0 overflow-hidden rounded-t-[28px] border-[#e7e7e7] bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="relative px-5 pb-4 pt-6 pr-16">
          <SheetTitle className="text-xl font-bold tracking-[-0.035em]">Notificaciones</SheetTitle>
          <SheetDescription className="leading-6 text-[#5d5d5d]">
            Avisos de pagos y respuestas de tu grupo.
          </SheetDescription>
          <SheetClose
            aria-label="Cerrar"
            className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-[#f6f6f6] text-[#1f1f1f]"
          >
            <XIcon aria-hidden="true" size={18} />
          </SheetClose>
        </SheetHeader>

        <div className="max-h-[64dvh] space-y-3 overflow-y-auto px-5 pb-6">
          {error && <p role="alert" className="rounded-2xl bg-[#fef4f4] p-3 text-sm font-medium text-[#b42318]">{error}</p>}
          {isLoading && <p className="py-8 text-center text-sm text-[#5d5d5d]">Cargando notificaciones…</p>}
          {!isLoading && notifications.length === 0 && !error && (
            <p className="rounded-2xl bg-[#f6f6f6] px-4 py-8 text-center text-sm text-[#5d5d5d]">
              No hay notificaciones por ahora.
            </p>
          )}

          {notifications.map((notification) => {
            const isPendingIncoming = notification.type === 'pago_informado' && notification.payment.status === 'pendiente';
            const isBusy = busyPaymentId === notification.payment.id;
            return (
              <article key={notification.id} className="rounded-2xl border border-[#e7e7e7] p-4">
                <p className="text-sm font-bold">{notification.payment.groupName}</p>
                <p className="mt-1 text-sm leading-6 text-[#5d5d5d]">{notificationMessage(notification)}</p>
                {isPendingIncoming ? (
                  <>
                    <p className="mt-2 text-xs text-[#888888]">
                      El balance queda igual hasta que confirmes la recepción.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => { void handlePaymentResponse(notification, 'reject'); }}
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-[#e7e7e7] px-3 text-sm font-bold text-[#5d5d5d] transition hover:bg-[#f6f6f6] disabled:opacity-50"
                      >
                        <XIcon aria-hidden="true" size={15} />
                        No lo recibí
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => { void handlePaymentResponse(notification, 'confirm'); }}
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-[#594ff4] px-3 text-sm font-bold text-white transition hover:bg-[#4c42e8] disabled:opacity-50"
                      >
                        <CheckIcon aria-hidden="true" size={15} />
                        {isBusy ? 'Guardando…' : 'Confirmar'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-[#5d5d5d]">
                    {notification.type === 'pago_informado'
                      ? notification.payment.status === 'confirmada'
                        ? 'Pago confirmado por vos'
                        : notification.payment.status === 'rechazada'
                          ? 'Pago rechazado por vos'
                          : 'Pago pendiente de tu confirmación'
                      : notification.type === 'pago_confirmado'
                        ? 'Pago confirmado'
                        : 'Pago rechazado'}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
