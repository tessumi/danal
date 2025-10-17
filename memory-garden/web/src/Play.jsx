import React, { useMemo, useState } from 'react';

const QUIZ_BANK = [
  {
    prompt: '오늘의 퀴즈: 어제 전화 통화한 사람은 누구였나요?',
    answer: '손자',
    hint: '가족 중 한 명입니다.'
  },
  {
    prompt: '어제 드셨던 간식은 무엇이었나요?',
    answer: '떡',
    hint: '쌀로 만든 전통 간식입니다.'
  },
  {
    prompt: '산책을 했던 장소는 어디였나요?',
    answer: '공원',
    hint: '나무와 벤치가 있는 곳입니다.'
  }
];

function normalize(text) {
  return (text || '').trim().toLowerCase();
}

export default function Play({ day, onSubmit, loading, result }) {
  const quiz = useMemo(() => QUIZ_BANK[(day - 1) % QUIZ_BANK.length], [day]);
  const [recallText, setRecallText] = useState('');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [emotionText, setEmotionText] = useState('');
  const [usedHint, setUsedHint] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = normalize(quizAnswer) === normalize(quiz.answer);
    const answers = [
      { mode: 'recall', text: recallText },
      { mode: 'quiz', text: quizAnswer, correct, usedHint, truth: quiz.answer },
      { mode: 'emotion', text: emotionText }
    ];
    onSubmit?.({ day, answers, usedHint, correct });
  };

  return (
    <form className="play-form" onSubmit={handleSubmit}>
      <header>
        <h2>Day {day} 회상 여행</h2>
        <p>차분히 작성하시고, 과거 기록이 없을 경우 퀴즈 점수는 AI가 0점 처리할 수 있어요.</p>
      </header>

      <fieldset>
        <legend>1. 회상 기록</legend>
        <label className="textarea-label">
          <span>최근 기억을 자세히 적어주세요.</span>
          <textarea
            required
            value={recallText}
            onChange={(e) => setRecallText(e.target.value)}
            minLength={10}
            rows={4}
            aria-label="회상 내용"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>2. 퀴즈</legend>
        <p className="quiz-prompt">{quiz.prompt}</p>
        <div className="quiz-row">
          <label>
            <span className="sr-only">퀴즈 답변</span>
            <input
              type="text"
              value={quizAnswer}
              onChange={(e) => setQuizAnswer(e.target.value)}
              required
              aria-label="퀴즈 답변"
            />
          </label>
          <button
            type="button"
            className="btn hint"
            onClick={() => setUsedHint(true)}
            aria-pressed={usedHint}
          >
            힌트 보기
          </button>
        </div>
        {usedHint && <p className="hint-text">힌트: {quiz.hint}</p>}
      </fieldset>

      <fieldset>
        <legend>3. 감정 기록</legend>
        <label className="textarea-label">
          <span>지금 느끼는 감정을 적어주세요.</span>
          <textarea
            required
            value={emotionText}
            onChange={(e) => setEmotionText(e.target.value)}
            rows={3}
            aria-label="감정 기록"
          />
        </label>
      </fieldset>

      <div className="play-footer">
        <button type="submit" className="btn solid" disabled={loading}>
          {loading ? '채점 중...' : '기록 제출'}
        </button>
      </div>

      {result && (
        <section className="play-result" aria-live="polite">
          <h3>결과</h3>
          <p>
            총점 {Math.round(result.total)}점 / {result.threshold}점 기준 →{' '}
            {result.status === 'success' ? '축하합니다! 꽃이 피었어요.' : '조금만 더 노력해봐요.'}
          </p>
          <div className="result-bars">
            {Object.entries(result.perMode || {}).map(([mode, score]) => (
              <div key={mode} className="result-bar">
                <span className="label">{mode}</span>
                <div className="bar" role="progressbar" aria-valuenow={score} aria-valuemin="0" aria-valuemax="50">
                  <div style={{ width: `${Math.min(100, score)}%` }} />
                </div>
                <span className="score">{Math.round(score)}</span>
              </div>
            ))}
          </div>
          {result.reasons && result.reasons.length > 0 && (
            <ul className="reasons">
              {result.reasons.map((reason) => (
                <li key={reason}>AI 안내: {reason}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}
