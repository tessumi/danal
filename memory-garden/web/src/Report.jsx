import React from 'react';

export default function Report({ report }) {
  if (!report) return null;
  return (
    <section className="report-section">
      <header className="section-header">
        <h2>주간 리포트</h2>
        <p>최근 7회 평균 점수: {Math.round(report.average || 0)}점</p>
      </header>
      <div className="report-chart" role="img" aria-label="최근 7회 점수 막대 그래프">
        {(report.sessions || []).map((session) => (
          <div key={session.dayIndex} className="report-bar">
            <div className="bar" style={{ height: `${Math.min(100, session.totalScore)}%` }}>
              <span className="score">{session.totalScore}</span>
            </div>
            <span className="label">Day {session.dayIndex}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
