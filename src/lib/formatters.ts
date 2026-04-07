export function formatCurrencyBRL(value: number | string | null | undefined) {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0)

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatDateBR(value: string | Date | null | undefined) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('pt-BR')
}

export function formatMonthYearBR(value: string | Date | null | undefined) {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const formatted = date.toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  })

  return formatted.replace('.', '')
}

export function formatWeightKg(value: number | string | null | undefined) {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(amount)) return '0 kg'

  const digits = Number.isInteger(amount) ? 0 : 1
  return `${amount.toFixed(digits)} kg`
}
