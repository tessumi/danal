import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
let client;

function getClient() {
  if (!client) {
    if (!apiKey) {
      throw new Error('missing_api_key');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export async function scoreWithAI({ user, day, recallText, emotionText, quizUserGuess, quizHistory }) {
  if (!apiKey) {
    return { ai: null, reasons: ['missing_api_key'] };
  }
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: {
      role: 'system',
      parts: [
        {
          text: `You are an assistant scoring cognitive recall tasks for elderly users.\nReturn strict JSON only.\nScoring rubric:\n- RecallSpecificity: 0..40 (concrete details, nouns, time/place/people; penalize generic)\n- RecallAffectBonus: 0..10 (positive language +10, neutral +5, negative +0)\n- EmotionTone: {10|20|30} (negative=10, neutral=20, positive=30)\n- Quiz: 0|10|20 (20 correct without hint; 10 if 'usedHint' true; 0 otherwise)\nEdge cases:\n- If no historical data for the asked quiz item, set quizScore=0 and reason="no_historical_context".\n- Never infer facts not present in provided history.\nReturn JSON with fields: { recallSpecificity, recallAffectBonus, emotionTone, quizScore, reasons: string[] }.`
        }
      ]
    }
  });

  const historyText = quizHistory && quizHistory.length ? quizHistory.join('\n') : 'no historical data';
  const payload = `USER: ${JSON.stringify(user)}\nDAY: ${day}\n\n[RECALL_TEXT]\n${recallText || '(empty)'}\n\n[EMOTION_TEXT]\n${emotionText || '(empty)'}\n\n[QUIZ_USER_GUESS]\n${quizUserGuess || '(no guess)'}\n\n[HISTORICAL_TRUTHS_FOR_QUIZ]\n${historyText}`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: payload }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
    const response = result.response;
    const text = response?.text?.() ?? '';
    if (!text) {
      return { ai: null, reasons: ['empty_response'] };
    }
    try {
      const json = JSON.parse(text);
      const reasons = Array.isArray(json.reasons) ? json.reasons : [];
      return { ai: json, reasons };
    } catch (err) {
      return { ai: null, reasons: ['parse_error'], raw: text };
    }
  } catch (error) {
    const reason = error.message === 'missing_api_key' ? 'missing_api_key' : 'ai_error';
    return { ai: null, reasons: [reason] };
  }
}
