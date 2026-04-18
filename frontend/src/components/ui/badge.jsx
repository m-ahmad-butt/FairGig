import { cn } from '../../lib/utils';

const variantClasses = {
  default: 'border-transparent bg-zinc-900 text-white hover:bg-zinc-800',
  secondary: 'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  outline: 'text-zinc-900',
  success: 'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  destructive: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200'
};

function Badge({ className, variant = 'default', ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant] || variantClasses.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
