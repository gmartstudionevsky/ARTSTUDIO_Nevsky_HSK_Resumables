export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function statusMessage(status: number): string {
  if (status === 400) return 'Проверьте заполнение полей и повторите попытку.';
  if (status === 401) return 'Сессия истекла. Войдите снова.';
  if (status === 403) return 'Недостаточно прав для выполнения действия.';
  if (status === 404) return 'Запись не найдена.';
  if (status === 409) return 'Действие не выполнено: конфликт данных.';
  if (status === 422) return 'Данные не прошли проверку.';
  if (status >= 500) return 'Сервис временно недоступен. Попробуйте позже.';
  return 'Не удалось выполнить запрос.';
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new HttpError(response.status, payload?.error ?? statusMessage(response.status));
  return payload as T;
}

export async function httpGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  return parseResponse<T>(response);
}

export async function httpPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}
