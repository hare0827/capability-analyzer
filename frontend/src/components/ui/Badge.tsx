import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Color = 'red' | 'yellow' | 'green' | 'blue' | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color
}

const colorClass: Record<Color, string> = {
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
  blue:   'bg-blue-100 text-blue-700',
  gray:   'bg-gray-100 text-gray-600',
}

export function Badge({ color = 'gray', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClass[color],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
