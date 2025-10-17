import 'dotenv/config';
import bcrypt from 'bcrypt';
import { run, get } from './db.mjs';

async function seed() {
  const loginId = 'tester';
  const password = 'password123';
  const existing = await get('SELECT id FROM users WHERE login_id = ?', [loginId]);
  if (existing) {
    console.log('Seed user already exists.');
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await run(
    'INSERT INTO users (username, gender, age, guardian_email, login_id, password_hash) VALUES (?,?,?,?,?,?)',
    ['홍길동', 'female', 72, 'guardian@example.com', loginId, hash]
  );
  console.log('Seed user created: tester / password123');
}

seed().then(() => process.exit(0));
