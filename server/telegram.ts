import { Bot } from "grammy";
import { log } from "./logger.js";

function getTelegramToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN ?? process.env.BOT_TOKEN;
}

/**
 * Create the Telegram bot instance for webhook handlers.
 *
 * Webhook deployments must not start long polling. The Vercel endpoint calls
 * handleUpdate on the returned bot for each incoming update.
 */
export function createTelegramBot(): Bot | null {
  const token = getTelegramToken();
  if (!token) {
    log("Telegram bot token not set — bot disabled", "telegram");
    return null;
  }

  const bot = new Bot(token);
  bot.catch((error) => {
    console.error("[telegram] bot update failed:", error.error);
  });
  return bot;
}

/**
 * Start long polling for persistent runtimes such as the local app or VM.
 * Vercel initialization explicitly disables background jobs, so this is not
 * called by the serverless handler.
 */
export function startTelegramBot(): Bot | null {
  const bot = createTelegramBot();
  if (!bot) return null;

  bot.start({
    onStart: () => log("Telegram bot started (long polling)", "telegram"),
  }).catch((error) => {
    console.error("[telegram] bot failed to start:", error);
  });

  return bot;
}

