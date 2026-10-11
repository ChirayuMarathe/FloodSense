'use client';

import { 
  Building2, AlertTriangle, CloudRain, Droplets, ArrowUpRight, Clock, Map, 
  FileText, Sparkles, CheckCircle2, Compass, Shield, RefreshCw, Radio, Zap, Calendar 
} from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData } from '@/lib/mumbai-data';
import { 
  getAnnualMonthlyBreakdown, 
  MONTH_NAMES, 
  AVAILABLE_YEARS,
  NOTABLE_HISTORICAL_EVENTS 
} from '@/lib/climate-service';
import { 
  fetchAwsDashboardSummary, 
  fetchAwsZones, 
  fetchAwsActiveIncidents, 
  type AwsZoneRecord, 
  type EmergencyIncident 
} from '@/lib/aws/floodsense-aws';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState, useEffect, useCallback } from 'react';

const StatCard = dynamic(() => import('@/components/flood-dashboard/StatCard'), { ssr: false });
const SeverityChart = dynamic(() => import('@/components/flood-dashboard/SeverityChart'), { ssr: false });
const RainfallChart = dynamic(() => import('@/components/flood-dashboard/RainfallChart'), { ssr: false });
const WardTable = dynamic(() => import('@/components/flood-dashboard/WardTable'), { ssr: false });
const AlertsFeed = dynamic(() => import('@/components/flood-dashboard/AlertsFeed'), { ssr: false });
const BottomPanel = dynamic(() => import('@/components/flood-dashboard/BottomPanel'), { ssr: false });

export default function DashboardPage() {
  const { 
    wardSeverities, 
    currentTimeData, 
    timeIndex, 
    riskDataLoaded, 
    initRiskData,
    selectedYear,
    selectedMonth,
    setYear,
    setMonth,
  } = useFloodStore();
  const td = currentTimeData();

  // 12-Month Annual Breakdown from CSV climate dataset
  const monthlyBreakdown = useMemo(() => getAnnualMonthlyBreakdown(selectedYear), [selectedYear]);

  // AWS Live Cloud Telemetry state
  const [awsSummary, setAwsSummary] = useState<any>(null);
  const [awsZones, setAwsZones] = useState<AwsZoneRecord[]>([]);
  const [awsIncidents, setAwsIncidents] = useState<EmergencyIncident[]>([]);
  const [isAwsLoading, setIsAwsLoading] = useState(false);
  const [awsLatency, setAwsLatency] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize CSV dataset pipeline if not already loaded
  useEffect(() => {
    if (!riskDataLoaded) {
      initRiskData();
    }
  }, [riskDataLoaded, initRiskData]);

  // Fetch live AWS API Gateway & DynamoDB telemetry
  const loadAwsTelemetry = useCallback(async () => {
    setIsAwsLoading(true);
    const start = performance.now();
    try {
      const [summary, zones, incidents] = await Promise.all([
        fetchAwsDashboardSummary(),
        fetchAwsZones(),
        fetchAwsActiveIncidents(),
      ]);
      const elapsed = Math.round(performance.now() - start);
      setAwsLatency(elapsed);
      if (summary) setAwsSummary(summary);
      if (zones && zones.length > 0) setAwsZones(zones);
      if (incidents && incidents.length > 0) setAwsIncidents(incidents);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[Dashboard] AWS sync notice:', err);
    } finally {
      setIsAwsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAwsTelemetry();
  }, [loadAwsTelemetry]);

  const cityWards = useMemo(() => getWardsForCity('mumbai'), []);
  const cityLabel = 'Mumbai';

  const criticalCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 3).length;
  const alertCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 2).length;
  const normalCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) === 0).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-6 max-w-[1440px]">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-zinc-400 uppercase">MISSION TELEMETRY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">LIVE AWS DYNAMODB</span>
            </div>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">System Dashboard</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Monitoring {cityWards.length} administrative wards across Greater Mumbai • Live AWS Cloud Integration
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Municipal Sector Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="text-[11px] text-white font-mono font-semibold">BMC Sector: Mumbai (24 Wards)</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <Clock size={13} className="text-white" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">
                Day {timeIndex + 1} — {td?.date ?? '2024-07-09'}
              </span>
            </div>

            {/* AWS Cloud Live Status + Manual Refresh */}
            <button
              onClick={loadAwsTelemetry}
              disabled={isAwsLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-sm group cursor-pointer"
              title="Click to sync latest telemetry directly from AWS DynamoDB & API Gateway"
            >
              <RefreshCw size={12} className={`text-emerald-400 ${isAwsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
              <span className="text-[11px] font-medium text-emerald-300 font-satoshi flex items-center gap-1.5">
                <span>AWS Live</span>
                {awsLatency !== null && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-mono">
                    {awsLatency}ms
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Annual 12-Month Climate Explorer Strip */}
        <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/10 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Calendar size={13} className="text-white" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold font-clash text-white tracking-tight flex items-center gap-2">
                  <span>Monthly Climate Explorer</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white">
                    {selectedYear}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 font-mono">
                  Select any month to inspect historical rainfall peaks & soil infiltration curves
                </p>
              </div>
            </div>

            {/* Quick Period Buttons & Key Historical Year Jumps */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setMonth('monsoon')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  selectedMonth === 'monsoon'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                    : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                Monsoon Surge (Jun-Sep)
              </button>
              <button
                onClick={() => setMonth('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                  selectedMonth === 'all'
                    ? 'bg-white text-black font-bold border border-white'
                    : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                All 12 Months
              </button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              {[2024, 2019, 2017, 2005].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setYear(yr)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-white/20 text-white font-bold border border-white/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title={`Jump to year ${yr} historical records`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* 12-Month Interactive Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {monthlyBreakdown.map((m) => {
              const isSelected = selectedMonth === m.month;
              return (
                <button
                  key={m.month}
                  onClick={() => setMonth(m.month)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white/15 border-white shadow-[0_0_16px_rgba(255,255,255,0.2)] ring-1 ring-white/50'
                      : m.isMonsoon
                      ? 'bg-cyan-950/15 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-950/30'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-bold font-mono ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {m.label}
                    </span>
                    {m.isMonsoon && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22D3EE]" title="Monsoon Season" />
                    )}
                  </div>
                  <div className="mt-1">
                    <div className="text-[12px] font-mono font-bold text-white">
                      {m.peakRainfall}
                      <span className="text-[9px] font-normal text-gray-400 ml-0.5">mm</span>
                    </div>
                    <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                      Soil: {m.avgSoilMoisture}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Simulation Timeline Controller */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/70 p-1 shadow-lg">
          <BottomPanel mode="embedded" />
        </div>

        {/* Live AWS DynamoDB Hotspot Telemetry Strip */}
        {awsZones.length > 0 && (
          <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-emerald-500/20 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-bold font-clash text-white tracking-tight uppercase">
                  Amazon DynamoDB Live Sensor Zones ({awsZones.length} Hotspots)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  API Gateway: ap-south-1
                </span>
                <span className="hidden md:inline-flex text-[9px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  EventBridge 15m Cron
                </span>
                <span className="hidden md:inline-flex text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  SQS Ingestion Buffer
                </span>
                <span className="hidden lg:inline-flex text-[9px] font-mono text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Step Functions Triage
                </span>
              </div>
              <div className="flex items-center gap-3">
                {lastSyncTime && (
                  <span className="text-[10px] font-mono text-gray-400">
                    Synced: {lastSyncTime.toLocaleTimeString()}
                  </span>
                )}
                {awsIncidents.length > 0 && (
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {awsIncidents.length} Correlated Incidents
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {awsZones.map((z) => {
                const isCritical = z.current_risk >= 76;
                const isHigh = z.current_risk >= 51 && z.current_risk < 76;
                return (
                  <div
                    key={z.zone_id}
                    className={`p-3 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                        : isHigh
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-gray-400">{z.zone_id}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                      >
                        {z.severity}
                      </span>
                    </div>
                    <div className="text-[12px] font-bold text-white font-satoshi truncate mb-2" title={z.name}>
                      {z.name}
                    </div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[10px] text-gray-400 font-mono">Risk Score</span>
                      <span className={`text-[15px] font-bold font-mono ${
                        isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : 'text-white'
                      }`}>
                        {z.current_risk}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-gray-400 pt-1.5 border-t border-white/5">
                      <div>Rain: <span className="text-white font-semibold">{z.rainfall_rate_mm}mm</span></div>
                      <div>Pumps: <span className="text-white font-semibold">{z.active_pumps}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* High-End Telemetry Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Monitored Wards"
            value={cityWards.length}
            unit="zones"
            variant="info"
            trend="flat"
            trendValue={`${normalCount} Nominal`}
            subtitle={`${cityLabel} Municipal Sector`}
            progress={cityWards.length > 0 ? (normalCount / cityWards.length) * 100 : 100}
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical Risk"
            value={criticalCount}
            unit="zones"
            variant={criticalCount > 0 ? 'critical' : 'default'}
            trend={criticalCount > 0 ? 'up' : 'flat'}
            trendValue={criticalCount > 0 ? `${criticalCount} Severe` : 'Nominal'}
            subtitle={alertCount > 0 ? `${alertCount} wards on elevated watch` : 'No immediate flooding detected'}
            progress={criticalCount > 0 ? Math.min(100, criticalCount * 25) : 0}
          />
          <StatCard
            icon={CloudRain}
            label="3-Day Cumulative"
            value={td.rainfall_3day_sum}
            unit="mm"
            variant="rain"
            trend={td.rainfall_3day_sum > 100 ? 'up' : 'flat'}
            trendValue={td.rainfall_3day_sum > 150 ? 'Monsoon Surge' : td.rainfall_3day_sum > 80 ? 'Heavy Rain' : 'Moderate'}
            subtitle="Precipitation Basin Accumulation"
            progress={Math.min(100, (td.rainfall_3day_sum / 300) * 100)}
          />
          <StatCard
            icon={Droplets}
            label="Soil Moisture Saturation"
            value={td.soil_moisture * 100}
            unit="%"
            decimals={1}
            variant="soil"
            trend={td.soil_moisture > 0.5 ? 'up' : 'down'}
            trendValue={td.soil_moisture > 0.6 ? 'Near Saturation' : td.soil_moisture > 0.35 ? 'Moderate' : 'Dry Basin'}
            subtitle="Sub-surface Infiltration Margin"
            progress={Math.min(100, td.soil_moisture * 100)}
          />
        </div>

        {/* Charts + Quick Access Row */}
        <div className="grid grid-cols-3 gap-3">
          <SeverityChart />
          <RainfallChart />
          {/* Command Action Hub Card */}
          <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Compass size={13} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Command Hub</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Mission control navigation</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Action Buttons with cohesive stealth black styling */}
              <div className="space-y-2">
                <Link 
                  href="/map" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Map size={13} className="text-white/80" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-white transition-colors font-satoshi">Live 3D Map</p>
                      <p className="text-[10px] text-gray-400 font-mono">3D Terrain & Building Simulation</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>

                <Link 
                  href="/reports" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText size={13} className="text-white/80" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-white transition-colors font-satoshi">AI Flood Reports</p>
                      <p className="text-[10px] text-gray-400 font-mono">Dynamic LLM Situation Reports</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>

                <Link 
                  href="/alerts" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <AlertTriangle size={13} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-white transition-colors font-satoshi">Alert Center</p>
                      <p className="text-[10px] text-gray-400 font-mono">Incident Feed & Live Chronology</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              </div>
            </div>

            {/* At-Risk Wards Live Watch */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-gray-400 font-semibold uppercase tracking-wider">Hazard Watchlist</span>
                <span className="text-[9.5px] font-mono text-gray-500">
                  {alertCount > 0 ? `${alertCount} elevated` : 'All Clear'}
                </span>
              </div>
              <div className="space-y-1.5">
                {cityWards
                  .filter((w) => (wardSeverities[w.id] ?? 0) >= 2)
                  .slice(0, 3)
                  .map((w) => {
                    const sev = wardSeverities[w.id] ?? 0;
                    return (
                      <Link
                        key={w.id}
                        href="/map"
                        onClick={() => useFloodStore.getState().setSelectedWard(w.id)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/20 transition-colors"
                      >
                        <span className="text-[11px] text-gray-300 font-satoshi font-medium truncate max-w-[150px]">{w.name}</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          sev === 3 ? 'bg-white text-black font-bold border-white' : 'bg-white/10 text-white border-white/20'
                        }`}>
                          {sev === 3 ? 'Critical' : 'Elevated'}
                        </span>
                      </Link>
                    );
                  })}
                {cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 2).length === 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] text-zinc-300">
                    <CheckCircle2 size={13} className="shrink-0 text-white" />
                    <span>No elevated risk zones detected in sector</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table + Alerts Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <WardTable />
          </div>
          <AlertsFeed />
        </div>
      </div>
    </div>
  );
}
