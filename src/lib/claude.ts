import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export interface TensePracticeItem {
  sentence: string;
  correct_answer: string;
  hint: string;
}

export interface ReadingComprehensionQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

export interface ReadingComprehensionContent {
  paragraph: string;
  questions: ReadingComprehensionQuestion[];
}

export async function generateTensePractice(
  tense: string,
  level: string
): Promise<TensePracticeItem[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate 10 German sentences in the ${tense} tense appropriate for ${level} level learners. Each sentence should have one verb missing (replace with ___). Provide the output as a valid JSON array with no additional text, in this exact format:
[
  {"sentence": "Ich ___ nach Hause.", "correct_answer": "gehe", "hint": "gehen"},
  ...
]
Make sure all sentences are appropriate for ${level} level and clearly demonstrate the ${tense} tense.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Could not parse JSON from response");

  return JSON.parse(jsonMatch[0]) as TensePracticeItem[];
}

export async function generateReadingComprehension(
  topic: string,
  level: string
): Promise<ReadingComprehensionContent> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate a German reading comprehension exercise about "${topic}" appropriate for ${level} level learners. Provide the output as a valid JSON object with no additional text, in this exact format:
{
  "paragraph": "A German paragraph about the topic (4-6 sentences, appropriate for ${level} level)...",
  "questions": [
    {
      "question": "Question in German?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    },
    {
      "question": "Second question in German?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B"
    },
    {
      "question": "Third question in German?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option C"
    }
  ]
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse JSON from response");

  return JSON.parse(jsonMatch[0]) as ReadingComprehensionContent;
}
