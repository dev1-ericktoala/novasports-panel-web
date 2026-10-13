import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coachesApi } from '@/api/endpoints';
import { IconCheck, IconX } from '@/ui/Icons';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import type { CoachTestimonial, TestimonialFilter } from '@/types';
import { CoachCell, PersonCell, formatDate } from './CoachCell';

const FILTERS: Segment<TestimonialFilter>[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'confirmed', label: 'Confirmados' },
  { id: 'all', label: 'Todos' },
];

function statusBadgeClass(t: CoachTestimonial): string {
  if (t.counts_in_legacy) return 'border-emerald-400/40 bg-emerald-400/[.12] text-emerald-200';
  if (t.status === 'rejected') return 'border-red-400/40 bg-red-400/[.12] text-red-200';
  return 'border-amber-400/40 bg-amber-400/[.12] text-amber-200';
}

function playerAnswer(t: CoachTestimonial): { label: string; className: string } {
  if (!t.player_has_app) return { label: 'Sin app (solo admin)', className: 'text-white/55' };
  if (t.status === 'accepted') return { label: 'Aceptó', className: 'text-emerald-300' };
  if (t.status === 'rejected') return { label: 'Rechazado', className: 'text-red-300' };
  return { label: 'Esperando respuesta', className: 'text-amber-200' };
}

function rankLine(t: CoachTestimonial): string {
  const parts: string[] = [];
  if (t.athlete?.national_position) parts.push(`Nacional #${t.athlete.national_position}`);
  if (t.athlete?.fip_position) parts.push(`FIP #${t.athlete.fip_position}`);
  return parts.join(' · ') || 'Sin posición registrada';
}

export function CoachTestimonialsTab() {
  const [filter, setFilter] = useState<TestimonialFilter>('pending');
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const q = useQuery({
    queryKey: ['coach-testimonials', filter],
    queryFn: () => coachesApi.testimonials(filter),
  });

  const review = useMutation({
    mutationFn: (v: { id: string; action: 'confirm' | 'reject' }) =>
      coachesApi.reviewTestimonial(v.id, v.action),
    onSuccess: (_d, v) => {
      toast.success(v.action === 'confirm' ? 'Testimonio confirmado' : 'Testimonio rechazado');
      qc.invalidateQueries({ queryKey: ['coach-testimonials'] });
      qc.invalidateQueries({ queryKey: ['coaches-pending'] });
    },
    onError: (e) => toast.error(e),
  });

  const askConfirm = async (t: CoachTestimonial) => {
    const waitingPlayer = t.player_has_app && t.status === 'pending';
    const ok = await confirm({
      title: 'Confirmar testimonio',
      message: (
        <div className="space-y-2">
          <p>
            Se confirmará que <b>{t.athlete?.full_name || 'el jugador'}</b> entrenó con{' '}
            <b>{t.coach?.full_name || 'el coach'}</b>.
          </p>
          <p className="text-white/60">
            {waitingPlayer
              ? 'El jugador todavía no respondió en la app. Sumará al perfil del coach cuando el jugador también lo acepte.'
              : 'Sumará al perfil del coach desde ahora.'}{' '}
            Al coach le llegará un aviso.
          </p>
        </div>
      ),
      confirmLabel: 'Confirmar',
    });
    if (ok) review.mutate({ id: t.id, action: 'confirm' });
  };

  const askReject = async (t: CoachTestimonial) => {
    const ok = await confirm({
      title: 'Rechazar testimonio',
      message: (
        <div className="space-y-2">
          <p>
            Se rechazará el testimonio de <b>{t.athlete?.full_name || 'el jugador'}</b> para{' '}
            <b>{t.coach?.full_name || 'el coach'}</b>.
          </p>
          <p className="text-white/60">
            No sumará a su perfil y el coach no podrá volver a pedírselo a este jugador. Al coach le llegará un aviso;
            el resto de su perfil y su modo coach no cambian.
          </p>
        </div>
      ),
      confirmLabel: 'Rechazar',
      danger: true,
    });
    if (ok) review.mutate({ id: t.id, action: 'reject' });
  };

  const rows = q.data?.testimonials || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<TestimonialFilter>
          segments={FILTERS.map((f) => ({ ...f, count: filter === f.id ? rows.length : undefined }))}
          value={filter}
          onChange={setFilter}
          ariaLabel="Estado del testimonio"
        />
        <p className="text-xs text-white/50 ml-auto max-w-md text-right">
          Si el jugador tiene la app, el testimonio suma cuando él lo acepta y tú lo confirmas.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th">Coach</th>
              <th className="th">Jugador que respalda</th>
              <th className="th w-44">Respuesta del jugador</th>
              <th className="th w-48">Estado</th>
              <th className="th w-40">Solicitado</th>
              <th className="th w-56 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <SkeletonRows rows={5} cols={6} />}
            {q.isError && (
              <tr><td className="td text-red-300" colSpan={6}>{(q.error as Error).message}</td></tr>
            )}
            {!q.isLoading && !q.isError && rows.length === 0 && (
              <tr><td colSpan={6}>
                <EmptyState
                  compact
                  title={filter === 'pending' ? 'Sin testimonios pendientes' : 'Sin testimonios'}
                  hint={filter === 'pending'
                    ? 'Cuando un coach pida un testimonio, en su onboarding o desde su carta, aparecerá aquí.'
                    : undefined}
                />
              </td></tr>
            )}
            {rows.map((t) => {
              const answer = playerAnswer(t);
              const canReview = !t.admin_verified && t.status !== 'rejected';
              return (
                <tr key={t.id} className="hover:bg-white/[.02] align-top">
                  <td className="td"><CoachCell coach={t.coach} /></td>
                  <td className="td">
                    <PersonCell name={t.athlete?.full_name} photoUrl={t.athlete?.photo_url} sub={rankLine(t)} />
                  </td>
                  <td className={`td text-[12.5px] ${answer.className}`}>{answer.label}</td>
                  <td className="td">
                    <span className={`badge border ${statusBadgeClass(t)}`}>{t.status_label}</span>
                    <div className="text-[11px] text-white/45 mt-1 leading-snug">{t.status_hint}</div>
                  </td>
                  <td className="td text-[11px] text-white/60">{formatDate(t.requested_at)}</td>
                  <td className="td">
                    {canReview && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="btn-primary !py-1 !px-2.5 text-xs"
                          onClick={() => askConfirm(t)}
                          disabled={review.isPending}
                        >
                          <IconCheck size={13} /> Confirmar
                        </button>
                        <button
                          className="btn-danger !py-1 !px-2.5 text-xs"
                          onClick={() => askReject(t)}
                          disabled={review.isPending}
                        >
                          <IconX size={13} /> Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
