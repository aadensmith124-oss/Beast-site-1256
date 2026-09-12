const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required.");
}
if (!webhookUrl) {
  throw new Error("TELEGRAM_WEBHOOK_URL is required, for example https://your-domain.com/api/telegram.");
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    ...(webhookSecret ? { secret_token: webhookSecret } : {}),
    allowed_updates: [
      "message",
      "callback_query",
    ],
  }),
});

const result = await response.json() as { ok?: boolean; description?: string };
if (!response.ok || !result.ok) {
  throw new Error(result.description || `Telegram setWebhook failed with HTTP ${response.status}.`);
}

console.log(`Telegram webhook configured for ${webhookUrl}`);