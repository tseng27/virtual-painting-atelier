/** Lightweight, static studio illustration for devices without WebGL or in lite mode. */
export function StudioStatic({ preview, aspect, onEaselClick }: { preview?: string; aspect: number; onEaselClick: () => void }) {
  const W = aspect >= 1 ? Math.min(300, 230 * aspect) : 230 * aspect;
  const H = W / aspect;
  const cx = 500, top = 520 - H;
  return (
    <div className="studio-static" data-testid="studio-static">
      <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" aria-hidden="false" role="img" aria-label="畫室">
        <defs>
          <linearGradient id="win" x1="0" x2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#f3e6cc" /></linearGradient>
          <radialGradient id="sun" cx="0.15" cy="0.3" r="0.9"><stop offset="0" stopColor="rgba(255,240,210,.55)" /><stop offset="1" stopColor="rgba(255,240,210,0)" /></radialGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a6544" /><stop offset="1" stopColor="#4d3726" /></linearGradient>
        </defs>
        <rect width="1000" height="470" fill="#e4dac8" />
        <rect y="470" width="1000" height="330" fill="url(#floor)" />
        {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={i * 130 - 40} y1="470" x2={i * 170 - 300} y2="800" stroke="rgba(40,25,12,.35)" strokeWidth="2" />)}
        <rect x="40" y="70" width="190" height="330" fill="url(#win)" stroke="#efe9de" strokeWidth="12" />
        <line x1="135" y1="70" x2="135" y2="400" stroke="#efe9de" strokeWidth="6" /><line x1="40" y1="235" x2="230" y2="235" stroke="#efe9de" strokeWidth="6" />
        <polygon points="230,120 640,470 900,800 120,800 40,400" fill="url(#sun)" />
        <g stroke="#7a5638" strokeWidth="12" strokeLinecap="round">
          <line x1={cx - 90} y1="740" x2={cx - 20} y2="200" /><line x1={cx + 90} y1="740" x2={cx + 20} y2="200" /><line x1={cx} y1="700" x2={cx} y2="180" strokeWidth="10" />
        </g>
        <rect x={cx - W / 2 - 20} y="525" width={W + 40} height="14" fill="#7a5638" />
        <g style={{ cursor: 'pointer' }} onClick={onEaselClick} data-testid="static-easel">
          <rect x={cx - W / 2 - 4} y={top - 4} width={W + 8} height={H + 8} fill="#d8cfbe" />
          {preview ? <image href={preview} x={cx - W / 2} y={top} width={W} height={H} preserveAspectRatio="xMidYMid slice" /> : <rect x={cx - W / 2} y={top} width={W} height={H} fill="#f2ede2" />}
        </g>
        <g transform="translate(760 560)">
          <rect x="-110" y="0" width="230" height="12" fill="#6b4a30" /><rect x="-100" y="12" width="8" height="200" fill="#5c3f28" /><rect x="100" y="12" width="8" height="200" fill="#5c3f28" />
          <ellipse cx="-30" cy="-4" rx="70" ry="14" fill="#b98d5f" />
          {['#b5523b', '#e9c46a', '#2f5d8a', '#3b4a2a', '#f5f1e8'].map((c, i) => <circle key={c} cx={-80 + i * 22} cy={-8} r="6" fill={c} />)}
          <rect x="60" y="-60" width="34" height="60" rx="4" fill="#8c8577" />
          {[0, 1, 2].map((i) => <line key={i} x1={70 + i * 7} y1="-58" x2={60 + i * 14} y2="-130" stroke="#5c3b23" strokeWidth="4" />)}
        </g>
      </svg>
    </div>
  );
}
