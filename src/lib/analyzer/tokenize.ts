import path from "node:path";
import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";

const DICT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "kuromoji",
  "dict",
);

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (tokenizerPromise) return tokenizerPromise;
  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: DICT_PATH })
      .build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
  });
  return tokenizerPromise;
}

const STOP_WORDS = new Set<string>([
  "こと",
  "もの",
  "ため",
  "とき",
  "ところ",
  "よう",
  "そう",
  "これ",
  "それ",
  "あれ",
  "どれ",
  "ここ",
  "そこ",
  "あそこ",
  "どこ",
  "私",
  "私たち",
  "皆様",
  "お客様",
  "方",
  "場合",
  "今",
  "今回",
  "今後",
  "現在",
  "以下",
  "以上",
  "以前",
  "以降",
  "など",
  "等",
  "他",
  "全",
  "全て",
  "様々",
  "それぞれ",
  "毎",
  "中",
  "内",
  "外",
  "前",
  "後",
  "次",
  "事",
  "者",
  "者様",
  "本",
  "店",
  "頃",
  "間",
  "回",
  "方々",
  "皆",
  "ら",
]);

const NON_WORD_PATTERN = /^[\s\d.,。、！!？?「」（）()【】"'\-_\/\\:;＠@#＃$＄%％&＆*＊+＋=＝]+$/;

const VALID_CATEGORIES = new Set(["名詞"]);

const SUB_CATEGORY_BLOCKLIST = new Set([
  "代名詞",
  "数",
  "非自立",
  "接尾",
  "副詞可能",
]);

export interface Token {
  surface: string;
  basic: string;
  pos: string;
  posDetail: string;
}

export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();
  return tokenizer.tokenize(text).map((t) => ({
    surface: t.surface_form,
    basic: t.basic_form === "*" ? t.surface_form : t.basic_form,
    pos: t.pos,
    posDetail: t.pos_detail_1,
  }));
}

export async function extractTerms(text: string): Promise<string[]> {
  const tokens = await tokenize(text);
  const terms: string[] = [];

  for (const token of tokens) {
    if (!VALID_CATEGORIES.has(token.pos)) continue;
    if (SUB_CATEGORY_BLOCKLIST.has(token.posDetail)) continue;

    const term = token.basic.trim();
    if (term.length < 2) continue;
    if (STOP_WORDS.has(term)) continue;
    if (NON_WORD_PATTERN.test(term)) continue;

    terms.push(term);
  }

  return terms;
}

export async function extractCompoundNouns(text: string): Promise<string[]> {
  const tokens = await tokenize(text);
  const compounds: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      const single = buffer[0];
      if (
        single.length >= 2 &&
        !STOP_WORDS.has(single) &&
        !NON_WORD_PATTERN.test(single)
      ) {
        compounds.push(single);
      }
    } else {
      const joined = buffer.join("");
      if (joined.length >= 2 && !NON_WORD_PATTERN.test(joined)) {
        compounds.push(joined);
      }
    }
    buffer = [];
  };

  for (const token of tokens) {
    if (
      VALID_CATEGORIES.has(token.pos) &&
      !SUB_CATEGORY_BLOCKLIST.has(token.posDetail)
    ) {
      buffer.push(token.surface);
    } else {
      flush();
    }
  }
  flush();

  return compounds;
}

/** テスト用: tokenizer をリセット */
export function resetTokenizer() {
  tokenizerPromise = null;
}
