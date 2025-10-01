import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const baseClasses =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50';

const variantClasses = {
  default: 'bg-brand text-white hover:bg-brand-foreground',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  ghost: 'hover:bg-slate-100 text-slate-900',
  outline: 'border border-slate-200 hover:bg-slate-100',
  destructive: 'bg-red-500 text-white hover:bg-red-600'
} as const;

const sizeClasses = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10'
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const resolvedVariant = variant ?? 'default';
    const resolvedSize = size ?? 'default';
    const classes = cn(
      baseClasses,
      variantClasses[resolvedVariant],
      sizeClasses[resolvedSize],
      className
    );
    return <Comp className={classes} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
