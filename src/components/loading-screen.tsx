import { Spinner } from './ui/spinner';

interface LoadingScreenProps {
  message?: string;
  description?: string;
}

export function LoadingScreen({
  message = '데이터를 불러오는 중입니다...',
  description
}: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4 text-center">
      <Spinner className="h-12 w-12 text-brand" />
      <div>
        <p className="text-lg font-semibold text-slate-900">{message}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
