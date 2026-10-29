import React, { useState, useRef } from 'react';
import { Direction, DetectionResult } from '../types/traffic';
import { uploadMediaForDetection, runDemoDetection, injectDetectionToSimulation } from '../services/api';
import {
  Upload, Camera, Play, CheckCircle2, AlertTriangle,
  Car, Bus, Truck, Bike, Layers, ArrowRight, ShieldAlert, Video
} from 'lucide-react';

interface DetectionPageProps {
  onVehicleInjected?: () => void;
}

export const DetectionPage: React.FC<DetectionPageProps> = ({ onVehicleInjected }) => {
  const [selectedDirection, setSelectedDirection] = useState<Direction>('NORTH');
  const [confidence, setConfidence] = useState<number>(0.40);
  const [forceDemo, setForceDemo] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [injectSuccess, setInjectSuccess] = useState<boolean>(false);

  // Webcam state
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setInjectSuccess(false);

    try {
      const res = await uploadMediaForDetection(file, selectedDirection, confidence, forceDemo);
      setDetectionResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDemo = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setInjectSuccess(false);

    try {
      const res = await runDemoDetection(selectedDirection, confidence);
      setDetectionResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo detection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsWebcamActive(true);
      }
    } catch (err) {
      setErrorMsg('Webcam access was denied or is not available on this device.');
    }
  };

  const handleCaptureWebcamFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsLoading(true);
      setErrorMsg(null);
      setInjectSuccess(false);
      try {
        const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });
        const res = await uploadMediaForDetection(file, selectedDirection, confidence, forceDemo);
        setDetectionResult(res);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to detect webcam frame');
      } finally {
        setIsLoading(false);
      }
    }, 'image/jpeg');
  };

  const handleStopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsWebcamActive(false);
    }
  };

  const handleInject = async () => {
    if (!detectionResult) return;
    try {
      await injectDetectionToSimulation({
        direction: selectedDirection,
        cars: detectionResult.cars,
        buses: detectionResult.buses,
        trucks: detectionResult.trucks,
        motorcycles: detectionResult.motorcycles,
      });
      setInjectSuccess(true);
      onVehicleInjected?.();
      setTimeout(() => setInjectSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to inject into simulation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Computer Vision Vehicle Detection Pipeline</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              YOLOv8 & OpenCV
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Classifies Cars, Buses, Trucks, and Motorcycles from CCTV, video files, or camera streams.
          </p>
        </div>

        {/* Direction Assignment */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Assign Camera To Approach:</span>
          <div className="flex space-x-1">
            {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDirection(d)}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  selectedDirection === d
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Controls & Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload & Webcam Controls Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Media Input Source
          </h3>

          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Upload Image / Video Clip</span>
          </button>

          {/* Demo Scenario Button */}
          <button
            onClick={handleRunDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center space-x-2 transition"
          >
            <Play className="w-4 h-4 fill-current text-emerald-400" />
            <span className="text-xs font-semibold">Run Built-In Test Scenario</span>
          </button>

          {/* Webcam Toggle */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {!isWebcamActive ? (
              <button
                onClick={handleStartWebcam}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center space-x-2 text-xs transition"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Start Live Webcam Feed</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleCaptureWebcamFrame}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center space-x-2 text-xs font-semibold transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture & Run YOLO Inference</span>
                </button>
                <button
                  onClick={handleStopWebcam}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 text-xs transition"
                >
                  Stop Webcam
                </button>
              </div>
            )}
          </div>

          {/* Settings Sliders */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Confidence Threshold:</span>
                <span className="font-mono text-white font-bold">{Math.round(confidence * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <label htmlFor="force-demo-toggle" className="flex items-center space-x-2 cursor-pointer">
                <span>Force Demo Sensor Mode</span>
              </label>
              <input
                id="force-demo-toggle"
                type="checkbox"
                checked={forceDemo}
                onChange={(e) => setForceDemo(e.target.checked)}
                className="rounded accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Video / Annotated Image Display (2 cols) */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <span>Visual Detection Display</span>
                {detectionResult?.is_demo_mode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    DEMO SIMULATED SENSOR
                  </span>
                )}
                {detectionResult && !detectionResult.is_demo_mode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    LIVE YOLOv8 INFERENCE
                  </span>
                )}
              </h3>
              {detectionResult && (
                <span className="text-xs font-mono text-slate-400">
                  Latency: {detectionResult.processing_time_ms} ms
                </span>
              )}
            </div>

            {/* Webcam Live Preview Video if active */}
            {isWebcamActive && (
              <div className="mb-3 rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video max-h-64 flex justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="h-full object-contain" />
              </div>
            )}

            {/* Main Annotated Image View */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 min-h-[260px] flex items-center justify-center">
              {isLoading ? (
                <div className="text-center p-8 space-y-2">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Running YOLOv8 vehicle detection & classification...</p>
                </div>
              ) : detectionResult?.annotated_image_base64 ? (
                <img
                  src={detectionResult.annotated_image_base64}
                  alt="YOLO Detection Result"
                  className="w-full h-auto object-contain max-h-[360px]"
                />
              ) : (
                <div className="text-center p-8 text-slate-500 text-xs">
                  <Camera className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p>Upload a traffic image or click &quot;Run Built-In Test Scenario&quot; to test vehicle classification.</p>
                </div>
              )}
            </div>
          </div>

          {/* Injection Action Bar */}
          {detectionResult && (
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                Ready to push detected vehicles into the <span className="font-bold text-emerald-400">{selectedDirection}</span> road queue?
              </div>
              <button
                onClick={handleInject}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-md shadow-emerald-700/20"
              >
                <span>Inject Into Intersection Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {injectSuccess && (
            <div className="mt-2 p-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Detections successfully injected into {selectedDirection} queue in the simulation!</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-2 p-2.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Detection Results Breakdown Cards */}
      {detectionResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Classification Counts & Passenger Car Units (PCU)
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Total Vehicles: {detectionResult.total_detected} ({detectionResult.estimated_pcu} PCU)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
              <Car className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{detectionResult.cars}</div>
              <div className="text-slate-400 text-[11px]">Cars (1.0 PCU)</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
              <Bus className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{detectionResult.buses}</div>
              <div className="text-slate-400 text-[11px]">Buses (2.5 PCU)</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/30">
              <Truck className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{detectionResult.trucks}</div>
              <div className="text-slate-400 text-[11px]">Trucks (2.2 PCU)</div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <Bike className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{detectionResult.motorcycles}</div>
              <div className="text-slate-400 text-[11px]">Motorcycles (0.5 PCU)</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-World Computer Vision Limitations Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-slate-200 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Real-World Computer Vision Limitations & Engineering Constraints</span>
        </div>
        <p className="leading-relaxed">
          While YOLOv8 provides high accuracy under standard lighting, practical deployment on municipal CCTV streams faces known challenges:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li><strong>Adverse Weather:</strong> Rain streaks, lens droplets, dense fog, and snow scatter incident light and lower detection recall.</li>
          <li><strong>Illumination & Glare:</strong> Nighttime headlight bloom and low-angle sun glare produce severe false positives or vehicle silhouette loss.</li>
          <li><strong>Occlusion:</strong> Large commercial trucks and double-decker buses can obscure trailing two-wheelers and compact cars.</li>
          <li><strong>Camera Mounting:</strong> Low elevation cameras introduce severe foreshortening compared to high mast 360-degree fisheye sensors.</li>
        </ul>
      </div>
    </div>
  );
};
