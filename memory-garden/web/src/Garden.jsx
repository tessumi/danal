import React, { useMemo } from 'react';

const FRUIT_COUNT = 30;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function generatePositions(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * GOLDEN_ANGLE;
    const radius = Math.sqrt(i + 0.5) / Math.sqrt(count) * 45;
    const x = 50 + Math.cos(angle) * radius * 1.2;
    const y = 50 + Math.sin(angle) * radius * 0.8;
    return { left: `${x}%`, top: `${y}%` };
  });
}

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Garden({ days = [], threshold = 70, onSelectDay }) {
  const positions = useMemo(() => generatePositions(FRUIT_COUNT), []);
  const statusMap = useMemo(() => new Map(days.map((d) => [d.dayIndex, d])), [days]);
  const flowers = useMemo(
    () =>
      days
        .filter((d) => d.status === 'success')
        .map((d) => {
          const rand = pseudoRandom(d.dayIndex * 12.3);
          return {
            key: d.dayIndex,
            left: 10 + rand * 80,
            delay: (pseudoRandom(d.dayIndex * 5.7) * 0.8).toFixed(2)
          };
        }),
    [days]
  );

  return (
    <section className="garden-section">
      <header className="section-header">
        <h1>기억의 정원</h1>
        <p>열매를 클릭해 오늘의 회상 여행을 시작하세요. 점수 {threshold}점 이상이면 꽃이 피어납니다.</p>
      </header>
      <div className="garden-container">
        <div className="tree" role="presentation">
          <div className="tree-canopy">
            {positions.map((pos, index) => {
              const dayNumber = index + 1;
              const day = statusMap.get(dayNumber);
              const stateClass = day ? `fruit-${day.status}` : '';
              return (
                <button
                  key={dayNumber}
                  type="button"
                  className={`fruit ${stateClass}`}
                  style={pos}
                  onClick={() => onSelectDay?.(dayNumber, day)}
                  aria-label={`Day ${dayNumber} 열매`}
                >
                  <span>{dayNumber}</span>
                </button>
              );
            })}
          </div>
          <div className="tree-trunk" aria-hidden="true" />
          <div className="tree-shadow" aria-hidden="true" />
          <div className="flower-field" aria-hidden="true">
            {flowers.map((flower) => (
              <span
                key={flower.key}
                className="flower"
                style={{ left: `${flower.left}%`, animationDelay: `${flower.delay}s` }}
              />
            ))}
          </div>
        </div>
        <div className="garden-legend">
          <div>
            <span className="legend-dot" /> 준비됨
          </div>
          <div>
            <span className="legend-dot success" /> 성공
          </div>
          <div>
            <span className="legend-dot fail" /> 재도전 필요
          </div>
        </div>
      </div>
      <div className="status-board" role="status" aria-live="polite">
        {days.length ? (
          <ul>
            {days.slice(-7).map((d) => (
              <li key={d.dayIndex}>
                Day {d.dayIndex}: {d.totalScore}점 ({d.status === 'success' ? '성공' : '실패'})
              </li>
            ))}
          </ul>
        ) : (
          <p>아직 플레이한 기록이 없습니다. 첫 열매를 눌러 시작해 보세요!</p>
        )}
      </div>
    </section>
  );
}
