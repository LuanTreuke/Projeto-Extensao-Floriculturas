/**
 * Utilitários para manipulação de datas
 * Evita problemas de timezone usando sempre a data/hora local
 */

/**
 * Formata uma data no formato YYYY-MM-DD (sem considerar timezone)
 * @param date - Data a ser formatada (opcional, padrão: data atual)
 * @returns String no formato YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data e hora no formato YYYY-MM-DD HH:mm:ss
 * @param date - Data a ser formatada (opcional, padrão: data atual)
 * @returns String no formato YYYY-MM-DD HH:mm:ss
 */
export function formatDateTimeToSQL(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formata uma data e hora no formato YYYY-MM-DDTHH:mm (para input datetime-local)
 * @param date - Data a ser formatada (opcional, padrão: data atual)
 * @returns String no formato YYYY-MM-DDTHH:mm
 */
export function formatDateTimeLocal(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Obtém a data de hoje no início do dia (00:00:00)
 * @returns Date objeto com horário zerado
 */
export function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Obtém a data de hoje no fim do dia (23:59:59)
 * @returns Date objeto com horário no fim do dia
 */
export function getTodayEnd(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

/**
 * Parseia uma string no formato YYYY-MM-DD para Date (sem problemas de timezone)
 * @param dateString - String no formato YYYY-MM-DD
 * @returns Date objeto
 */
export function parseDateFromYYYYMMDD(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Verifica se uma data é hoje
 * @param date - Data a verificar
 * @returns true se a data é hoje
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Adiciona dias a uma data
 * @param date - Data base
 * @param days - Número de dias a adicionar (pode ser negativo)
 * @returns Nova data
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
