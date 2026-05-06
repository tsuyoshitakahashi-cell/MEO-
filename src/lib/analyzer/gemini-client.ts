import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY が未設定です。https://aistudio.google.com/apikey で取得し、.env.local または Vercel 環境変数に設定してください。",
      );
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Zod schema 由来の JSON Schema（responseSchema 用） */
  responseSchema?: object;
  maxTokens?: number;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000;

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // status コード抽出
  const statusMatch = msg.match(/"code":\s*(\d+)/) ?? msg.match(/\b(\d{3})\b/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  if (RETRYABLE_STATUSES.has(status)) return true;
  // ステータス文字列からも判定
  if (/UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|INTERNAL/.test(msg))
    return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * システム指示 + ユーザープロンプトでJSONレスポンスを取得
 * Gemini の responseMimeType: "application/json" + responseSchema を使う
 * 503/429/500等の一時エラーは指数バックオフで最大4回リトライ
 */
export async function callGeminiJson<T>(
  request: GeminiJsonRequest,
): Promise<T> {
  const client = getClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: request.userPrompt,
        config: {
          systemInstruction: request.systemPrompt,
          responseMimeType: "application/json",
          ...(request.responseSchema && {
            responseSchema: request.responseSchema,
          }),
          maxOutputTokens: request.maxTokens ?? 8192,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error(
          "Gemini API からテキストレスポンスが取得できませんでした",
        );
      }

      try {
        return JSON.parse(text.trim()) as T;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        throw new Error(
          `Gemini レスポンスのJSONパース失敗: ${msg}\n--- レスポンス先頭 ---\n${text.slice(0, 500)}`,
        );
      }
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === MAX_RETRIES - 1) {
        break;
      }
      const waitMs = BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[gemini] retryable error on attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${waitMs}ms: ${errMsg.slice(0, 200)}`,
      );
      await delay(waitMs);
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  // ユーザー向けに整形
  if (isRetryableError(lastError)) {
    throw new Error(
      `Gemini API が一時的に高負荷状態です（${MAX_RETRIES}回リトライしましたが回復しませんでした）。数分待って再度お試しください。\n詳細: ${msg.slice(0, 300)}`,
    );
  }
  throw new Error(`Gemini API エラー: ${msg.slice(0, 500)}`);
}

/** テスト用 */
export function resetClient() {
  _client = null;
}
