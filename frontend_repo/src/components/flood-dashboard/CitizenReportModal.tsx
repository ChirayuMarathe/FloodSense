'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Droplets, AlertTriangle, CheckCircle2, Loader2, X, UploadCloud } from 'lucide-react';
import { submitAwsCitizenReport } from '@/lib/aws/floodsense-aws';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WATER_LEVELS = [
  { id: 'ROAD_WET', label: 'Road Wet', desc: 'Puddles forming, drivable', color: 'border-zinc-700 text-zinc-300' },
  { id: 'ANKLE', label: 'Ankle Deep', desc: 'Curbs covered (~15cm)', color: 'border-amber-500/40 text-amber-400' },
  { id: 'KNEE', label: 'Knee Deep', desc: 'Vehicles stalling (~45cm)', color: 'border-orange-500/50 text-orange-400' },
  { id: 'WAIST', label: 'Waist Deep', desc: 'Emergency rescue (~90cm)', color: 'border-red-500/60 text-red-400' },
  { id: 'SEVERE', label: 'Severe Deluge', desc: 'Over waist, structural hazard', color: 'border-rose-600 text-rose-500' },
] as const;

export default function CitizenReportModal({ isOpen, onClose }: CitizenReportModalProps) {
  const { activeCity } = useFloodStore();
  const cityWards = getWardsForCity(activeCity);

  const [selectedWard, setSelectedWard] = useState(cityWards[0]?.id || '1');
  const [waterLevel, setWaterLevel] = useState<'ROAD_WET' | 'ANKLE' | 'KNEE' | 'WAIST' | 'SEVERE'>('KNEE');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ward = cityWards.find((w) => w.id === selectedWard);
      const res = await submitAwsCitizenReport({
        zone_id: selectedWard,
        latitude: ward?.center[1] || 19.076,
        longitude: ward?.center[0] || 72.877,
        water_level: waterLevel,
        description: description || `Ground waterlogging observation in ${ward?.name || 'ward'}.`,
        photo_file: photoFile,
      });
      setSubmitSuccess(res);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(null);
    setPhotoFile(null);
    setPreviewUrl(null);
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg p-6 bg-[#0E1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-satoshi text-white"
        >
          {/* Close button */}
          <button
            onClick={resetForm}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          {submitSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold font-clash">Report Verified & Ingested</h3>
              <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Evidence uploaded to <strong className="text-white">Amazon S3</strong> and recorded in{' '}
                <strong className="text-white">Amazon DynamoDB</strong>.
              </p>
              {submitSuccess.verification_status && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  ● Status: {submitSuccess.verification_status}
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono tracking-wider uppercase mb-2">
                  <Droplets size={12} /> AWS Citizen Ground-Truth Pipeline
                </div>
                <h2 className="text-2xl font-bold font-clash">Report Local Flooding</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your ground observation directly correlates with the AWS Risk Engine to verify model accuracy.
                </p>
              </div>

              {/* Ward Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Monitored Ward / Sector</label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-white/30"
                >
                  {cityWards.map((w) => (
                    <option key={w.id} value={w.id} className="bg-zinc-900 text-white">
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Water Level Chips */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">Observed Water Depth</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WATER_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setWaterLevel(lvl.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${lvl.color} ${
                        waterLevel === lvl.id
                          ? 'bg-white/10 ring-1 ring-white/40'
                          : 'bg-black/30 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{lvl.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Evidence Upload to S3 */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Photo Evidence (Direct S3 Upload)</label>
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/15 rounded-xl bg-black/40 hover:bg-white/[0.03] transition-colors cursor-pointer">
                  {previewUrl ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <Camera size={20} className="text-zinc-400 mb-1" />
                      <span className="text-xs text-zinc-300 font-medium">Click to capture or upload photo</span>
                      <span className="text-[10px] text-zinc-500">Uploaded via pre-signed URL to Amazon S3</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Location Landmark & Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Underpass completely submerged, sedans turning back..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Uploading to AWS...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Submit Ground Report
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
