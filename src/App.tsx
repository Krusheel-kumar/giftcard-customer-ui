import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Lock, Loader2, PartyPopper, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import './index.css';

import wordmark from './assets/Horizontal Wordmark with Emblem.png';
import heroImage from './assets/herosection.jpeg'; // The clean store interior image provided by the user

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081';

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
    verifyOtp: (otp: string | number) => void;
    verifyOTP: (otp: string) => void;
    configuration: any;
  }
}

type Step = 'landing' | 'otp' | 'success';

interface Reward {
  id: number;
  sequence: number;
  name: string;
  status: 'LOCKED' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  couponCode?: string;
}

export default function App() {
  const [step, setStep] = useState<Step>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [journey, setJourney] = useState<Reward[] | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const resendOtp = () => {
    if (!canResend) return;
    setOtpTimer(60);
    setCanResend(false);
    setOtp(['', '', '', '']); 
    if (window.initSendOTP && window.configuration) {
        window.initSendOTP(window.configuration);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customerName.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

      window.configuration = {
        widgetId: import.meta.env.VITE_MSG91_WIDGET_ID || "3668656e7541363234303538", 
        tokenAuth: import.meta.env.VITE_MSG91_TOKEN_AUTH || "557539Tl9kAR3zw36a7347b5P1", 
        identifier: formattedPhone,
        exposeMethods: "true",
        success: async (data: any) => {
          try {
            setLoading(true);
            const verifyRes = await fetch(`${API}/api/rewards/campaign/FILM_NAGAR_REWARDS/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                mobileNumber: phoneNumber, 
                customerName: customerName,
                token: data.message,
                source: 'WEB_QR'
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || 'Verification failed');
            
            const mappedRewards = verifyData.map((cr: any, index: number) => ({
              id: cr.id,
              sequence: index + 1,
              name: cr.rewardDefinitionId === 1 ? 'WELCOME REWARD' : cr.rewardDefinitionId === 2 ? '20% OFF' : cr.rewardDefinitionId === 3 ? 'BOBA + FREE FOOD' : 'MILESTONE REWARD',
              status: cr.status,
              couponCode: cr.couponCode,
            }));
            
            setJourney(mappedRewards);
            setStep('landing');
          } catch (err: any) {
            setError(err.message || 'Failed to verify OTP.');
          } finally {
            setLoading(false);
          }
        },
        failure: (error: any) => {
          setError(error.message || 'Invalid OTP');
          setLoading(false);
        }
      };

      if (window.initSendOTP) {
          window.initSendOTP(window.configuration);
      }
      
      setOtpTimer(60);
      setCanResend(false);
      setStep('otp');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (window.verifyOtp) {
        window.verifyOtp(otpCode);
      } else if (window.verifyOTP) {
        window.verifyOTP(otpCode);
      } else {
        throw new Error('OTP Service unavailable');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const displayRewards = journey || [
    { id: 1, sequence: 1, name: 'Buy One Get One', status: 'ACTIVE' },
    { id: 2, sequence: 2, name: '20% OFF', status: 'LOCKED' },
    { id: 3, sequence: 3, name: 'Boba + Free Food', status: 'LOCKED' },
    { id: 4, sequence: 4, name: 'Free Boba', status: 'LOCKED' },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] font-sans text-white overflow-x-hidden relative selection:bg-gold selection:text-black">
      {/* ============ FLOATING HEADER ============ */}
      <header className="absolute top-0 left-0 w-full z-50 px-4 md:px-6 pt-2 md:pt-4 flex items-center justify-between pointer-events-none">
        
        {/* LEFT: Brand Logo */}
        <div className="pointer-events-auto ml-2 md:ml-4">
          <img src={wordmark} alt="Pop O'Bob" className="h-20 md:h-28 w-auto object-contain drop-shadow-md" />
        </div>

        {/* RIGHT: Location pill + Hamburger */}
        <div className="flex items-center gap-3 md:gap-5 pointer-events-auto">
          {/* Premium Frosted Glass Location Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-white/50 backdrop-blur-md border border-white/60 text-[#1A1A1A] text-[10px] md:text-xs font-black tracking-[0.2em] uppercase px-5 py-2.5 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
            <MapPin size={14} className="text-[#D4AF37]" />
            <span>Film Nagar</span>
          </div>
          
          {/* Elegant Hamburger */}
          <button className="flex flex-col gap-[5px] p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer bg-white/50 backdrop-blur-md border border-white/60 shadow-sm">
            <span className="w-6 h-[2.5px] bg-[#1A1A1A] rounded-full"></span>
            <span className="w-6 h-[2.5px] bg-[#1A1A1A] rounded-full"></span>
            <span className="w-6 h-[2.5px] bg-[#1A1A1A] rounded-full"></span>
          </button>
        </div>
      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="relative z-10 w-full mx-auto bg-[#FFFDF9]">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              {/* ===== HERO SECTION ===== */}
              <div className="relative w-full h-[65vh] md:h-[75vh] min-h-[480px] overflow-hidden">
                
                {/* Store Image — fully visible */}
                <img 
                  src={heroImage} 
                  alt="Pop O' Bob Film Nagar Store" 
                  className="w-full h-full object-cover object-center"
                />
                
                {/* Top White Gradient for Logo Visibility */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/95 via-white/50 to-transparent z-10 pointer-events-none"></div>
                
                {/* Subtle bottom scrim ONLY — so the image looks bright and full */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none"></div>
                {/* Left scrim so text pops */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none"></div>

                {/* Text Block — pinned to bottom-left */}
                <div className="absolute bottom-0 left-0 w-full px-5 pb-8 z-10">
                  
                  {/* Highlighted Label */}
                  <motion.div
                    initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="mb-3"
                  >
                    <span className="inline-block bg-[#F6D365] text-[#1A1A1A] text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded shadow-sm">
                      Film Nagar Exclusive
                    </span>
                  </motion.div>

                  {/* Headline */}
                  <motion.h1
                    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-[28px] md:text-5xl font-bold leading-[1.2] text-white mb-4 tracking-tight drop-shadow-md"
                  >
                    Something <span className="text-[#F6D365] font-serif italic font-medium">special</span><br/>
                    is waiting at Film Nagar
                  </motion.h1>

                  {/* Minimal Features */}
                  <motion.div
                    initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/90 text-[11px] md:text-sm font-medium tracking-wide"
                  >
                    <span>Games & Activities</span>
                    <span className="text-white/40 text-[8px] md:text-[10px]">●</span>
                    <span>Outside Sitting</span>
                    <span className="text-white/40 text-[8px] md:text-[10px]">●</span>
                    <span>Pleasant Environment</span>
                  </motion.div>
                </div>
              </div>
              
              <div id="rewards-section"></div>
              
              {/* REWARDS SECTION (2x2 Grid) */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="w-full relative mt-12 pb-24 px-4"
              >
                {/* Heading Block */}
                <div className="text-center mb-8">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-amber-600 uppercase mb-2">
                    YOUR POP O’ BOB JOURNEY
                  </h3>
                  <h2 className="text-[26px] md:text-4xl font-black text-[#1A1A1A] mb-2 tracking-tight">
                    4 EXCLUSIVE REWARDS
                  </h2>
                  <p className="text-xs md:text-sm text-[#1A1A1A]/60 font-medium">
                    Visit. Collect. Enjoy more at Film Nagar.
                  </p>
                </div>

                {/* 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto relative z-10">
                  {displayRewards.map((reward, i) => {
                    const isActive = reward.status === 'ACTIVE' || (!journey && i === 0);
                    const isLocked = reward.status === 'LOCKED' || (!journey && i > 0);

                    let cardDesc = "";
                    if (i === 0) cardDesc = "Your first Pop O’ Bob treat.";
                    if (i === 1) cardDesc = "Come back for your next reward.";
                    if (i === 2) cardDesc = "Pair your favourite boba with a selected food item.";
                    if (i === 3) cardDesc = "Complete your journey and unlock a FREE BOBA.";

                    // Unsplash Boba Images
                    const bobaImgs = [
                      "https://images.unsplash.com/photo-1558857563-b2586b620ee6?q=80&w=400&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1596701831412-257a0774a382?q=80&w=400&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1595960010991-628a30691530?q=80&w=400&auto=format&fit=crop",
                      "https://images.unsplash.com/photo-1595960011505-1a850e334a1f?q=80&w=400&auto=format&fit=crop"
                    ];

                    return (
                      <div key={i} className={`relative flex flex-col justify-between overflow-hidden rounded-[20px] md:rounded-3xl p-5 md:p-6 transition-all shadow-xl min-h-[260px] md:min-h-[280px]
                        ${isActive 
                          ? 'bg-[#FFF9EC] shadow-[0_12px_40px_rgba(246,211,101,0.2)] border border-[#F6D365]/30 scale-[1.02] md:scale-100' 
                          : 'bg-white border border-black/5 shadow-[0_8px_20px_rgba(0,0,0,0.03)]'}`}>
                        
                        {/* Status Label & Icon */}
                        <div className="flex justify-between items-start z-10 relative">
                           <div className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] ${isActive ? 'bg-[#F6D365] text-[#1A1A1A] shadow-sm' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/40'}`}>
                             {isActive ? 'AVAILABLE' : isLocked ? 'LOCKED' : 'REDEEMED'}
                           </div>
                           {!isActive && (
                             <div className="text-[#1A1A1A]/20 p-1.5 bg-[#1A1A1A]/5 rounded-full">
                               <Lock size={12} className="md:w-4 md:h-4" />
                             </div>
                           )}
                        </div>

                        {/* Image inside Card */}
                        <div className="absolute right-0 bottom-0 w-32 h-32 md:w-40 md:h-40 opacity-90 z-0 mask-image-gradient">
                           <img src={bobaImgs[i]} alt="Boba Reward" className="w-full h-full object-cover rounded-tl-full opacity-60 mix-blend-multiply" style={{ maskImage: 'radial-gradient(circle at bottom right, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at bottom right, black 30%, transparent 70%)' }} />
                        </div>

                        {/* Content */}
                        <div className="z-10 mt-auto relative">
                           <h3 className={`text-[18px] md:text-2xl font-black leading-[1.1] mb-2 ${isActive ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/80'}`}>
                             {reward.name}
                           </h3>
                           <p className={`text-[11px] md:text-[13px] font-semibold leading-relaxed mb-4 md:mb-5 max-w-[75%] ${isActive ? 'text-[#1A1A1A]/70' : 'text-[#1A1A1A]/40'}`}>
                             {cardDesc}
                           </p>

                           {/* Added Unlock Button on Active Card */}
                           {isActive && (
                             <button
                               onClick={() => {
                                 if (!journey) setStep('otp');
                               }}
                               className="w-full sm:w-auto bg-[#F6D365] hover:bg-[#FFD23F] text-[#1A1A1A] font-black text-[11px] tracking-[0.1em] uppercase px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(246,211,101,0.4)]"
                             >
                               <Gift size={14} />
                               {journey ? 'Claimed' : 'Unlock My Reward'}
                             </button>
                           )}
                        </div>
                        
                        {/* Decorative Crown for last reward */}
                        {i === 3 && (
                          <div className="absolute right-2 top-10 text-3xl md:text-4xl opacity-20 blur-[1px] pointer-events-none rotate-12">
                             👑
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* OTP / REGISTRATION OVERLAY */}
          {step === 'otp' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full pt-10">
              <div className="bg-[#151515] border border-white/10 w-full rounded-[2rem] p-6 sm:p-8 shadow-2xl relative">
                <button onClick={() => setStep('landing')} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full p-2">
                  ✕
                </button>

                <h2 className="text-2xl font-bold mb-2 text-white">Join the Journey</h2>
                <p className="text-white/50 text-xs mb-8 font-medium">Verify your number to securely lock in your 4 rewards.</p>
                
                {!window.configuration?.identifier ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-white/50">Your Name</label>
                      <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul Sharma"
                        className="w-full bg-black/50 px-4 py-3.5 rounded-xl border border-white/10 focus:border-gold focus:ring-1 focus:ring-gold outline-none font-medium text-white placeholder:text-white/20 transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-white/50">Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold border-r border-white/10 pr-2">+91</span>
                        <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="99999 99999"
                          className="w-full bg-black/50 pl-16 pr-4 py-3.5 rounded-xl border border-white/10 focus:border-gold focus:ring-1 focus:ring-gold outline-none font-medium text-white placeholder:text-white/20 transition-all tracking-wide text-sm" />
                      </div>
                    </div>
                    {error && <p className="text-red-400 text-[11px] text-center font-bold bg-red-500/10 py-2 rounded-lg">{error}</p>}
                    
                    <button type="submit" disabled={loading} className="w-full bg-[#F6D365] text-black font-black tracking-widest uppercase py-4 rounded-xl mt-6 active:scale-95 transition-all shadow-[0_0_20px_rgba(246,211,101,0.2)] disabled:opacity-50 text-xs">
                      {loading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex justify-between gap-2">
                       {otp.map((digit, i) => (
                         <input key={i} ref={el => { if (el) inputRefs.current[i] = el; }} type="text" maxLength={1} value={digit}
                           onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                           className="w-full aspect-square text-center text-2xl font-black bg-black/50 border border-white/10 rounded-xl focus:border-gold focus:bg-black outline-none text-white transition-all" />
                       ))}
                    </div>
                    {error && <p className="text-red-400 text-[11px] text-center font-bold bg-red-500/10 py-2 rounded-lg">{error}</p>}
                    
                    <div className="text-center text-xs font-medium">
                      {canResend ? (
                        <button type="button" onClick={resendOtp} className="text-[#F6D365] font-bold underline">Resend OTP</button>
                      ) : (
                        <span className="text-white/50">Resend in <span className="font-bold text-white">0:{otpTimer.toString().padStart(2, '0')}</span></span>
                      )}
                    </div>
                    
                    <button type="submit" disabled={loading || otp.join('').length !== 4} className="w-full bg-[#F6D365] text-black font-black tracking-widest uppercase py-4 rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(246,211,101,0.2)] disabled:opacity-50 text-xs">
                      {loading ? 'Verifying...' : 'Unlock My Rewards'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- FIXED BOTTOM CTA (Only on landing) --- */}
      <AnimatePresence>
        {step === 'landing' && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed bottom-0 left-0 w-full z-50 p-5 bg-gradient-to-t from-black via-black/90 to-transparent"
          >
            <div className="max-w-md mx-auto flex flex-col items-center">
              {!journey ? (
                <>
                  <button 
                    onClick={() => setStep('otp')}
                    className="w-full bg-[#F6D365] text-black font-black text-[15px] py-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_10px_30px_rgba(246,211,101,0.2)]"
                  >
                    🎁 UNLOCK MY REWARD
                  </button>
                  <p className="text-white/60 text-[11px] font-medium mt-3 text-center">
                    Complete your journey. Enjoy more at Film Nagar.
                  </p>
                </>
              ) : (
                <>
                   <div className="w-full bg-[#1A1A1A] border border-white/10 rounded-[20px] p-4 flex flex-col items-center shadow-2xl">
                     <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">Your Active Reward Code</p>
                     <p className="text-2xl font-black text-white tracking-[0.2em]">
                       {displayRewards.find(r => r.status === 'ACTIVE')?.couponCode || 'CHECK OUT'}
                     </p>
                     <p className="text-[#F6D365] text-[10px] font-bold tracking-widest uppercase mt-3 text-center">
                       Show this code at the Film Nagar counter
                     </p>
                   </div>
                </>
              )}
              
              <div className="mt-4 flex items-center gap-1.5 opacity-40">
                <MapPin size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Pop O' Bob — Film Nagar</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
