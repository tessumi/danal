import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginSignup from './LoginSignup.jsx';
import Garden from './Garden.jsx';
import Play from './Play.jsx';
import Report from './Report.jsx';
import Modal from './components/Modal.jsx';
import Toast from './components/Toast.jsx';
import { apiFetch } from './api.js';
import { getToken, setToken, clearToken } from './auth.js';

function DashboardLayout({ user, garden, report, onSelectDay, onLogout, onNotifyGuardian }) {
  return (
    <div className="dashboard">
      <header className="top-bar">
        <div>
          <h1>기억의 정원</h1>
          <p className="welcome">{user.username} 님 환영합니다.</p>
        </div>
        <div className="top-bar-actions">
          {user.guardian_email && (
            <button className="btn ghost" onClick={onNotifyGuardian}>
              보호자에게 알림 보내기
            </button>
          )}
          <button className="btn ghost" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <main>
        <Garden days={garden.days} threshold={garden.threshold} onSelectDay={onSelectDay} />
        <Report report={report} />
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playLoading, setPlayLoading] = useState(false);
  const [garden, setGarden] = useState({ days: [], threshold: 70 });
  const [report, setReport] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [playResult, setPlayResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInit(false);
      return;
    }
    async function bootstrap() {
      try {
        const data = await apiFetch('/me');
        setUser(data.user);
        await Promise.all([refreshGarden(), refreshReport()]);
      } catch (error) {
        clearToken();
      } finally {
        setInit(false);
      }
    }
    bootstrap();
  }, []);

  const refreshGarden = async () => {
    const data = await apiFetch('/garden');
    setGarden(data);
  };

  const refreshReport = async () => {
    const data = await apiFetch('/report/weekly');
    setReport(data);
  };

  const handleAuthSuccess = async ({ token, user: profile }) => {
    setToken(token);
    setUser(profile);
    setToast('환영합니다! 정원으로 이동합니다.');
    await Promise.all([refreshGarden(), refreshReport()]);
    navigate('/garden');
  };

  const handleLogin = async (payload) => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/login', { method: 'POST', body: payload, auth: false });
      await handleAuthSuccess(data);
    } catch (error) {
      setToast('로그인에 실패했습니다. 정보를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (payload) => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/signup', { method: 'POST', body: payload, auth: false });
      await handleAuthSuccess(data);
    } catch (error) {
      if (error.payload?.error === 'login_id_taken') {
        setToast('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
      } else {
        setToast('회원가입에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setGarden({ days: [], threshold: 70 });
    setReport(null);
    navigate('/');
  };

  const handleSelectDay = (day, info) => {
    if (info && info.status === 'success') {
      setToast('이미 완성한 열매입니다. 다른 날을 선택해주세요.');
      return;
    }
    setSelectedDay(day);
    setPlayResult(null);
  };

  const handleSubmitPlay = async ({ day, answers }) => {
    try {
      setPlayLoading(true);
      const data = await apiFetch('/play/submit', { method: 'POST', body: { day, answers } });
      setPlayResult(data);
      await Promise.all([refreshGarden(), refreshReport()]);
      setToast(
        data.status === 'success' ? '꽃이 피었습니다! 축하해요.' : '점수가 조금 부족해요. 다시 도전해보세요.'
      );
    } catch (error) {
      if (error.payload?.error === 'already_completed') {
        setToast('오늘의 열매는 이미 완성되었습니다.');
      } else {
        setToast('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setPlayLoading(false);
    }
  };

  const handleNotifyGuardian = async () => {
    try {
      await apiFetch('/notify/guardian', { method: 'POST', body: {} });
      setToast('최근 활동을 보호자에게 전송했습니다.');
    } catch (error) {
      if (error.payload?.error === 'no_activity') {
        setToast('보낼 활동이 아직 없습니다. 먼저 플레이를 완료해주세요.');
      } else if (error.payload?.error === 'guardian_not_set') {
        setToast('등록된 보호자 이메일이 없습니다.');
      } else if (error.payload?.error === 'mailer_error') {
        setToast('메일 전송에 실패했습니다. 설정을 확인해주세요.');
      } else {
        setToast('알림 전송 중 문제가 발생했습니다.');
      }
    }
  };

  const router = useMemo(() => {
    if (!user) {
      return (
        <Routes>
          <Route path="*" element={<LoginSignup onLogin={handleLogin} onSignup={handleSignup} loading={loading} />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route
          path="/garden"
          element={
            <DashboardLayout
              user={user}
              garden={garden}
              report={report}
              onSelectDay={handleSelectDay}
              onLogout={handleLogout}
              onNotifyGuardian={handleNotifyGuardian}
            />
          }
        />
        <Route path="*" element={<Navigate to="/garden" replace />} />
      </Routes>
    );
  }, [user, garden, report, loading]);

  if (init) {
    return <div className="loading-screen">정원을 준비하는 중입니다...</div>;
  }

  return (
    <div className="app-shell">
      {router}
      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={`Day ${selectedDay} 플레이`}>
        {selectedDay && (
          <Play day={selectedDay} onSubmit={handleSubmitPlay} loading={playLoading} result={playResult} />
        )}
      </Modal>
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
