'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Bell, TrendingUp, TrendingDown, ArrowRight,
  Filter, MapPin, Clock, Shield, Zap, CloudRain, Droplets,
  ChevronDown, Search, Activity
} from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData } from '@/lib/mumbai-data';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BottomPanel = dynamic(() => import('@/components/flood-dashboard/BottomPanel'), { ssr: false });

const severityTheme: Record<number, {
  label: string;
  badge: string;
  indicator: string;
  dot: string;
  border: string;
}> = {
  3: {
    label: 'Critical',
    badge: 'bg-white text-black font-bold border-white shadow-[0_0_12px_rgba(255,255,255,0.3)]',
    indicator: 'bg-white text-black font-bold border-white shadow-[0_0_10px_rgba(255,255,255,0.25)]',
    dot: 'bg-white',
    border: 'bg-black/90 border-white/50 shadow-[0_0_24px_rgba(255,255,255,0.08)]',
  },
  2: {
    label: 'Elevated',
    badge: 'bg-white/[0.14] text-white border border-white/25',
    indicator: 'bg-white/[0.12] text-white border border-white/20',
    dot: 'bg-zinc-300',
    border: 'bg-black/90 border-white/25',
  },
  1: {
    label: 'Watch',
    badge: 'bg-white/[0.08] text-zinc-300 border border-white/15',
    indicator: 'bg-white/[0.06] text-zinc-300 border border-white/10',
    dot: 'bg-zinc-500',
    border: 'bg-black/85 border-white/10',
  },
  0: {
    label: 'Nominal',
    badge: 'bg-white/[0.04] text-zinc-400 border border-white/10',
    indicator: 'bg-white/[0.04] text-zinc-500 border border-white/5',
    dot: 'bg-zinc-700',
    border: 'bg-black/80 border-white/5',
  },
};

type FilterLevel = 'all' | 'critical' | 'elevated' | 'watch' | 'nominal';

export default function AlertsPage() {
  const { alertHistory, wardSeverities, wardRiskProfiles, activeCity, switchCity, timeIndex, selectedWardId, setSelectedWard, currentTimeData } = useFloodStore();
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWard, setExpandedWard] = useState<string | null>(null);

  const td = currentTimeData() || timeSeriesData[0];
  const cityLabel = activeCity === 'navi_mumbai' ? 'Navi Mumbai' : activeCity.charAt(0).toUpperCase() + activeCity.slice(1);
  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);

  // Compute ward alert status for active city
  const wardAlerts = useMemo(() => {
    return cityWards
      .map(w => {
        const sev = wardSeverities[w.id] ?? 0;
        const profile = wardRiskProfiles[w.id];
        return { ward: w, severity: sev, profile };
      })
      .filter(wa => {
        if (filterLevel === 'critical') return wa.severity >= 3;
        if (filterLevel === 'elevated') return wa.severity === 2;
        if (filterLevel === 'watch') return wa.severity === 1;
        if (filterLevel === 'nominal') return wa.severity === 0;
        return true;
      })
      .filter(wa => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return wa.ward.name.toLowerCase().includes(q) || wa.ward.code.toLowerCase().includes(q);
      })
      .sort((a, b) => b.severity - a.severity);
  }, [cityWards, wardSeverities, wardRiskProfiles, filterLevel, searchQuery]);

  const criticalCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) >= 3).length;
  const elevatedCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) === 2).length;
  const watchCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) === 1).length;
  const nominalCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) === 0).length;
  const totalAlerts = alertHistory.length;

  const overallThreat = useMemo(() => {
    if (criticalCount > 0) {
      return {
        status: 'CRITICAL INUNDATION DETECTED',
        tag: 'CRITICAL',
        badgeClass: 'bg-white text-black font-bold font-mono',
        dotColor: 'bg-white',
        pulse: true,
        summary: `${criticalCount} ${criticalCount === 1 ? 'ward exceeds' : 'wards exceed'} emergency flash-flood limits. Response protocols active.`,
      };
    }
    if (elevatedCount > 0) {
      return {
        status: 'ELEVATED RUNOFF WATCH',
        tag: 'ELEVATED',
        badgeClass: 'bg-white/15 text-white border border-white/20 font-mono',
        dotColor: 'bg-zinc-300',
        pulse: false,
        summary: `${elevatedCount} of ${cityWards.length} wards approaching critical precipitation thresholds. ${watchCount} in advisory watch.`,
      };
    }
    if (watchCount > 0) {
      return {
        status: 'HYDROLOGIC WATCH ACTIVE',
        tag: 'WATCH',
        badgeClass: 'bg-white/10 text-zinc-300 border border-white/15 font-mono',
        dotColor: 'bg-zinc-400',
        pulse: false,
        summary: `${watchCount} of ${cityWards.length} wards under localized runoff advisory. Drainage networks flowing nominally.`,
      };
    }
    return {
      status: 'ALL ZONES NOMINAL',
      tag: 'ALL CLEAR',
      badgeClass: 'bg-white/5 text-zinc-400 border border-white/10 font-mono',
      dotColor: 'bg-zinc-600',
      pulse: false,
      summary: `All ${cityWards.length} administrative wards operating within safe hydrologic thresholds.`,
    };
  }, [criticalCount, elevatedCount, watchCount, cityWards.length]);

  const filteredHistory = useMemo(() => {
    return alertHistory
      .filter(a => {
        if (filterLevel === 'critical') return a.newSeverity >= 3;
        if (filterLevel === 'elevated') return a.newSeverity === 2;
        if (filterLevel === 'watch') return a.newSeverity === 1;
        if (filterLevel === 'nominal') return a.newSeverity === 0;
        return true;
      })
      .slice(0, 50);
  }, [alertHistory, filterLevel]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-5 max-w-[1440px]">
        {/* Page Header with City Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-zinc-400 uppercase">MONITORING ACTIVE</span>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">Alert Center</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Real-time flood risk monitoring across {cityWards.length} wards in {cityLabel}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* 3-City Switcher Bar */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              {(['mumbai', 'pune', 'navi_mumbai'] as const).map(city => (
                <button
                  key={city}
                  onClick={() => switchCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activeCity === city
                      ? 'bg-white/15 text-white font-semibold shadow-inner'
                      : 'text-[#8B919E] hover:text-white'
                  }`}
                >
                  {city === 'navi_mumbai' ? 'Navi Mumbai' : city.charAt(0).toUpperCase() + city.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <Activity size={13} className="text-white animate-pulse" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <Clock size={13} className="text-white" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">
                Day {timeIndex + 1} — {td.date ?? '2024-07-09'}
              </span>
            </div>
          </div>
        </div>

        {/* Embedded Interactive Simulation Timeline Controller */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/70 p-1 shadow-lg">
          <BottomPanel mode="embedded" />
        </div>

        {/* Unified Mission Status & Threat Spectrum Ribbon */}
        <div className="rounded-2xl bg-black/85 border border-white/10 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-4 border-b border-white/5">
            {/* Left: Overall Threat Assessment */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-inner">
                <Shield size={19} className="text-white" />
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${overallThreat.dotColor} ring-4 ring-black/85 ${
                    overallThreat.pulse ? 'animate-ping' : ''
                  }`}
                />
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${overallThreat.dotColor}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-[16px] font-bold font-clash text-white tracking-wide">
                    {overallThreat.status}
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full ${overallThreat.badgeClass}`}
                  >
                    {overallThreat.tag}
                  </span>
                </div>
                <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5 max-w-xl">
                  {overallThreat.summary}
                </p>
              </div>
            </div>

            {/* Right: Integrated Telemetry & Cloud Metrics */}
            <div className="flex items-center gap-3 text-left sm:text-right flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[9px] uppercase tracking-[0.14em] font-mono font-semibold text-[#8B919E] block">Telemetry</span>
                <span className="text-[13px] font-bold font-clash text-white">{totalAlerts} Logged</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[9px] uppercase tracking-[0.14em] font-mono font-semibold text-[#8B919E] block">Coverage</span>
                <span className="text-[13px] font-bold font-clash text-white">{cityWards.length} Wards</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[9px] uppercase tracking-[0.14em] font-mono font-semibold text-[#8B919E] block">AWS Sync</span>
                <span className="text-[13px] font-bold font-clash text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live Stream
                </span>
              </div>
            </div>
          </div>

          {/* City-Wide Proportional Severity Distribution Bar */}
          <div className="pt-4">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8B919E] mb-2.5 flex-wrap gap-2">
              <span className="text-[9px] uppercase tracking-[0.14em] font-semibold text-[#8B919E]">
                Citywide Severity Distribution ({cityWards.length} Wards)
              </span>
              <div className="flex items-center gap-4 text-[11px] flex-wrap">
                {criticalCount > 0 && (
                  <button
                    onClick={() => setFilterLevel('critical')}
                    className="flex items-center gap-1.5 text-white font-semibold hover:text-white transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                    <span>{criticalCount} Critical</span>
                  </button>
                )}
                <button
                  onClick={() => setFilterLevel('elevated')}
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-300" />
                  <span>{elevatedCount} Elevated</span>
                </button>
                <button
                  onClick={() => setFilterLevel('watch')}
                  className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span>{watchCount} Watch</span>
                </button>
                <button
                  onClick={() => setFilterLevel('nominal')}
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span>{nominalCount} Nominal</span>
                </button>
              </div>
            </div>

            {/* Stacked Proportional Spectrum Bar (Monochrome High-Contrast Theme) */}
            <div className="h-2 w-full rounded-full bg-white/10 flex overflow-hidden gap-[1px]">
              {criticalCount > 0 && (
                <div
                  style={{ width: `${(criticalCount / cityWards.length) * 100}%` }}
                  className="h-full bg-white cursor-pointer transition-all duration-500 hover:brightness-110 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  title={`${criticalCount} Critical Wards`}
                  onClick={() => setFilterLevel('critical')}
                />
              )}
              {elevatedCount > 0 && (
                <div
                  style={{ width: `${(elevatedCount / cityWards.length) * 100}%` }}
                  className="h-full bg-zinc-300 cursor-pointer transition-all duration-500 hover:bg-zinc-200"
                  title={`${elevatedCount} Elevated Wards`}
                  onClick={() => setFilterLevel('elevated')}
                />
              )}
              {watchCount > 0 && (
                <div
                  style={{ width: `${(watchCount / cityWards.length) * 100}%` }}
                  className="h-full bg-zinc-500 cursor-pointer transition-all duration-500 hover:bg-zinc-400"
                  title={`${watchCount} Watch Wards`}
                  onClick={() => setFilterLevel('watch')}
                />
              )}
              {nominalCount > 0 && (
                <div
                  style={{ width: `${(nominalCount / cityWards.length) * 100}%` }}
                  className="h-full bg-zinc-800 cursor-pointer transition-all duration-500 hover:bg-zinc-700"
                  title={`${nominalCount} Nominal Wards`}
                  onClick={() => setFilterLevel('nominal')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Unified Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/80 border border-white/10 shadow-sm">
            {[
              { id: 'all' as FilterLevel, label: 'All Wards', count: cityWards.length },
              { id: 'critical' as FilterLevel, label: 'Critical', count: criticalCount },
              { id: 'elevated' as FilterLevel, label: 'Elevated', count: elevatedCount },
              { id: 'watch' as FilterLevel, label: 'Watch', count: watchCount },
              { id: 'nominal' as FilterLevel, label: 'Nominal', count: nominalCount },
            ].map((tab) => {
              const active = filterLevel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterLevel(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    active
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-[#8B919E] hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      active ? 'bg-black/15 text-black font-bold' : 'bg-white/10 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B919E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search wards by name or code..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/80 border border-white/10 text-[12px] text-white placeholder-[#8B919E] outline-none focus:border-white/30 transition-colors font-satoshi shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8B919E] hover:text-white px-1"
              >
                ESC
              </button>
            )}
          </div>
        </div>

        {/* Main Content: Ward Status Grid + Event Timeline */}
        <div className="grid grid-cols-3 gap-4">
          {/* Ward Status Grid (2 cols) */}
          <div className="col-span-2 space-y-2">
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#8B919E] uppercase px-1">
              Ward Risk Status ({wardAlerts.length} wards)
            </h3>
            <div className="space-y-1.5">
              <AnimatePresence>
                {wardAlerts.map((wa, i) => {
                  const sevTheme = severityTheme[wa.severity] || severityTheme[0];
                  const isExpanded = expandedWard === wa.ward.id;
                  const profile = wa.profile;

                  return (
                    <motion.div
                      key={wa.ward.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className={`rounded-xl border overflow-hidden transition-all ${sevTheme.border}`}
                    >
                      <button
                        onClick={() => setExpandedWard(isExpanded ? null : wa.ward.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors"
                      >
                        {/* Severity Indicator */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${sevTheme.indicator}`}
                        >
                          <span className="text-[11px] font-mono">
                            {wa.severity}
                          </span>
                        </div>

                        {/* Ward Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-white truncate font-satoshi">{wa.ward.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-medium border ${sevTheme.badge}`}>
                              {sevTheme.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-[#525866] font-mono">
                              Zone: {wa.ward.wardType}
                            </span>
                            <span className="text-[10px] text-[#525866] font-mono">
                              Elev: {wa.ward.elevation.toFixed(1)}m
                            </span>
                            <span className="text-[10px] text-[#525866] font-mono">
                              TWI: {wa.ward.twi.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Metrics */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] text-[#8B919E] font-mono flex items-center gap-1">
                              <CloudRain size={10} /> {td.rainfall_3day_sum}mm
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-[#8B919E] font-mono flex items-center gap-1">
                              <Droplets size={10} /> {(td.soil_moisture * 100).toFixed(0)}%
                            </p>
                          </div>
                          <ChevronDown
                            size={14}
                            className={`text-[#525866] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      <AnimatePresence>
                        {isExpanded && profile && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-3 border-t border-white/5 space-y-3">
                              {/* Hazard Factors */}
                              {profile.activeHazards.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#525866] uppercase tracking-wider font-mono mb-1.5">Active Hazards</p>
                                  <div className="space-y-1.5">
                                    {profile.activeHazards.map((h, hi) => (
                                      <div key={hi} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-1.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-[11px] font-medium text-white font-satoshi">
                                            {h.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            <span className="text-[#525866] ml-2">({(h.contributionScore * 100).toFixed(0)}%)</span>
                                          </p>
                                          <p className="text-[10px] text-[#8B919E] mt-0.5 font-satoshi">{h.explanation}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Historical Match */}
                              {profile.similarHistoricalEvent && (
                                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
                                  <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-mono mb-1">Historical Match</p>
                                  <p className="text-[11px] text-[#C1C5CD] font-satoshi">
                                    <strong className="text-white">{profile.similarHistoricalEvent.date}</strong>: {profile.similarHistoricalEvent.outcome}
                                  </p>
                                  <p className="text-[10px] text-[#8B919E] mt-0.5 font-satoshi">{profile.similarHistoricalEvent.similarityNote}</p>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Link
                                  href="/map"
                                  onClick={() => setSelectedWard(wa.ward.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-medium text-white hover:bg-white/20 transition-colors"
                                >
                                  <MapPin size={10} /> View on Map
                                </Link>
                                <span className="text-[10px] text-[#525866] font-mono">
                                  Trend: {profile.rainfallTrend === 'rising' ? '↑ Rising' : profile.rainfallTrend === 'falling' ? '↓ Falling' : '→ Steady'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {wardAlerts.length === 0 && (
                <div className="py-12 text-center rounded-2xl bg-black/80 border border-white/10">
                  <Shield size={28} className="text-[#64748B] mx-auto mb-3" />
                  <p className="text-[13px] text-[#8B919E] font-satoshi">No wards match the current filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Event Timeline (1 col) */}
          <div className="col-span-1">
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#8B919E] uppercase px-1 mb-2">
              Event Timeline ({filteredHistory.length})
            </h3>
            <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden">
              <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={24} className="text-[#64748B] mx-auto mb-2" />
                    <p className="text-[11px] text-[#8B919E] font-satoshi">No events recorded.</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5 font-satoshi">Scrub simulation timeline above to advance events</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/10" />

                    {filteredHistory.map((alert, i) => {
                      const isEscalation = alert.newSeverity > alert.oldSeverity;
                      const isCritical = alert.newSeverity === 3;
                      const sevTheme = severityTheme[alert.newSeverity] || severityTheme[0];
                      const oldTheme = severityTheme[alert.oldSeverity] || severityTheme[0];

                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.5) }}
                          className="relative flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Timeline dot */}
                          <div className="relative z-10 mt-1">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${sevTheme.dot} ${
                                isCritical ? 'shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#C1C5CD] truncate font-satoshi">{alert.wardName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isEscalation ? (
                                <TrendingUp size={10} className={isCritical ? 'text-white' : 'text-zinc-400'} />
                              ) : (
                                <TrendingDown size={10} className="text-zinc-400" />
                              )}
                              <span className="text-[10px] font-mono text-zinc-500">
                                {oldTheme.label}
                              </span>
                              <ArrowRight size={9} className="text-zinc-500" />
                              <span className={`text-[10px] font-mono ${isCritical ? 'text-white font-bold' : 'text-zinc-200'}`}>
                                {sevTheme.label}
                              </span>
                            </div>
                          </div>

                          <span className="text-[9px] text-[#525866] font-mono flex-shrink-0 mt-0.5">
                            {alert.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
