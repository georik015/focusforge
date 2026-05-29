import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => onFinish(), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <div className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Logo Mark */}
          <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white font-black text-5xl shadow-2xl mb-8 relative">
            V
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-10px] border-2 border-indigo-500/20 rounded-[40px] border-t-indigo-500"
            />
          </div>

          <div className="text-center">
            <h1 className="text-white text-3xl font-black tracking-tighter uppercase mb-2">
              VANGUARD <span className="text-indigo-500">CLOTHIER</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">
              Enterprise ERP System
            </p>
          </div>
        </motion.div>

        {/* Loading Progress */}
        <div className="mt-16 w-64 h-[2px] bg-slate-800 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: stage === 1 ? "30%" : stage === 2 ? "70%" : stage === 3 ? "100%" : "0%" }}
            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          />
        </div>

        {/* Status Text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center mt-6"
          >
            {stage === 0 && "Initializing Core Engine..."}
            {stage === 1 && "Verifying Security Protocols..."}
            {stage === 2 && "Synchronizing Terminal 01..."}
            {stage === 3 && "System Ready. Directing to Terminal."}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Version Tag */}
      <div className="absolute bottom-12 text-slate-700 font-bold text-[10px] tracking-widest uppercase">
        v1.0.0-PROD | Build 2026.05.23
      </div>
    </motion.div>
  );
}
