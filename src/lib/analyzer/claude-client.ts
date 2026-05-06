import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY が未設定です。.env.local または Vercel 環境変数に設定してください。",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";

export interface ClaudeJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

/**
 * システムプロンプトをキャッシュ対象とし、JSONレスポンスを取得するヘルパー
 */
export async function callClaudeJson<T>(
  request: ClaudeJsonRequest,
): Promise<T> {
  const client = getClient();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: request.maxTokens ?? 4096,
    system: [
      {
        type: "text",
        text: request.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: request.userPrompt,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude API からテキストレスポンスが取得できませんでした");
  }

  const text = block.text.trim();
  // JSON部分を抽出（```jsonブロックがあれば剥がす）
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) ??
    text.match(/```\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : text;

  try {
    return JSON.parse(jsonText) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    throw new Error(
      `Claude レスポンスのJSONパース失敗: ${msg}\n--- レスポンス先頭 ---\n${text.slice(0, 500)}`,
    );
  }
}

/** テスト用 */
export function resetClient() {
  _client = null;
}
