const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 700;

const CLUSTER = [
  { label: "king", x: 430, y: 270 },
  { label: "queen", x: 560, y: 250 },
  { label: "prince", x: 500, y: 340 },
  { label: "royal", x: 390, y: 350 },
  { label: "crown", x: 620, y: 360 },
] as const;

type FieldPoint = {
  x: number;
  y: number;
  r: number;
};

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fieldPoints(): FieldPoint[] {
  const rand = mulberry32(0xc105e);
  const points: FieldPoint[] = [];
  let guard = 0;

  while (points.length < 80 && guard < 1000) {
    guard += 1;
    const x = 24 + rand() * (VIEW_WIDTH - 48);
    const y = 24 + rand() * (VIEW_HEIGHT - 48);
    const inCluster = x > 340 && x < 700 && y > 200 && y < 430;
    if (inCluster) {
      continue;
    }
    points.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      r: Math.round((1.2 + rand() * 1.5) * 10) / 10,
    });
  }

  return points;
}

const POINTS = fieldPoints();

export function WordField() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="cluster-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {POINTS.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r={point.r}
          className="fill-zinc-700"
          opacity={0.45}
        />
      ))}
      {CLUSTER.map((point) => (
        <g key={point.label}>
          <circle
            cx={point.x}
            cy={point.y}
            r="11"
            className="fill-indigo-500"
            opacity={0.55}
            filter="url(#cluster-glow)"
          />
          <circle
            cx={point.x}
            cy={point.y}
            r="3.5"
            className="fill-indigo-300"
          />
          <text
            x={point.x}
            y={point.y - 16}
            textAnchor="middle"
            fontSize="13"
            className="fill-indigo-200 font-mono"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
