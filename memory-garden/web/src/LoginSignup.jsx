import React, { useState } from 'react';

export default function LoginSignup({ onLogin, onSignup, loading }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginForm, setLoginForm] = useState({ login_id: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    username: '',
    gender: '',
    age: '',
    guardian_email: '',
    login_id: '',
    password: ''
  });

  const handleChange = (form, setter) => (e) => {
    setter({ ...form, [e.target.name]: e.target.value });
  };

  const submitLogin = (e) => {
    e.preventDefault();
    onLogin?.(loginForm);
  };

  const submitSignup = (e) => {
    e.preventDefault();
    const payload = {
      ...signupForm,
      age: signupForm.age ? Number(signupForm.age) : null
    };
    onSignup?.(payload);
  };

  return (
    <div className={`auth-container ${isSignUp ? 'sign-up-mode' : ''}`}>
      <div className="forms-container">
        <div className="signin-signup">
          <form className="form sign-in-form" onSubmit={submitLogin} aria-label="로그인 폼">
            <h2 className="title">로그인</h2>
            <label>
              <span className="sr-only">아이디</span>
              <input
                name="login_id"
                type="text"
                placeholder="아이디"
                aria-label="아이디"
                required
                value={loginForm.login_id}
                onChange={handleChange(loginForm, setLoginForm)}
              />
            </label>
            <label>
              <span className="sr-only">비밀번호</span>
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                aria-label="비밀번호"
                required
                value={loginForm.password}
                onChange={handleChange(loginForm, setLoginForm)}
              />
            </label>
            <button type="submit" className="btn solid" disabled={loading}>
              {loading ? '처리 중...' : '로그인'}
            </button>
          </form>

          <form className="form sign-up-form" onSubmit={submitSignup} aria-label="회원가입 폼">
            <h2 className="title">회원가입</h2>
            <label>
              <span className="sr-only">이름</span>
              <input
                name="username"
                type="text"
                placeholder="이름"
                aria-label="이름"
                required
                value={signupForm.username}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <label>
              <span className="sr-only">성별</span>
              <input
                name="gender"
                type="text"
                placeholder="성별 (선택)"
                aria-label="성별"
                value={signupForm.gender}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <label>
              <span className="sr-only">나이</span>
              <input
                name="age"
                type="number"
                placeholder="나이"
                aria-label="나이"
                min="0"
                value={signupForm.age}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <label>
              <span className="sr-only">보호자 이메일</span>
              <input
                name="guardian_email"
                type="email"
                placeholder="보호자 이메일 (선택)"
                aria-label="보호자 이메일"
                value={signupForm.guardian_email}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <label>
              <span className="sr-only">아이디</span>
              <input
                name="login_id"
                type="text"
                placeholder="아이디"
                aria-label="아이디"
                required
                value={signupForm.login_id}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <label>
              <span className="sr-only">비밀번호</span>
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                aria-label="비밀번호"
                required
                value={signupForm.password}
                onChange={handleChange(signupForm, setSignupForm)}
              />
            </label>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? '처리 중...' : '계정 생성'}
            </button>
          </form>
        </div>
      </div>

      <div className="panels-container" aria-hidden="true">
        <div className="panel left-panel">
          <div className="content">
            <h3>기억의 정원에 오신 것을 환영합니다</h3>
            <p>부드러운 회상과 감정 기록을 통해 나만의 정원을 가꿔보세요.</p>
            <button className="btn transparent" onClick={() => setIsSignUp(true)}>
              회원가입으로 이동
            </button>
          </div>
        </div>
        <div className="panel right-panel">
          <div className="content">
            <h3>이미 회원이신가요?</h3>
            <p>돌아오신 것을 환영합니다. 따뜻한 정원이 기다리고 있어요.</p>
            <button className="btn transparent" onClick={() => setIsSignUp(false)}>
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
