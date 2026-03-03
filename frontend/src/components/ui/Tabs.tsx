import { createContext, useContext, HTMLAttributes, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  active: string
  onChange: (val: string) => void
}

const TabsContext = createContext<TabsContextValue>({ active: '', onChange: () => {} })

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  onValueChange: (val: string) => void
}

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ active: value, onChange: onValueChange }}>
      <div className={cn('flex flex-col', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-lg bg-gray-100 p-1',
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { active, onChange } = useContext(TabsContext)
  const isActive = active === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-gray-500 hover:text-gray-700',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return (
    <div role="tabpanel" className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  )
}
