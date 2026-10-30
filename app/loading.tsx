import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-4">
      <Loader2 className="w-8 h-8 text-[#D31A24] animate-spin" />
      <span className="text-xs font-bold uppercase tracking-wider text-[#C8CDD5]">
        Cargando información...
      </span>
    </div>
  );
}
