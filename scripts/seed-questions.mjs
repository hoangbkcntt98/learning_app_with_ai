import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
      options: [
        "暇なら来てください",
        "できるだけ早く来てください",
        "明日の朝来てください",
        "早く来ないでください",
      ],
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

  await prisma.question.deleteMany();

  for (const seed of seeds) {
    await prisma.question.create({
      data: {
        level: seed.level,
        prompt: seed.prompt,
        option1: seed.options[0],
        option2: seed.options[1],
        option3: seed.options[2],
        option4: seed.options[3],
        correctIndex: seed.correctIndex,
      },
    });
  }

  console.log(`Seeding complete. Wrote ${seeds.length} question(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to seed questions:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
