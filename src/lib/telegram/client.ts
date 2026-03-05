const TELEGRAM_API_TIMEOUT_MS = 10000;

type SendMessageInput = {
  chatId: string;
  text: string;
  disableWebPagePreview?: boolean;
};

export async function sendMessage({ chatId, text, disableWebPagePreview = true }: SendMessageInput): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: disableWebPagePreview }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.description ?? `Telegram API error: ${response.status}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Превышен таймаут отправки в Telegram');
    }
    throw error instanceof Error ? error : new Error('Не удалось отправить сообщение в Telegram');
  } finally {
    clearTimeout(timeout);
  }
}
