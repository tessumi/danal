import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { run, get, all } from './db.mjs';
import { scoreSubmission } from './scoring.mjs';
import { scoreWithAI } from './ai.mjs';
import { sendGuardianNotification } from './mailer.mjs';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const SCORE_THRESHOLD = 70;

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

app.post('/auth/signup', async (req, res) => {
  const { username, gender, age, guardian_email, login_id, password } = req.body || {};
  if (!username || !login_id || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  try {
    const existing = await get('SELECT id FROM users WHERE login_id = ?', [login_id]);
    if (existing) {
      return res.status(409).json({ error: 'login_id_taken' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (username, gender, age, guardian_email, login_id, password_hash) VALUES (?,?,?,?,?,?)',
      [username, gender || null, age || null, guardian_email || null, login_id, hash]
    );
    const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { login_id, password } = req.body || {};
  if (!login_id || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  try {
    const user = await get('SELECT * FROM users WHERE login_id = ?', [login_id]);
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/garden', authMiddleware, async (req, res) => {
  try {
    const days = await all(
      'SELECT day_index AS dayIndex, total_score AS totalScore, status FROM daily_sessions WHERE user_id = ? ORDER BY day_index ASC',
      [req.user.id]
    );
    res.json({ days, threshold: SCORE_THRESHOLD });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/play/submit', authMiddleware, async (req, res) => {
  const { day, answers } = req.body || {};
  if (Number.isNaN(Number(day)) || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const dayIndex = Number(day);
  try {
    const existing = await get('SELECT * FROM daily_sessions WHERE user_id = ? AND day_index = ?', [req.user.id, dayIndex]);
    if (existing && existing.status === 'success') {
      return res.status(400).json({ error: 'already_completed' });
    }

    const recallText = answers.find((a) => a.mode === 'recall')?.text || '';
    const emotionText = answers.find((a) => a.mode === 'emotion')?.text || '';
    const quizGuess = answers.find((a) => a.mode === 'quiz')?.text || '';
    const usedHint = answers.find((a) => a.mode === 'quiz')?.usedHint || false;

    const pastQuiz = await all(
      'SELECT payload FROM answers WHERE user_id = ? AND mode = "quiz" ORDER BY created_at DESC LIMIT 14',
      [req.user.id]
    );
    const quizHistory = pastQuiz
      .map((row) => {
        try {
          const data = JSON.parse(row.payload);
          return data?.truth || data?.text || JSON.stringify(data);
        } catch (err) {
          return row.payload;
        }
      })
      .filter(Boolean);

    const aiResult = await scoreWithAI({
      user: { username: req.user.username, age: req.user.age },
      day: dayIndex,
      recallText,
      emotionText,
      quizUserGuess: quizGuess,
      quizHistory
    });

    const scored = scoreSubmission(answers, aiResult.ai);
    const reasons = aiResult.reasons || [];
    const total = scored.total;
    const status = total >= SCORE_THRESHOLD ? 'success' : 'fail';

    await run('BEGIN');
    await run('DELETE FROM answers WHERE user_id = ? AND day_index = ?', [req.user.id, dayIndex]);
    for (const answer of answers) {
      await run(
        'INSERT INTO answers (user_id, day_index, mode, payload, score) VALUES (?,?,?,?,?)',
        [
          req.user.id,
          dayIndex,
          answer.mode,
          JSON.stringify(answer),
          Math.round(scored.perMode[answer.mode] || 0)
        ]
      );
    }
    await run(
      `INSERT INTO daily_sessions (user_id, day_index, played_at, total_score, status)
       VALUES (?,?,?,?,?)
       ON CONFLICT(user_id, day_index) DO UPDATE SET played_at=excluded.played_at, total_score=excluded.total_score, status=excluded.status`,
      [req.user.id, dayIndex, new Date().toISOString(), Math.round(total), status]
    );
    await run('COMMIT');

    res.json({
      total,
      perMode: scored.perMode,
      status,
      threshold: SCORE_THRESHOLD,
      reasons: reasons.length ? reasons : undefined,
      ruleScores: scored.ruleScores
    });
  } catch (error) {
    console.error(error);
    await run('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'server_error' });
  }
});

app.get('/report/weekly', authMiddleware, async (req, res) => {
  try {
    const rows = await all(
      'SELECT day_index AS dayIndex, total_score AS totalScore, status, played_at AS playedAt FROM daily_sessions WHERE user_id = ? ORDER BY played_at DESC LIMIT 7',
      [req.user.id]
    );
    const ordered = rows.slice().reverse();
    const average = ordered.length ? ordered.reduce((sum, r) => sum + r.totalScore, 0) / ordered.length : 0;
    res.json({ average, sessions: ordered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error' });
  }
});

app.post('/notify/guardian', authMiddleware, async (req, res) => {
  const guardian = req.user.guardian_email;
  if (!guardian) {
    return res.status(400).json({ error: 'guardian_not_set' });
  }
  try {
    const rows = await all(
      'SELECT day_index AS dayIndex, total_score AS totalScore, status, played_at AS playedAt FROM daily_sessions WHERE user_id = ? ORDER BY played_at DESC LIMIT 3',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'no_activity' });
    }
    const list = rows
      .map(
        (row) => `<li>Day ${row.dayIndex}: ${row.totalScore} (${row.status}) on ${new Date(row.playedAt).toLocaleString()}</li>`
      )
      .join('');
    const html = `
      <p>${req.user.username}님의 최근 활동 보고서입니다.</p>
      <ul>${list}</ul>
      <p>Memory Garden 드림.</p>
    `;
    const result = await sendGuardianNotification({
      to: guardian,
      subject: 'Memory Garden 최근 활동 보고',
      html
    });
    if (!result.sent) {
      return res.status(500).json({ error: 'mailer_error', reason: result.reason });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`Memory Garden server running on port ${PORT}`);
});
