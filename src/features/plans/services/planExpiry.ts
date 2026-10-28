import type { Plan } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const WARNING_DAYS = 7;

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Data AAAA-MM-DD de hoje mais N dias, no calendário local (não em milissegundos). */
export function dateKeyFromToday(days: number, now = new Date()): string {
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

export function formatDateKey(key: string): string {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

/** Dias até o vencimento pela data local: 0 = vence hoje, negativo = já venceu. */
export function daysUntilExpiry(plan: Plan, now = new Date()): number | null {
  if (!plan.expiresAt) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseDateKey(plan.expiresAt).getTime() - today.getTime()) / DAY_MS);
}

export function isExpired(plan: Plan, now = new Date()): boolean {
  const days = daysUntilExpiry(plan, now);
  return days !== null && days < 0;
}

/** Texto curto para a linha do plano; vazio quando não há prazo. */
export function expiryText(plan: Plan, now = new Date()): string {
  const days = daysUntilExpiry(plan, now);
  if (days === null || !plan.expiresAt) return '';
  if (days < 0) return `venceu em ${formatDateKey(plan.expiresAt).slice(0, 5)}`;
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  return `vence em ${days} dias`;
}

export function isExpiringSoon(plan: Plan, now = new Date()): boolean {
  const days = daysUntilExpiry(plan, now);
  return days !== null && days >= 0 && days <= WARNING_DAYS;
}
