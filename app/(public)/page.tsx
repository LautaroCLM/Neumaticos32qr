import Image from 'next/image';
import { PlateSearchForm } from '@/components/public/PlateSearchForm';
import { Smartphone } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neumáticos el 32 | Historial de Mantenimientos y Tickets Digitales',
  description:
    'Consultá el historial digital y servicios de tu vehículo en Neumáticos el 32 Quilmes. Búsqueda por patente y comprobantes de mantenimiento.',
};

const VEHICLE_FACTS = [
  { term: 'Último servicio', detail: 'Fecha, kilometraje y trabajo realizado.' },
  { term: 'Historial completo', detail: 'Todos los servicios anteriores del vehículo, del más reciente al primero.' },
  { term: 'Próximo control', detail: 'Los kilómetros o la fecha que recomienda el taller.' },
];

export default function HomePage() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-16 xl:gap-24 lg:pt-6 animate-in">
      <section aria-labelledby="home-title" className="max-w-[520px]">
        <h1
          id="home-title"
          className="font-display text-[clamp(2rem,9vw,3.5rem)] lg:text-[3rem] leading-[0.95] text-[#f2f2ef]"
        >
          <span className="whitespace-nowrap">Historial de</span>{' '}
          <span className="block text-[#d31a24]">servicios</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#c8cad0] max-w-[34ch]">
          Ingresá tu patente para ver los trabajos realizados, los costos y el próximo control de tu vehículo.
        </p>

        <div className="mt-7 pt-6 border-t border-[#2a2b2e]">
          <PlateSearchForm />
        </div>

        <div className="mt-8 pt-5 border-t border-[#2a2b2e] grid grid-cols-[44px_1fr] gap-4">
          <span className="w-11 h-11 flex items-center justify-center border-2 border-[#f2f2ef] text-[#f2f2ef]" aria-hidden="true">
            <Smartphone className="w-6 h-6" />
          </span>
          <p className="text-sm leading-relaxed text-[#c8cad0]">
            <strong className="block text-[15px] font-semibold text-[#f2f2ef] mb-0.5">
              ¿Tu teléfono no está cargado?
            </strong>
            Pedile al taller que lo agregue a la ficha de tu vehículo y vas a poder consultar tu historial desde acá.
          </p>
        </div>
      </section>

      <aside className="hidden lg:flex flex-col border-l border-[#2a2b2e] pl-12 xl:pl-16" aria-label="Qué vas a encontrar">
        <Image
          src="/logo.webp"
          alt="Neumáticos el 32"
          width={200}
          height={200}
          className="w-[176px] h-auto object-contain -ml-2"
          priority
        />
        <dl className="mt-10 border-t border-[#2a2b2e]">
          {VEHICLE_FACTS.map((fact) => (
            <div key={fact.term} className="grid grid-cols-[180px_1fr] gap-6 py-4 border-b border-[#2a2b2e]">
              <dt className="label-caps text-[#9a9da3] pt-0.5">{fact.term}</dt>
              <dd className="text-sm leading-relaxed text-[#c8cad0]">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
