'use client';

import { useMemo } from 'react';
import { useFloodStore } from '@/store/flood-store';

/**
 * FloodDepthLegend — Map overlay showing the continuous flood depth
 * color gradient and current max depth across all visible wards.
 */

interface DepthStop {
  depth: string;
  label: string;
  color: string;
}

const DEPTH_STOPS: DepthStop[] = [
  { depth: '0 m',     label: 'Dry',          color: 'rgba(255, 255, 255, 0.12)' },
  { depth: '0.1 m',   label: 'Negligible',   color: '#22D3EE' },
  { depth: '0.5 m',   label: 'Shallow',      color: '#1685FF' },
  { depth: '1.0 m',   label: 'Moderate',     color: '#4338FF' },
  { depth: '2.0 m',   label: 'Significant',  color: '#8B5CF6' },
  { depth: '3.0 m',   label: 'Severe',       color: '#8B5CF6' },
  { depth: '>3.0 m',  label: 'Extreme',      color: '#D946EF' },
];

export default function FloodDepthLegend() {
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);

  // Compute max flood depth across all wards for the summary stat
  const { maxDepth, avgDepth, affectedCount } = useMemo(() => {
    const profiles = Object.values(wardRiskProfiles);
    if (profiles.length === 0) return { maxDepth: 0, avgDepth: 0, affectedCount: 0 };

    let max = 0;
    let sum = 0;
    let count = 0;
    const seen = new Set<string>();

    for (const p of profiles) {
      // De-duplicate (same profile keyed under multiple aliases)
      if (seen.has(p.wardId)) continue;
      seen.add(p.wardId);

      const d = p.estimatedFloodDepthM ?? 0;
      if (d > max) max = d;
      if (d > 0.1) {
        sum += d;
        count++;
      }
    }

    return {
      maxDepth: max,
      avgDepth: count > 0 ? sum / count : 0,
      affectedCount: count,
    };
  }, [wardRiskProfiles]);

  // Gradient CSS for the vertical bar
  const gradientCSS = `linear-gradient(to top,
    rgba(255, 255, 255, 0.06) 0%,
    #22D3EE 15%,
    #1685FF 32%,
    #4338FF 50%,
    #8B5CF6 72%,
    #D946EF 100%
  )`;

  return (
    <div className="absolute top-6 left-6 z-30 flex flex-col gap-3 select-none pointer-events-auto">
      {/* Legend Card */}
      <div className="bg-[#0A0A0A]/85 backdrop-blur-xl border border-white/[0.08] rounded-xl px-4 py-4 shadow-2xl w-[180px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: maxDepth > 2.0 ? '#D946EF' : maxDepth > 1.0 ? '#4338FF' : maxDepth > 0.5 ? '#1685FF' : '#22D3EE',
              boxShadow: maxDepth > 0.1 ? `0 0 6px ${maxDepth > 2.0 ? '#D946EF' : '#22D3EE'}` : 'none',
            }}
          />
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-white/70">
            Water Depth (m)
          </span>
        </div>

        {/* Gradient bar + labels */}
        <div className="flex gap-3">
          {/* Vertical gradient bar */}
          <div className="relative w-3 rounded-full overflow-hidden" style={{ height: 130 }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: gradientCSS }}
            />
            {/* Glass overlay for premium feel */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.06] to-transparent" />
          </div>

          {/* Depth stop labels */}
          <div className="flex flex-col justify-between" style={{ height: 130 }}>
            {[...DEPTH_STOPS].reverse().map((stop, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: stop.color,
                    boxShadow: stop.depth !== '0 m' ? `0 0 4px ${stop.color}` : 'none',
                  }}
                />
                <span className="text-[9px] font-mono text-white/50 leading-none">
                  {stop.depth}
                </span>
                <span className="text-[8px] text-white/30 leading-none">
                  {stop.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        {maxDepth > 0.1 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[8px] font-medium uppercase tracking-wider text-white/30 mb-0.5">
                  Peak
                </div>
                <div
                  className="text-[14px] font-mono font-bold"
                  style={{
                    color: maxDepth > 2.0 ? '#D946EF' : maxDepth > 1.0 ? '#4338FF' : maxDepth > 0.5 ? '#1685FF' : '#22D3EE',
                  }}
                >
                  {maxDepth.toFixed(1)}
                  <span className="text-[9px] font-normal text-white/30 ml-0.5">m</span>
                </div>
              </div>
              <div>
                <div className="text-[8px] font-medium uppercase tracking-wider text-white/30 mb-0.5">
                  Wards
                </div>
                <div className="text-[14px] font-mono font-bold text-white/80">
                  {affectedCount}
                  <span className="text-[9px] font-normal text-white/30 ml-0.5">hit</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
