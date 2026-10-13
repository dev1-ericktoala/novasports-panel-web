import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coachesApi } from '@/api/endpoints';
import { SegmentedControl, type Segment } from '@/ui/SegmentedControl';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import type { CertificationFilter, CoachCertification } from '@/types';
import { CertificationStatusBadge, CoachCell, ModerationBadge, formatDate } from './CoachCell';
import { CertificationReviewModal } from './CertificationReviewModal';

const FILTERS: Segment<CertificationFilter>[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'all', label: 'Todos' },
];

export function CoachCertificationsTab() {
  const [filter, setFilter] = useState<CertificationFilter>('pending');
  const [selected, setSelected] = useState<CoachCertification | null>(null);

  const q = useQuery({
    queryKey: ['coach-certifications', filter],
    queryFn: () => coachesApi.certifications(filter),
  });
  const rows = q.data?.certifications || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<CertificationFilter>
          segments={FILTERS.map((f) => ({ ...f, count: filter === f.id ? rows.length : undefined }))}
          value={filter}
          onChange={setFilter}
          ariaLabel="Estado del certificado"
        />
        <p className="text-xs text-white/50 ml-auto max-w-md text-right">
          Google Vision ayuda a detectar contenido inapropiado, pero nunca aprueba un certificado por sí solo.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[.02]">
            <tr>
              <th className="th">Coach</th>
              <th className="th">Certificado</th>
              <th className="th w-56">Análisis</th>
              <th className="th w-40">Estado</th>
              <th className="th w-40">Subido</th>
              <th className="th w-28 text-right">Acciones</th>
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
                  title={filter === 'pending' ? 'Sin certificados pendientes' : 'Sin certificados'}
                  hint={filter === 'pending'
                    ? 'Cuando un coach suba un certificado, en su onboarding o desde su carta, aparecerá aquí.'
                    : undefined}
                />
              </td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-white/[.02] align-top">
                <td className="td"><CoachCell coach={c.coach} /></td>
                <td className="td">
                  <button
                    type="button"
                    className="flex items-center gap-2.5 text-left group"
                    onClick={() => setSelected(c)}
                  >
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt=""
                        className="w-14 h-10 rounded object-cover border border-line group-hover:border-white/30"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate max-w-[220px] group-hover:text-white">{c.title}</div>
                      {c.moderation_text && (
                        <div className="text-[11px] text-white/45 truncate max-w-[220px]">
                          {c.moderation_text.split('\n')[0]}
                        </div>
                      )}
                    </div>
                  </button>
                </td>
                <td className="td">
                  <ModerationBadge certification={c} />
                  {c.moderation.flags.length > 0 && (
                    <div className="text-[11px] text-amber-200/80 mt-1">
                      {c.moderation.flags.map((f) => `${f.category_label}: ${f.likelihood_label}`).join(' · ')}
                    </div>
                  )}
                </td>
                <td className="td">
                  <CertificationStatusBadge certification={c} />
                  {c.rejection_reason && (
                    <div className="text-[11px] text-white/45 mt-1 leading-snug">{c.rejection_reason}</div>
                  )}
                </td>
                <td className="td text-[11px] text-white/60">{formatDate(c.created_at)}</td>
                <td className="td text-right">
                  <button className="btn !py-1 !px-2.5 text-xs" onClick={() => setSelected(c)}>
                    {c.status === 'pending' ? 'Revisar' : 'Ver'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CertificationReviewModal certification={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
