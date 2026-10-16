import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { maintenanceApi } from '@/api/endpoints';
import { useToast } from '@/ui/Toast';
import { useConfirm } from '@/ui/Confirm';
import { IconRefresh, IconTrash } from '@/ui/Icons';
import type { StorageCleanupSummary } from '@/types';

export function StoragePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<StorageCleanupSummary | null>(null);

  const preview = useMutation({
    mutationFn: maintenanceApi.previewStorageCleanup,
    onSuccess: setSummary,
    onError: (e) => toast.error(e),
  });

  const run = useMutation({
    mutationFn: maintenanceApi.runStorageCleanup,
    onSuccess: (data) => {
      setSummary(data);
      toast.success('Limpieza terminada');
    },
    onError: (e) => toast.error(e),
  });

  const busy = preview.isPending || run.isPending;

  const onRun = async () => {
    const ok = await confirm({
      title: 'Limpiar almacenamiento',
      message:
        'Se terminan los borrados a medias, se borran los archivos de cuentas eliminadas y la multimedia de ' +
        'reportes caducada. No se puede deshacer.',
      confirmLabel: 'Limpiar',
      danger: true,
    });
    if (ok) run.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Almacenamiento</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-xl">
          Termina los borrados de cuenta que quedaron a medias y borra archivos que ya no tienen dueño.
          Revisa primero: la revisión no borra nada.
        </p>
      </div>

      <div className="flex gap-2">
        <button className="btn" onClick={() => preview.mutate()} disabled={busy}>
          <IconRefresh size={13} /> {preview.isPending ? 'Revisando…' : 'Revisar'}
        </button>
        <button className="btn-danger" onClick={onRun} disabled={busy || !summary?.dry_run}>
          <IconTrash size={13} /> {run.isPending ? 'Limpiando…' : 'Limpiar'}
        </button>
      </div>

      {summary && <Summary summary={summary} />}
    </div>
  );
}

function Summary({ summary: s }: { summary: StorageCleanupSummary }) {
  const done = !s.dry_run;
  const buckets = Object.entries(s.orphan_files.by_bucket);
  return (
    <div className="card p-5 space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-white/50">
        {done ? 'Resultado de la limpieza' : 'Revisión (no se ha borrado nada)'}
      </div>

      <Row
        title="Borrados a medias"
        hint="Cuentas que ya no están en Auth pero no se anonimizaron (por ejemplo, borradas desde Supabase)."
        found={s.unfinished_deletions.found}
        fixed={done ? s.unfinished_deletions.fixed : undefined}
        failed={s.unfinished_deletions.failed}
        note={
          s.unfinished_deletions.blocked_open_club > 0
            ? `${s.unfinished_deletions.blocked_open_club} administran un club abierto: no se tocan hasta cerrarlo.`
            : undefined
        }
      />
      <Row
        title="Cuentas eliminadas que siguen en Auth"
        hint="El borrado en Auth falló al eliminar la cuenta."
        found={s.auth_leftovers.found}
        fixed={done ? s.auth_leftovers.fixed : undefined}
        failed={s.auth_leftovers.failed}
      />
      <Row
        title="Archivos de cuentas eliminadas"
        hint="Carpetas de usuarios eliminados o inexistentes en los buckets personales."
        found={s.orphan_files.files}
        fixed={done ? s.orphan_files.removed : undefined}
        failed={s.orphan_files.failed}
        note={
          buckets.length
            ? `${s.orphan_files.folders} carpetas · ` + buckets.map(([b, n]) => `${b}: ${n}`).join(' · ')
            : undefined
        }
      />
      <Row
        title="Multimedia de reportes caducada"
        hint="Fotos y videos de reportes de clase con la fecha de retención vencida."
        found={s.expired_media.videos + s.expired_media.photos}
        fixed={done ? s.expired_media.videos + s.expired_media.photos : undefined}
        note={`${s.expired_media.videos} videos · ${s.expired_media.photos} fotos`}
      />
    </div>
  );
}

function Row({
  title, hint, found, fixed, failed = 0, note,
}: {
  title: string;
  hint: string;
  found: number;
  fixed?: number;
  failed?: number;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
      <div className="min-w-0">
        <div className="text-[13.5px] text-white font-medium">{title}</div>
        <div className="text-[12px] text-white/50 mt-0.5">{hint}</div>
        {note && <div className="text-[12px] text-white/70 mt-1">{note}</div>}
      </div>
      <div className="text-right text-[12.5px] tabular-nums shrink-0">
        <div className="text-white">{fixed === undefined ? `${found} encontrados` : `${fixed} limpiados`}</div>
        {failed > 0 && <div className="text-red-300">{failed} con error</div>}
      </div>
    </div>
  );
}
