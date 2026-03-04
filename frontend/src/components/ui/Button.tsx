import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-blue-600 text-white ' +
    'hover:from-indigo-700 hover:to-blue-700 ' +
    'disabled:from-indigo-300 disabled:to-blue-300 ' +
    'shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.45)]',
  secondary:
    'bg-white text-slate-700 border border-slate-200 ' +
    'hover:bg-slate-50 hover:border-slate-300 ' +
    'disabled:bg-slate-50 disabled:text-slate-400 ' +
    'shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, className, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
