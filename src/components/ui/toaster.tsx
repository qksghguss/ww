import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: 'border border-slate-200 bg-white text-slate-900 shadow-lg'
      }}
    />
  );
}
