const POS_KEYWORDS = ['좋', '행복', '기쁨', '즐겁', '반가', '뿌듯', '고맙'];
const NEG_KEYWORDS = ['슬픔', '불안', '걱정', '우울', '화났', '짜증', '무서'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function detectSentiment(text) {
  if (!text) return 'neutral';
  const hasPos = POS_KEYWORDS.some((k) => text.includes(k));
  const hasNeg = NEG_KEYWORDS.some((k) => text.includes(k));
  if (hasPos && !hasNeg) return 'positive';
  if (hasNeg && !hasPos) return 'negative';
  if (hasPos && hasNeg) return 'neutral';
  return 'neutral';
}

export function scoreRecallRule(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, sentiment: 'neutral' };
  const lengthComponent = Math.floor(trimmed.length / 10);
  const words = trimmed.match(/[\p{L}\p{N}]+/gu) || [];
  const nounsComponent = Math.min(20, words.filter((w) => w.length >= 2).length * 2);
  const base = Math.min(40, lengthComponent + nounsComponent);
  const sentiment = detectSentiment(trimmed);
  const bonus = sentiment === 'positive' ? 10 : sentiment === 'neutral' ? 5 : 0;
  return { score: clamp(base + bonus, 0, 50), sentiment };
}

export function scoreEmotionRule(text = '') {
  const sentiment = detectSentiment(text);
  if (sentiment === 'positive') return { score: 30, sentiment };
  if (sentiment === 'negative') return { score: 10, sentiment };
  return { score: 20, sentiment };
}

export function scoreQuizRule(answer = {}) {
  if (answer.correct) {
    return { score: answer.usedHint ? 10 : 20 };
  }
  return { score: 0 };
}

export function aggregateScores({ recallRule, emotionRule, quizRule }, aiResult) {
  const aiRecallSpecificity = aiResult?.recallSpecificity ?? 0;
  const aiRecallBonus = aiResult?.recallAffectBonus ?? 0;
  const aiEmotionTone = aiResult?.emotionTone ?? null;
  const aiQuizScore = aiResult?.quizScore ?? 0;

  const finalRecall = clamp(
    recallRule.score * 0.6 + (aiResult ? aiRecallSpecificity + aiRecallBonus : recallRule.score) * 0.4,
    0,
    50
  );
  const fallbackEmotion = aiEmotionTone ?? emotionRule.score;
  const finalEmotion = clamp(
    emotionRule.score * 0.6 + fallbackEmotion * 0.4,
    10,
    30
  );
  const finalQuiz = Math.max(quizRule.score, aiQuizScore);

  const total = clamp(finalRecall + finalEmotion + finalQuiz, 0, 100);
  return {
    total,
    perMode: {
      recall: finalRecall,
      emotion: finalEmotion,
      quiz: finalQuiz
    }
  };
}

export function scoreSubmission(answers, aiResult) {
  const recallText = answers.find((a) => a.mode === 'recall')?.text || '';
  const emotionText = answers.find((a) => a.mode === 'emotion')?.text || '';
  const quizAnswer = answers.find((a) => a.mode === 'quiz') || {};

  const recallRule = scoreRecallRule(recallText);
  const emotionRule = scoreEmotionRule(emotionText);
  const quizRule = scoreQuizRule(quizAnswer);

  const agg = aggregateScores({ recallRule, emotionRule, quizRule }, aiResult);
  return {
    ...agg,
    ruleScores: {
      recall: recallRule,
      emotion: emotionRule,
      quiz: quizRule
    }
  };
}
