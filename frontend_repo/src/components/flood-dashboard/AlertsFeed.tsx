'use client';

import React, { useState, useEffect } from 'react';
import { useFloodStore } from '@/store/flood-store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Bell, ShieldAlert, Radio, Wrench, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { fetchAwsActiveIncidents, dispatchAwsIncidentAction, type EmergencyIncident } from '@/lib/aws/floodsense-aws';

const severityLabel: Record<number, { text: string; color: string }> = {
  0: { text: 'Normal', color: 'text-zinc-400' },
  1: { text: 'Watch', color: 'text-zinc-300' },
  2: { text: 'Elevated', color: 'text-zinc-100' },
  3: { text: 'Critical', color: 'text-white font-bold' },
};

export default function AlertsFeed() {
  const { alertHistory } = useFloodStore();
  const [activeTab, setActiveTab] = useState<'incidents' | 'telemetry'>('incidents');
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const data = await fetchAwsActiveIncidents();
      if (data && data.length > 0) {
        setIncidents(data);
      }
    } catch (e) {
      console.warn('Failed to fetch AWS incidents:', e);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeployPump = async (incident: EmergencyIncident) => {
    setDispatchingId(incident.incident_id);
    try {
      await dispatchAwsIncidentAction(incident.incident_id, 'DEPLOY_PUMP', 'Tactical Dewatering Pump 4');
      await loadIncidents();
    } catch (e) {
      console.error('Dispatch failed:', e);
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            {activeTab === 'incidents' ? <Radio size={13} className="text-white animate-pulse" /> : <Bell size={13} className="text-gray-300" />}
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">
              {activeTab === 'incidents' ? 'AWS Incident Dispatch' : 'Telemetry Log'}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono">
              {activeTab === 'incidents' ? 'Live DynamoDB emergency triage' : 'Simulation state transitions'}
            </p>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              activeTab === 'incidents'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            AWS Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              activeTab === 'telemetry'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Events ({alertHistory.length})
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[360px] custom-scrollbar divide-y divide-white/[0.04]">
        {activeTab === 'incidents' ? (
          incidents.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldAlert size={24} className="text-gray-600 mx-auto mb-2 opacity-50" />
              <p className="text-[11px] text-gray-400 font-satoshi">No active emergency incidents on AWS.</p>
              <p className="text-[10px] text-gray-500 font-mono mt-1">Ground reports will auto-cluster here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {incidents.map((inc) => {
                const isCritical = inc.severity === 'CRITICAL';
                return (
                  <div key={inc.incident_id} className="p-4 hover:bg-white/[0.02] transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isCritical ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20'
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {inc.status}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            ID: {inc.incident_id}
                          </span>
                        </div>
                        <h4 className="text-[12px] font-semibold text-white font-satoshi mt-1">
                          {inc.location_name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {inc.report_count} reports
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-satoshi leading-snug">
                      {inc.latest_report_summary}
                    </p>

                    {inc.deployed_units && inc.deployed_units.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">Deployed:</span>
                        {inc.deployed_units.map((unit, idx) => (
                          <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                            {unit}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[9.5px] font-mono text-zinc-500">
                        Trigger Risk: {inc.risk_score_at_trigger}%
                      </div>
                      <button
                        onClick={() => handleDeployPump(inc)}
                        disabled={dispatchingId === inc.incident_id}
                        className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white transition-all disabled:opacity-50"
                      >
                        <Wrench size={10} />
                        <span>{dispatchingId === inc.incident_id ? 'Dispatching...' : 'Deploy Pump'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          alertHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Bell size={24} className="text-gray-600 mx-auto mb-2 opacity-50" />
              <p className="text-[11px] text-gray-400 font-satoshi">No recent telemetry transitions.</p>
            </div>
          ) : (
            <AnimatePresence>
              {alertHistory.slice(0, 20).map((alert) => {
                const isEscalation = alert.newSeverity > alert.oldSeverity;
                const isCritical = alert.newSeverity === 3;
                const newSev = severityLabel[alert.newSeverity] || severityLabel[0];
                const oldSev = severityLabel[alert.oldSeverity] || severityLabel[0];

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isCritical 
                        ? 'bg-white border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]' 
                        : isEscalation 
                        ? 'bg-white/[0.12] border-white/25 text-white' 
                        : 'bg-white/[0.04] border-white/10 text-zinc-400'
                    }`}>
                      {isEscalation ? (
                        <TrendingUp size={13} className={isCritical ? 'animate-pulse' : ''} />
                      ) : (
                        <TrendingDown size={13} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-200 group-hover:text-white font-satoshi truncate">
                        {alert.wardName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
                        <span className="text-gray-500">{oldSev.text}</span>
                        <ArrowRight size={9} className="text-gray-500" />
                        <span className={newSev.color}>{newSev.text}</span>
                      </div>
                    </div>
                    <div className="text-right text-[9.5px] font-mono text-gray-500">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )
        )}
      </div>
    </div>
  );
}

