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

/**
 * システム指示 + ユーザープロンプトでJSONレスポンスを取得
 * Gemini の responseMimeType: "application/json" + responseSchema を使う
 */
export async function callGeminiJson<T>(
  request: GeminiJsonRequest,
): Promise<T> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: request.userPrompt,
    config: {
      systemInstruction: request.systemPrompt,
      responseMimeType: "application/json",
      ...(request.responseSchema && { responseSchema: request.responseSchema }),
      maxOutputTokens: request.maxTokens ?? 8192,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini API からテキストレスポンスが取得できませんでした");
  }

  try {
    return JSON.parse(text.trim()) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(
      `Gemini レスポンスのJSONパース失敗: ${msg}\n--- レスポンス先頭 ---\n${text.slice(0, 500)}`,
    );
  }
}

/** テスト用 */
export function resetClient() {
  _client = null;
}
