import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function parseDate(dateString: string): Date {
  const [day, month, year] = dateString.split('/')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function daysBetween(from: Date, to: Date): number {
  const diffTime = Math.abs(to.getTime() - from.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}
