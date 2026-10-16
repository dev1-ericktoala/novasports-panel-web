import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminsApi } from '@/api/endpoints';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { APP_ROLE_LABEL, AccountStatusBadge } from '@/ui/Badge';
import { AccountStatusModal, type AccountTarget } from './AccountStatusModal';
import type { PanelAdminRow } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toAccountTarget(a: PanelAdminRow): AccountTarget {
  return {
    id: a.id,
    name: a.full_name || a.email || 'Admin',
    account_status: a.account_status,
    account_status_reason: a.account_status_reason,
    suspended_until: a.suspended_until,
  };
}

export function AdminsPage() {
  const [target, setTarget] = useState<AccountTarget | null>(null);
  const query = useQuery({
    queryKey: ['admins'],
    queryFn: adminsApi.list,
  });
  const admins = query.data?.admins || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Admins</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-xl">
          Cuentas con acceso al panel. Solo el super admin ve esta página y puede cambiar el estado de los demás
          admins. Por ahora los admins se crean con el script del backend (<code className="font-mono">npm run admin</code>).
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th">Admin</th>
              <th className="th">Email</th>
              <th className="th w-32">Estado</th>
              <th className="th w-32">Alta</th>
              <th className="th w-28 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && <SkeletonRows rows={4} cols={5} colSpans={['60%', '80%', '40%', '50%', '40%']} />}
            {query.isError && (
              <tr><td className="td text-red-300" colSpan={5}>
                {(query.error as Error).message}
              </td></tr>
            )}
            {!query.isLoading && !query.isError && admins.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState compact title="No hay admins" hint="Créalos con el script del backend." />
              </td></tr>
            )}
            {admins.map(a => (
              <tr key={a.id} className="hover:bg-white/[.02]">
                <td className="td">
                  <div className="font-medium">{a.full_name || '—'}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.is_super_admin && (
                      <span className="badge border border-nova-gold/40 bg-nova-gold/[.12] text-nova-gold">
                        Super admin
                      </span>
                    )}
                    {a.is_self && (
                      <span className="badge border border-nova-cyan/40 bg-nova-cyan/[.12] text-nova-cyan">
                        Tú
                      </span>
                    )}
                    {a.app_roles.length > 0 && (
                      <span
                        className="badge border border-amber-400/40 bg-amber-400/10 text-amber-300"
                        title="Cuenta creada antes de que los admins fueran solo del panel. Ya no puede entrar a la app."
                      >
                        Cuenta de la app: {a.app_roles.map(r => APP_ROLE_LABEL[r] || r).join(', ')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="td text-white/70">{a.email || '—'}</td>
                <td className="td">
                  <AccountStatusBadge status={a.account_status} />
                  {a.account_status === 'suspended' && a.suspended_until && (
                    <div className="text-[11px] text-white/50 mt-1">hasta {formatDate(a.suspended_until)}</div>
                  )}
                </td>
                <td className="td text-white/60">{a.created_at ? formatDate(a.created_at) : '—'}</td>
                <td className="td">
                  <div className="flex justify-end">
                    <button
                      className="btn-ghost !px-2 !py-1"
                      onClick={() => setTarget(toAccountTarget(a))}
                      disabled={!a.can_change_status}
                      title={a.status_locked_reason || 'Cambiar estado'}
                    >
                      Estado
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AccountStatusModal
        target={target}
        audience="panel"
        save={adminsApi.patchAccount}
        invalidateKey="admins"
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
