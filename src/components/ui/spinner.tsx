import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <span
      role="progressbar"
      aria-hidden="true"
      className={cn(
        'inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
      {...props}
    />
  );
}
