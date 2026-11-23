"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";

import {
  PLOT_MAX,
  PLOT_MIN,
  formatCoord,
  formatDistance,
  snapToStep,
  type PlotPoint,
} from "@/components/level/vector-math";

const SCALE = 10;
const VIEW_MIN = -70;
const VIEW_SIZE = 140;
const TICKS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] as const;

function sx(x: number): number {
  return x * SCALE;
}

function sy(y: number): number {
  return -y * SCALE;
}

function clientToPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): PlotPoint | null {
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const vx = VIEW_MIN + ((clientX - rect.left) / rect.width) * VIEW_SIZE;
  const vy = VIEW_MIN + ((clientY - rect.top) / rect.height) * VIEW_SIZE;
  return {
    x: snapToStep(vx / SCALE),
    y: snapToStep(-vy / SCALE),
  };
}

type VectorPlotProps = {
  target: PlotPoint;
  value: PlotPoint;
  onChange: (next: PlotPoint) => void;
  revealed: boolean;
  disabled: boolean;
  distance: number;
};

export function VectorPlot({
  target,
  value,
  onChange,
  revealed,
  disabled,
  distance,
}: VectorPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const markerId = useId().replace(/:/g, "");
  const summary = `Vector plot from -5 to 5. Target [${formatCoord(target.x)}, ${formatCoord(target.y)}]. Your arrow is at [${formatCoord(value.x)}, ${formatCoord(value.y)}]. Distance ${formatDistance(distance)}.`;

  function moveBy(dx: number, dy: number) {
    if (disabled) return;
    onChange({
      x: snapToStep(value.x + dx),
      y: snapToStep(value.y + dy),
    });
  }

  function onKeyDown(event: KeyboardEvent<SVGCircleElement>) {
    const step = 0.5;
    if (event.key === "ArrowRight") moveBy(step, 0);
    else if (event.key === "ArrowLeft") moveBy(-step, 0);
    else if (event.key === "ArrowUp") moveBy(0, step);
    else if (event.key === "ArrowDown") moveBy(0, -step);
    else return;
    event.preventDefault();
  }

  function onPointerDown(event: PointerEvent<SVGCircleElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGCircleElement>) {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    const svg = svgRef.current;
    if (!svg) return;
    const next = clientToPoint(svg, event.clientX, event.clientY);
    if (next) onChange(next);
  }

  const labelOnLeft = target.x > 2;
  const midX = (sx(value.x) + sx(target.x)) / 2;
  const midY = (sy(value.y) + sy(target.y)) / 2;

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={summary}
      viewBox={`${VIEW_MIN} ${VIEW_MIN} ${VIEW_SIZE} ${VIEW_SIZE}`}
      className="aspect-square h-auto w-full touch-none lg:max-h-[560px] lg:max-w-[560px]"
    >
      <rect x={VIEW_MIN} y={VIEW_MIN} width={VIEW_SIZE} height={VIEW_SIZE} className="fill-zinc-950" />
      {TICKS.map((tick) => (
        <g key={tick}>
          <line
            x1={sx(tick)}
            y1={sy(PLOT_MIN)}
            x2={sx(tick)}
            y2={sy(PLOT_MAX)}
            className={tick === 0 ? "stroke-zinc-500" : "stroke-zinc-800"}
            strokeWidth={tick === 0 ? 0.45 : 0.25}
          />
          <line
            x1={sx(PLOT_MIN)}
            y1={sy(tick)}
            x2={sx(PLOT_MAX)}
            y2={sy(tick)}
            className={tick === 0 ? "stroke-zinc-500" : "stroke-zinc-800"}
            strokeWidth={tick === 0 ? 0.45 : 0.25}
          />
        </g>
      ))}
      <text x={sx(PLOT_MAX) + 2} y={sy(0) + 1.2} className="fill-zinc-400 font-mono" fontSize="3.4">
        x
      </text>
      <text x={sx(0) + 1.4} y={sy(PLOT_MAX) - 2} className="fill-zinc-400 font-mono" fontSize="3.4">
        y
      </text>
      <defs>
        <marker
          id={markerId}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" className="fill-indigo-400" />
        </marker>
      </defs>
      {revealed ? (
        <g>
          <line
            x1={sx(value.x)}
            y1={sy(value.y)}
            x2={sx(target.x)}
            y2={sy(target.y)}
            className="stroke-zinc-200"
            strokeWidth="0.45"
            strokeDasharray="1.4 1"
          />
          <text
            x={midX}
            y={midY - 2}
            textAnchor="middle"
            className="fill-zinc-100 font-mono"
            fontSize="3"
          >
            {formatDistance(distance)}
          </text>
        </g>
      ) : null}
      <line
        x1={0}
        y1={0}
        x2={sx(value.x)}
        y2={sy(value.y)}
        className="stroke-indigo-400"
        strokeWidth="1.15"
        markerEnd={`url(#${markerId})`}
      />
      <circle cx={sx(target.x)} cy={sy(target.y)} r="1.7" className="fill-emerald-400" />
      <text
        x={sx(target.x) + (labelOnLeft ? -2.4 : 2.4)}
        y={sy(target.y) - 2.4}
        textAnchor={labelOnLeft ? "end" : "start"}
        className="fill-emerald-300 font-mono"
        fontSize="3.1"
      >
        {`target [${formatCoord(target.x)}, ${formatCoord(target.y)}]`}
      </text>
      <circle
        cx={sx(value.x)}
        cy={sy(value.y)}
        r="2.1"
        className="pointer-events-none fill-indigo-400"
      />
      <circle
        cx={sx(value.x)}
        cy={sy(value.y)}
        r="6"
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label="Arrow head"
        aria-valuemin={PLOT_MIN}
        aria-valuemax={PLOT_MAX}
        aria-valuenow={value.x}
        aria-valuetext={`${formatCoord(value.x)}, ${formatCoord(value.y)}`}
        aria-disabled={disabled}
        className="fill-transparent stroke-transparent focus:outline-none focus-visible:stroke-white"
        strokeWidth="0.7"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      />
    </svg>
  );
}
