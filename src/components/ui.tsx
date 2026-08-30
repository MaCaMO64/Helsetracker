import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

/** Felles feltstil for input/select/textarea. */
export const feltKlasse =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantKlasser: Record<Variant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variantKlasser[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function SideTittel({
  tittel,
  undertittel,
  handling,
}: {
  tittel: string
  undertittel?: string
  handling?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{tittel}</h1>
        {undertittel && <p className="mt-0.5 text-sm text-slate-500">{undertittel}</p>}
      </div>
      {handling}
    </div>
  )
}

export function Modal({
  åpen,
  onClose,
  tittel,
  children,
}: {
  åpen: boolean
  onClose: () => void
  tittel: string
  children: ReactNode
}) {
  if (!åpen) return null
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{tittel}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function TomTilstand({
  ikon,
  tittel,
  tekst,
  handling,
}: {
  ikon: string
  tittel: string
  tekst: string
  handling?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden>
        {ikon}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-800">{tittel}</h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{tekst}</p>
      {handling && <div className="mt-4">{handling}</div>}
    </div>
  )
}
