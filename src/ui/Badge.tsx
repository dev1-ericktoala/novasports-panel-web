import type { AccountStatus, RankingType } from '@/types';

const ACCOUNT_STATUS_STYLES: Record<AccountStatus, string> = {
  active: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  suspended: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  banned: 'border-red-500/40 bg-red-500/10 text-red-300',
  blocked: 'border-white/30 bg-white/10 text-white/70',
  deleted: 'border-white/15 bg-white/[.03] text-white/45',
};

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  banned: 'Baneada',
  blocked: 'Bloqueada',
  deleted: 'Eliminada',
};

export function AccountStatusBadge({ status }: { status: AccountStatus | null }) {
  if (!status) return <span className="text-white/40">—</span>;
  return (
    <span className={'badge border ' + ACCOUNT_STATUS_STYLES[status]}>
      {ACCOUNT_STATUS_LABEL[status]}
    </span>
  );
}

/** App roles shown in the users list. */
export const APP_ROLE_LABEL: Record<string, string> = {
  player: 'Jugador',
  coach: 'Coach',
  club_admin: 'Club',
};

export function RoleBadges({ roles }: { roles: string[] }) {
  const known = roles.filter((r) => APP_ROLE_LABEL[r]);
  if (!known.length) return <span className="text-white/40">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {known.map((r) => (
        <span key={r} className="badge border border-white/15 bg-white/[.04] text-white/75">
          {APP_ROLE_LABEL[r]}
        </span>
      ))}
    </div>
  );
}

const TYPE_STYLES: Record<RankingType, string> = {
  national: 'border-nova-blue/40 bg-nova-blue/[.12] text-[#7fb6ff]',
  country_open: 'border-nova-cyan/40 bg-nova-cyan/[.12] text-nova-cyan',
  fip: 'border-nova-gold/40 bg-nova-gold/[.12] text-nova-gold',
  fip_promises: 'border-nova-violet/40 bg-nova-violet/15 text-[#d7a3f8]',
};

export function TypeBadge({ type, label }: { type: RankingType; label: string }) {
  return (
    <span className={`badge border ${TYPE_STYLES[type]}`}>{label}</span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={
        'inline-block w-2 h-2 rounded-full ' +
        (active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-white/25')
      }
      title={active ? 'Activo' : 'Inactivo'}
    />
  );
}
