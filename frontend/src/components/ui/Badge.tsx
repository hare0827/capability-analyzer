import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Color = 'red' | 'yellow' | 'green' | 'blue' | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color
}

const colorClass: Record<Color, string> = {
  red:    'bg-red-100 text-red-700 border border-red-200',
  yellow: 'bg-amber-100 text-amber-700 border border-amber-200',
  green:  'bg-green-100 text-green-700 border border-green-200',
  blue:   'bg-[#e6f3fb] text-[#0083CA] border border-[#b3d9f0]',
  gray:   'bg-gray-100 text-gray-600 border border-gray-200',
}

export function Badge({ color = 'gray', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        colorClass[color],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
