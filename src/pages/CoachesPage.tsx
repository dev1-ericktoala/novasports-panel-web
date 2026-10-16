import { useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { useCoachesPendingCounts } from '@/hooks/useCoaches';
import { CoachTestimonialsTab } from './CoachTestimonialsTab';
import { CoachCertificationsTab } from './CoachCertificationsTab';

type Section = 'testimonials' | 'certifications';

export function CoachesPage() {
  const [params, setParams] = useSearchParams();
  const section: Section = params.get('tab') === 'certifications' ? 'certifications' : 'testimonials';
  const counts = useCoachesPendingCounts().data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display">Coaches</h1>
        <p className="text-[13px] text-white/55 mt-2 max-w-xl">
          Revisa los testimonios y certificados que cargan los coaches, en su onboarding o desde su carta.
          Solo lo confirmado suma a su perfil y se muestra a otros usuarios.
        </p>
      </div>

      <SegmentedControl<Section>
        segments={[
          { id: 'testimonials', label: 'Testimonios', count: counts?.testimonials },
          { id: 'certifications', label: 'Certificados', count: counts?.certifications },
        ]}
        value={section}
        onChange={(id) => setParams(id === 'testimonials' ? {} : { tab: id }, { replace: true })}
        ariaLabel="Sección de coaches"
      />

      {section === 'testimonials' ? <CoachTestimonialsTab /> : <CoachCertificationsTab />}
    </div>
  );
}
