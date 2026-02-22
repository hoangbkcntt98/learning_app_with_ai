import { Pool } from "pg";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  const parentRoot = path.resolve(projectRoot, "..");
  loadEnvFile(path.join(parentRoot, ".env"));
  loadEnvFile(path.join(parentRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env"));
  loadEnvFile(path.join(projectRoot, ".env.local"));
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      level TEXT NOT NULL CHECK (level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
      prompt TEXT NOT NULL,
      option_1 TEXT NOT NULL,
      option_2 TEXT NOT NULL,
      option_3 TEXT NOT NULL,
      option_4 TEXT NOT NULL,
      correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function main() {
  loadEnv();
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  await ensureSchema(pool);

  const seeds = [
    {
      level: "N5",
      prompt: "「いぬ」はどれですか。",
      options: ["犬", "猫", "鳥", "魚"],
      correctIndex: 0,
    },
    {
      level: "N5",
      prompt: "「あかい くるま」の意味はどれですか。",
      options: ["青い車", "小さい車", "赤い車", "速い車"],
      correctIndex: 2,
    },
    {
      level: "N4",
      prompt: "「先週」はいつですか。",
      options: ["来週", "今週", "先週", "週末"],
      correctIndex: 2,
    },
    {
      level: "N4",
      prompt: "「雨が降りそうです」の意味はどれですか。",
      options: ["今、雨が降っている", "雨が降りそうだ", "雨がやんだ", "雨が好きだ"],
      correctIndex: 1,
    },
    {
      level: "N3",
      prompt: "「参加する」の意味として最も近いものはどれですか。",
      options: ["加わる", "離れる", "決める", "説明する"],
      correctIndex: 0,
    },
    {
      level: "N3",
      prompt: "「できるだけ早く来てください」の意味はどれですか。",
      options: ["暇なら来てください", "できるだけ早く来てください", "明日の朝来てください", "早く来ないでください"],
      correctIndex: 1,
    },
    {
      level: "N2",
      prompt: "「影響を与える」の意味に近いものはどれですか。",
      options: ["避ける", "影響する", "合わせる", "頼む"],
      correctIndex: 1,
    },
    {
      level: "N2",
      prompt: "「必ずしも〜ない」の意味はどれですか。",
      options: ["いつも〜だ", "いつも〜とは限らない", "決して〜ない", "完全に〜だ"],
      correctIndex: 1,
    },
    {
      level: "N1",
      prompt: "「〜に至っては」の用法として適切なものはどれですか。",
      options: ["極端な例を挙げる", "原因を示す", "対比を示す", "目的を示す"],
      correctIndex: 0,
    },
    {
      level: "N1",
      prompt: "「看過できない」の意味はどれですか。",
      options: ["見過ごせない", "簡単に解決できる", "延期しなければならない", "重要ではない"],
      correctIndex: 0,
    },
  ];

  await pool.query("TRUNCATE TABLE questions RESTART IDENTITY");

  for (const seed of seeds) {
    await pool.query(
      `INSERT INTO questions (level, prompt, option_1, option_2, option_3, option_4, correct_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        seed.level,
        seed.prompt,
        seed.options[0],
        seed.options[1],
        seed.options[2],
        seed.options[3],
        seed.correctIndex,
      ],
    );
  }

  await pool.end();
  console.log(`Seeding complete. Wrote ${seeds.length} question(s).`);
}

main().catch((error) => {
  console.error("Failed to seed questions:", error);
  process.exit(1);
});
