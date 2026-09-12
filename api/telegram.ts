import { createTelegramBot } from "../server/telegram.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): void;
};

let bot: ReturnType<typeof createTelegramBot> | undefined;

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function telegramWebhookHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    configuredSecret &&
    headerValue(req.headers["x-telegram-bot-api-secret-token"]) !== configuredSecret
  ) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!req.body || typeof req.body !== "object") {
    res.status(400).json({ message: "Invalid Telegram update" });
    return;
  }

  bot ??= createTelegramBot();
  if (!bot) {
    res.status(503).json({
      message: "Telegram bot is not configured.",
      code: "BOT_NOT_CONFIGURED",
    });
    return;
  }

  try {
    await bot.handleUpdate(req.body as any);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(
      "[telegram] webhook update failed:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    res.status(500).json({ message: "Telegram update failed." });
  }
}