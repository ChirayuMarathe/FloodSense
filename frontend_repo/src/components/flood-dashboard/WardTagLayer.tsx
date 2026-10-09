'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { wardProfileKey, type HazardType, type WardRiskProfile } from '@/lib/risk/WardRiskProfile';

const SEVERITY: Record<number, { color: string; label: string; bgBadge: string; textBadge: string }> = {
  0: { color: '#71717A', label: 'NOMINAL', bgBadge: 'bg-white/[0.04]', textBadge: 'text-zinc-400' },
  1: { color: '#A1A1AA', label: 'WATCH', bgBadge: 'bg-white/[0.10]', textBadge: 'text-zinc-200' },
  2: { color: '#E4E4E7', label: 'ELEVATED', bgBadge: 'bg-white/[0.20]', textBadge: 'text-white' },
  3: { color: '#FFFFFF', label: 'CRITICAL', bgBadge: 'bg-white', textBadge: 'text-black font-bold' },
};

const HAZARD_LABEL: Record<HazardType, string> = {
  rainfall_overflow: 'Rainfall overflow',
  topographic_pooling: 'Pooling basin',
  tidal_backflow: 'Tidal backflow',
  river_overflow: 'River overflow',
  compound: 'Compound risk',
};

// Distance limits for tag visibility
const MAX_TAG_DISTANCE_M = 35_000;
// Limit default visible tags to avoid cluster overlap
const MAX_VISIBLE_TAGS = 4;

interface Props {
  viewer: Cesium.Viewer | null;
  anchors: { wardId: string; position: Cesium.Cartesian3 }[];
}

export default function WardTagLayer({ viewer, anchors }: Props) {
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const activeCity = useFloodStore((s) => s.activeCity);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [hoveredWardId, setHoveredWardId] = useState<string | null>(null);

  // Position tags cleanly atop the 3D extruded rooftop
  const tags = useMemo(() => {
    const scratchNormal = new Cesium.Cartesian3();
    const scratchOffset = new Cesium.Cartesian3();

    const matching = anchors
      .map((a) => ({ ...a, profile: wardRiskProfiles[wardProfileKey(a.wardId)] as WardRiskProfile | undefined }))
      .filter((t): t is typeof t & { profile: WardRiskProfile } =>
        !!t.profile && t.profile.city === activeCity && t.profile.overallSeverity >= 1);

    // Prioritize selected ward first, then highest severity
    matching.sort((a, b) => {
      if (a.wardId === selectedWardId) return -1;
      if (b.wardId === selectedWardId) return 1;
      return b.profile.overallSeverity - a.profile.overallSeverity;
    });

    return matching
      .slice(0, MAX_VISIBLE_TAGS)
      .map((t) => {
        const sev = t.profile.overallSeverity;
        const rainBonus = Math.min(t.profile.rainfall3DaySum ?? 0, 300);
        // Anchor exactly above the 3D extruded prism rooftop
        const roofElevation =
          sev === 3 ? 380 + rainBonus * 0.45 + 50 : // ~490m
          sev === 2 ? 220 + rainBonus * 0.25 + 40 : // ~310m
          sev === 1 ? 90 + rainBonus * 0.15 + 30 :  // ~140m
          40;

        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(t.position, scratchNormal);
        Cesium.Cartesian3.multiplyByScalar(scratchNormal, roofElevation, scratchOffset);
        const position = Cesium.Cartesian3.add(t.position, scratchOffset, new Cesium.Cartesian3());
        return { ...t, position };
      });
  }, [anchors, wardRiskProfiles, activeCity, selectedWardId]);

  useEffect(() => {
    if (!viewer || tags.length === 0) return;

    const scratch = new Cesium.Cartesian2();
    const camPos = new Cesium.Cartesian3();
    const normal = new Cesium.Cartesian3();
    const toCamera = new Cesium.Cartesian3();

    const update = () => {
      if (viewer.isDestroyed()) return;
      Cesium.Cartesian3.clone(viewer.camera.positionWC, camPos);

      for (const tag of tags) {
        const el = elementsRef.current.get(tag.wardId);
        if (!el) continue;

        const distance = Cesium.Cartesian3.distance(camPos, tag.position);
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(tag.position, normal);
        Cesium.Cartesian3.subtract(camPos, tag.position, toCamera);
        const visible =
          distance < MAX_TAG_DISTANCE_M && Cesium.Cartesian3.dot(normal, toCamera) > 0;

        if (!visible) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }

        const win = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene, tag.position, scratch
        );
        if (!win) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          continue;
        }

        const fade = Math.min(1, (MAX_TAG_DISTANCE_M - distance) / (MAX_TAG_DISTANCE_M * 0.25));
        el.style.transform = `translate3d(${Math.round(win.x)}px, ${Math.round(win.y)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = String(fade);
        el.style.pointerEvents = 'auto';
      }
    };

    const remove = viewer.scene.preRender.addEventListener(update);
    update();
    return () => remove();
  }, [viewer, tags]);

  if (!viewer) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      {tags.map(({ wardId, profile }) => {
        const sev = SEVERITY[profile.overallSeverity] || SEVERITY[0];
        const isCritical = profile.overallSeverity === 3;
        const isSelected = selectedWardId === wardId;
        const isHovered = hoveredWardId === wardId;
        const isExpanded = isSelected || isHovered;
        const urgent =
          profile.estimatedTimeToThresholdHours !== null &&
          profile.estimatedTimeToThresholdHours < 6;

        return (
          <div
            key={wardId}
            ref={(el) => {
              if (el) elementsRef.current.set(wardId, el);
              else elementsRef.current.delete(wardId);
            }}
            onClick={() => setSelectedWard(wardId)}
            onMouseEnter={() => setHoveredWardId(wardId)}
            onMouseLeave={() => setHoveredWardId(null)}
            className="absolute top-0 left-0 will-change-transform cursor-pointer select-none group"
            style={{ opacity: 0, transition: 'opacity 180ms ease-out' }}
          >
            {isExpanded ? (
              /* Expanded Rich Tactical Card */
              <div
                className={`rounded-xl border bg-black/95 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] px-3.5 py-2.5 min-w-[150px] transition-all ${
                  isCritical ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCritical ? 'bg-white shadow-[0_0_8px_#ffffff] animate-ping' : 'bg-zinc-300'
                      }`}
                    />
                    <span className="text-[12px] font-bold text-white leading-none truncate font-satoshi">
                      {profile.wardName}
                    </span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase ${sev.bgBadge} ${sev.textBadge}`}>
                    {sev.label}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-[15px] font-bold font-mono tabular-nums leading-none ${isCritical ? 'text-white' : 'text-zinc-200'}`}>
                      {profile.rainfall3DaySum.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">mm/3d</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-satoshi truncate text-right">
                    {HAZARD_LABEL[profile.primaryHazard]}
                  </div>
                </div>

                {urgent && (
                  <div className="mt-2 pt-1.5 border-t border-white/10 text-[9px] font-mono text-zinc-300 flex items-center justify-between">
                    <span className="text-zinc-500">Threshold:</span>
                    <span className="text-white font-semibold">
                      {profile.estimatedTimeToThresholdHours! < 1
                        ? '<1h surge'
                        : `~${profile.estimatedTimeToThresholdHours!.toFixed(0)}h`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Sleek, Non-Overlapping Compact Tactical Pill */
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/90 backdrop-blur-md border shadow-lg transition-transform group-hover:scale-105 ${
                  isCritical ? 'border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.2)]' : 'border-white/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCritical ? 'bg-white shadow-[0_0_6px_#ffffff] animate-pulse' : 'bg-zinc-400'
                  }`}
                />
                <span className="text-[11px] font-semibold text-white font-satoshi whitespace-nowrap">
                  {profile.wardName}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                  {profile.rainfall3DaySum.toFixed(0)}mm
                </span>
                <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.2 rounded-full ${sev.bgBadge} ${sev.textBadge}`}>
                  {sev.label}
                </span>
              </div>
            )}

            {/* Glowing 3D Leader Line connecting tag to the extruded rooftop */}
            <div
              className="mx-auto w-px"
              style={{
                height: isExpanded ? 16 : 10,
                background: isCritical
                  ? 'linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)'
                  : 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
