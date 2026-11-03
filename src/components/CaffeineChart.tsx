import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SAFE_MG, type Point } from '../lib/caffeine'
import { clock, hourLabel } from '../lib/time'

type Props = { data: Point[]; from: number; to: number; now: number; bedtime: number }

const HOUR = 3_600_000

export function CaffeineChart({ data, from, to, now, bedtime }: Props) {
  // Every 6 h, so "12 PM"-style labels fit on a phone.
  const ticks = Array.from({ length: 5 }, (_, i) => from + i * 6 * HOUR)
  const maxMg = Math.max(120, ...data.map((p) => p.mg))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="time"
          type="number"
          domain={[from, to]}
          ticks={ticks}
          tickFormatter={(t: number) => hourLabel(t)}
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, Math.ceil(maxMg / 50) * 50]}
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v) => [`${Math.round(Number(v))} mg`, 'In body']}
          labelFormatter={(t) => clock(Number(t))}
          contentStyle={{ borderRadius: 12, border: '1px solid var(--grid)', fontSize: 12 }}
        />
        <ReferenceLine
          y={SAFE_MG}
          stroke="var(--good)"
          strokeDasharray="4 4"
          label={{ value: 'sleep-safe', position: 'insideTopLeft', fontSize: 10, fill: 'var(--good)' }}
        />
        <ReferenceLine
          x={now}
          stroke="var(--ink)"
          strokeOpacity={0.5}
          label={{ value: 'now', position: 'top', fontSize: 10, fill: 'var(--muted)' }}
        />
        <ReferenceLine
          x={bedtime}
          stroke="var(--accent)"
          label={{ value: 'bed', position: 'top', fontSize: 10, fill: 'var(--accent)' }}
        />
        <Area
          type="monotone"
          dataKey="mg"
          stroke="var(--accent)"
          strokeWidth={2.5}
          fill="url(#fill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
