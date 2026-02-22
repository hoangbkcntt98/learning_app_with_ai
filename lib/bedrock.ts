import { BedrockRuntimeClient, ConverseCommand, type ImageFormat } from "@aws-sdk/client-bedrock-runtime";

const DEFAULT_MODEL_ID = "amazon.nova-lite-v1:0";
const DEFAULT_MAX_TOKENS = 300;
const DEFAULT_TEMPERATURE = 0.3;

export type BedrockImageInput = {
  format: ImageFormat;
  bytes: Uint8Array;
};

type BedrockGenerateOptions = {
  image?: BedrockImageInput;
  extraSystemPrompt?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number.parseFloat(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createBedrockClient() {
  const accessKeyId = requireEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AWS_SESSION_TOKEN?.trim();
  const region = process.env.BEDROCK_REGION?.trim() || requireEnv("AWS_REGION");

  return new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    },
  });
}

export async function generateBedrockText(
  prompt: string,
  options?: BedrockGenerateOptions,
): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const baseSystemPrompt = process.env.BEDROCK_SYSTEM_PROMPT?.trim();
  const extraSystemPrompt = options?.extraSystemPrompt?.trim();
  const maxTokens = parseNumberEnv("BEDROCK_MAX_TOKENS", DEFAULT_MAX_TOKENS);
  const temperature = parseNumberEnv("BEDROCK_TEMPERATURE", DEFAULT_TEMPERATURE);

  const client = createBedrockClient();
  const userContent = options?.image
    ? [
        { text: prompt },
        {
          image: {
            format: options.image.format,
            source: {
              bytes: options.image.bytes,
            },
          },
        },
      ]
    : [{ text: prompt }];

  const systemBlocks = [
    ...(baseSystemPrompt ? [{ text: baseSystemPrompt }] : []),
    ...(extraSystemPrompt ? [{ text: extraSystemPrompt }] : []),
  ];

  const command = new ConverseCommand({
    modelId,
    system: systemBlocks.length > 0 ? systemBlocks : undefined,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    inferenceConfig: {
      maxTokens,
      temperature,
    },
  });

  const response = await client.send(command);
  const content = response.output?.message?.content;
  if (!content?.length) {
    throw new Error("Bedrock returned an empty response.");
  }

  const text = content.find((item) => "text" in item && typeof item.text === "string")?.text;
  if (!text) {
    throw new Error("Bedrock returned a non-text response.");
  }

  return text.trim();
}
