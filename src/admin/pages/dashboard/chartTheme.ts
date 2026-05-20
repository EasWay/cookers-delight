import type { CSSProperties } from 'react';

export const CHART_COLORS = {
  primary: '#EC4824',
  green:   '#22c55e',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  amber:   '#eab308',
  muted:   'rgba(255,255,255,0.25)',
};

export const gridProps = {
  stroke:          'rgba(255,255,255,0.06)',
  strokeDasharray: '3 3',
};

export const axisProps = {
  tick:     { fill: 'rgba(255,255,255,0.35)', fontSize: 11 },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
  tickLine: false as const,
};

export const tooltipStyle: CSSProperties = {
  backgroundColor: '#1a1a1a',
  border:          '1px solid rgba(255,255,255,0.1)',
  borderRadius:    12,
  color:           'rgba(255,255,255,0.8)',
  fontSize:        12,
};
