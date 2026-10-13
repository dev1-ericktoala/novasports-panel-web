import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/Modal';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { ACCOUNT_STATUS_LABEL } from '@/ui/Badge';
import type { AccountStatus, AccountStatusChange, SettableAccountStatus } from '@/types';

export type AccountTarget = {
  id: string;
  name: string;
  account_status: AccountStatus | null;
  account_status_reason: string | null;
  suspended_until: string | null;
};

/** 'app': players, coaches and clubs. 'panel': admins. */
type Audience = 'app' | 'panel';

const PLACE: Record<Audience, string> = { app: 'la app', panel: 'el panel' };

function options(audience: Audience): { id: SettableAccountStatus; label: string; hint: string }[] {
  return [
    { id: 'active', label: 'Activa', hint: `La cuenta puede usar ${PLACE[audience]} normalmente.` },
    { id: 'suspended', label: 'Suspendida', hint: 'Bloqueo temporal — requiere fecha fin.' },
    { id: 'banned', label: 'Baneada', hint: 'Bloqueo permanente por violación de términos.' },
    { id: 'blocked', label: 'Bloqueada', hint: 'Bloqueo administrativo (por seguridad, verificación, etc.).' },
  ];
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(local: string): string {
  return new Date(local).toLocaleString('es-EC', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AccountStatusModal({
  target, audience, save, invalidateKey, onClose,
}: {
  target: AccountTarget | null;
  audience: Audience;
  save: (id: string, body: AccountStatusChange) => Promise<unknown>;
  /** react-query key refreshed after saving. */
  invalidateKey: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState<SettableAccountStatus>('active');
  const [reason, setReason] = useState('');
  const [suspendedUntil, setSuspendedUntil] = useState('');

  useEffect(() => {
    if (target) {
      setStatus(target.account_status && target.account_status !== 'deleted' ? target.account_status : 'active');
      setReason(target.account_status_reason || '');
      setSuspendedUntil(toDatetimeLocal(target.suspended_until));
    }
  }, [target]);

  const mutate = useMutation({
    mutationFn: () => {
      const body: AccountStatusChange = { status };
      if (reason.trim()) body.reason = reason.trim();
      if (status === 'suspended') {
        body.suspended_until = new Date(suspendedUntil).toISOString();
      }
      return save(target!.id, body);
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      onClose();
    },
    onError: (e) => toast.error(e),
  });

  const suspensionInPast =
    status === 'suspended' && !!suspendedUntil && new Date(suspendedUntil).getTime() <= Date.now();
  const canSubmit = !!target && (status !== 'suspended' || (!!suspendedUntil && !suspensionInPast));

  const submit = async () => {
    if (!target || !canSubmit) return;
    if (status !== 'active') {
      const ok = await confirm({
        title: `${ACCOUNT_STATUS_LABEL[status]} — confirmar`,
        message: (
          <div className="space-y-2">
            <p>
              La cuenta de <strong>{target.name}</strong> quedará{' '}
              <strong>{ACCOUNT_STATUS_LABEL[status].toLowerCase()}</strong>
              {status === 'suspended' && <> hasta el {formatDateTime(suspendedUntil)}</>}.
            </p>
            <p className="text-white/60">
              Se cierra su sesión y no podrá entrar a {PLACE[audience]} ni recibir código
              {status === 'suspended' ? ' hasta esa fecha.' : ' hasta que la reactives.'}
            </p>
          </div>
        ),
        confirmLabel: ACCOUNT_STATUS_LABEL[status],
        danger: true,
      });
      if (!ok) return;
    }
    mutate.mutate();
  };

  return (
    <Modal open={!!target} onClose={onClose} title={`Estado de cuenta — ${target?.name || ''}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
      >
        <div className="grid grid-cols-2 gap-2">
          {options(audience).map(o => (
            <button
              key={o.id} type="button"
              onClick={() => setStatus(o.id)}
              className={
                'rounded-md border px-3 py-2 text-left ' +
                (status === o.id
                  ? 'border-white/40 bg-white/10 text-white'
                  : 'border-line bg-night-800 text-white/70 hover:bg-night-700')
              }
            >
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-[11px] text-white/50 mt-0.5">{o.hint}</div>
            </button>
          ))}
        </div>

        {status === 'suspended' && (
          <div>
            <label className="label">Suspendida hasta</label>
            <input
              type="datetime-local"
              className="input"
              value={suspendedUntil}
              onChange={(e) => setSuspendedUntil(e.target.value)}
              required
            />
            {suspensionInPast && (
              <p className="text-[11px] text-amber-300 mt-1">La fecha tiene que ser futura.</p>
            )}
          </div>
        )}

        <div>
          <label className="label">Motivo (opcional)</label>
          <textarea
            className="input min-h-[80px] text-sm"
            placeholder="Descripción visible en logs"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!canSubmit || mutate.isPending}
          >
            {mutate.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
