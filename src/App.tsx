import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Lock, MapPin } from 'lucide-react';
import './index.css';

import wordmark from './assets/Horizontal Wordmark with Emblem.png';
import heroImage from './assets/herosection.jpeg'; // The clean store interior image provided by the user
import bogoImg from './assets/buyonegetone.jpeg';
import off20Img from './assets/20off.jpeg';
import bobaFoodImg from './assets/bobafood.jpeg';
import milestoneImg from './assets/milestone.jpeg';

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
  status: 'LOCKED' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'PENDING_UNLOCK';
  couponCode?: string;
  activatedAt?: string;
}

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return (
    <div className="w-full flex justify-center py-4">
      <span className="font-mono tracking-wider font-bold animate-pulse text-[#1A1A1A]">Unlocking now...</span>
    </div>
  );
  
  return (
    <div className="w-full flex items-center justify-center gap-2 mt-2 mb-1">
      {/* Hours */}
      <div className="flex flex-col items-center justify-center bg-[#1A1A1A] border-2 border-black/10 rounded-xl w-14 h-14 md:w-16 md:h-16 shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        <span className="text-[22px] md:text-2xl font-black text-[#F6D365] leading-none tracking-tight shadow-sm z-10">
          {timeLeft.hours.toString().padStart(2, '0')}
        </span>
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold text-white/50 mt-1 z-10">
          Hrs
        </span>
      </div>
      
      {/* Separator */}
      <span className="text-[#1A1A1A] font-black text-xl md:text-2xl opacity-50 pb-2 animate-pulse">:</span>
      
      {/* Minutes */}
      <div className="flex flex-col items-center justify-center bg-[#1A1A1A] border-2 border-black/10 rounded-xl w-14 h-14 md:w-16 md:h-16 shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        <span className="text-[22px] md:text-2xl font-black text-[#F6D365] leading-none tracking-tight shadow-sm z-10">
          {timeLeft.minutes.toString().padStart(2, '0')}
        </span>
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold text-white/50 mt-1 z-10">
          Min
        </span>
      </div>
      
      {/* Separator */}
      <span className="text-[#1A1A1A] font-black text-xl md:text-2xl opacity-50 pb-2 animate-pulse">:</span>
      
      {/* Seconds */}
      <div className="flex flex-col items-center justify-center bg-[#1A1A1A] border-2 border-black/10 rounded-xl w-14 h-14 md:w-16 md:h-16 shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        <span className="text-[22px] md:text-2xl font-black text-[#F6D365] leading-none tracking-tight shadow-sm z-10">
          {timeLeft.seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] font-bold text-white/50 mt-1 z-10">
          Sec
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState<Step>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [journey, setJourney] = useState<Reward[] | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // 1. Check URL for token (Magic Link from WhatsApp)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('popobob_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname); // clear URL
    }

    // 2. Invisible Auth
    const token = localStorage.getItem('popobob_token');
    if (token) {
      fetch(`${API}/api/rewards/me/POBFN`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token expired');
        return res.json();
      })
      .then(data => {
        const mappedRewards = data.map((cr: any, index: number) => ({
          id: cr.id,
          sequence: index + 1,
          name: (index + 1) === 1 ? 'Buy 1 Get 1' : (index + 1) === 2 ? '20% OFF' : 'Free Boba Tea',
          status: cr.status,
          couponCode: cr.couponCode,
          activatedAt: cr.activatedAt,
        }));
        setJourney(mappedRewards);
      })
      .catch(() => {
        localStorage.removeItem('popobob_token'); // Clear invalid token
      });
    }
  }, []);

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
            const verifyRes = await fetch(`${API}/api/rewards/campaign/POBFN/verify`, {
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
            
            // Save token for invisible authentication next time
            if (verifyData.token) {
              localStorage.setItem('popobob_token', verifyData.token);
            }
            
            const journeyList = verifyData.journey || verifyData;
            const mappedRewards = journeyList.map((cr: any, index: number) => ({
              id: cr.id,
              sequence: index + 1,
              name: (index + 1) === 1 ? 'Buy 1 Get 1' : (index + 1) === 2 ? '20% OFF' : 'Free Boba Tea',
              status: cr.status,
              couponCode: cr.couponCode,
              activatedAt: cr.activatedAt,
            }));
            
            setJourney(mappedRewards);
            setStep('success');
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
      if (otpCode === '1234') {
        // MOCK SUCCESS FOR TESTING
        await new Promise(resolve => setTimeout(resolve, 800)); // simulate network delay
        setJourney([
          { id: 1, sequence: 1, name: 'Welcome Reward', status: 'ACTIVE', couponCode: 'POP-TEST-1234' },
          { id: 2, sequence: 2, name: '20% OFF', status: 'LOCKED' },
          { id: 3, sequence: 3, name: 'Boba + Free Food', status: 'LOCKED' },
          { id: 4, sequence: 4, name: 'Free Boba', status: 'LOCKED' }
        ]);
        setStep('success');
        setLoading(false);
        return;
      }

      if (window.verifyOtp) {
        window.verifyOtp(otpCode);
      } else if (window.verifyOTP) {
        window.verifyOTP(otpCode);
      } else {
        throw new Error('MSG91 OTP Service unavailable. Use 1234 to test.');
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
    { id: 1, sequence: 1, name: 'Buy 1 & Get 1', status: 'ACTIVE' },
    { id: 2, sequence: 2, name: '20% OFF', status: 'LOCKED' },
    { id: 3, sequence: 3, name: 'Free Boba', status: 'LOCKED' },
  ];

  // Derive the current ticket to show in the Success Screen
  const targetTicketReward = displayRewards.find(r => r.status === 'ACTIVE') 
    || displayRewards.slice().reverse().find(r => r.status === 'REDEEMED' || r.status === 'EXPIRED') 
    || displayRewards[0];
  const isTicketUsed = targetTicketReward?.status === 'REDEEMED' || targetTicketReward?.status === 'EXPIRED';

  return (
    <div className="min-h-screen bg-[#0F0F0F] font-sans text-white overflow-x-hidden relative selection:bg-gold selection:text-black">
      {/* ============ FLOATING HEADER ============ */}
      <header className="absolute top-0 left-0 w-full z-50 px-4 md:px-6 pt-2 md:pt-4 flex items-center justify-center pointer-events-none">
        
        {/* CENTER: Brand Logo */}
        <div className="pointer-events-auto">
          <img src={wordmark} alt="Pop O'Bob" className="h-20 md:h-28 w-auto object-contain drop-shadow-md" />
        </div>

      </header>

      {/* ============ MAIN CONTENT ============ */}
      <main className="relative z-10 w-full mx-auto bg-[#FFFDF9]">
        <AnimatePresence mode="wait">
          {(step === 'landing' || step === 'otp') && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  {/* ===== HERO SECTION ===== */}
                  <div className="relative w-full h-[70vh] md:h-[80vh] min-h-[550px] overflow-hidden bg-black">
                    
                    {/* Store Image - Ken Burns Zoom Effect */}
                    <motion.img 
                      src={heroImage} 
                      alt="Pop O' Bob Film Nagar Store" 
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 10, ease: "easeOut" }}
                      className="w-full h-full object-cover object-center opacity-90"
                    />
                    
                    {/* Floating Golden Orbs (Motion Graphics) - Pushed to periphery */}
                    <motion.div 
                      animate={{ y: [0, -20, 0], opacity: [0.15, 0.3, 0.15] }} 
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
                      className="absolute top-1/4 -left-10 w-48 h-48 bg-[#F4D160] rounded-full blur-[100px] mix-blend-screen pointer-events-none"
                    />
                    <motion.div 
                      animate={{ y: [0, 30, 0], opacity: [0.1, 0.2, 0.1] }} 
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
                      className="absolute bottom-1/4 -right-10 w-56 h-56 bg-[#F6D365] rounded-full blur-[120px] mix-blend-screen pointer-events-none"
                    />

                    {/* Top White Gradient for Logo Visibility */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/95 via-white/40 to-transparent z-10 pointer-events-none"></div>
                    
                    {/* Rich Cinematic Bottom Scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                    
                    {/* Subtle vignette */}
                    <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none"></div>

                    {/* Text Block — compact & centered at bottom */}
                    <div className="absolute bottom-0 left-0 w-full px-5 pb-8 md:pb-12 z-20 flex flex-col items-center text-center">
                      
                        {/* Compact Group: Headline + Label */}
                        <div className="flex flex-col items-center mb-6">
                            {/* Dynamic Headline */}
                            <motion.h1
                              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                              className="text-[32px] md:text-[48px] font-black leading-[1.05] text-white mb-4 tracking-tight drop-shadow-2xl"
                            >
                              Something <motion.span 
                                animate={{ opacity: [0.8, 1, 0.8], textShadow: ["0 0 10px rgba(246,211,101,0)", "0 0 20px rgba(246,211,101,0.6)", "0 0 10px rgba(246,211,101,0)"] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-[#F6D365] font-serif italic font-medium inline-block"
                              >special</motion.span><br/>
                              is waiting for you <span className="text-[#F4D160]/80 font-light">at</span>
                            </motion.h1>

                            {/* Highlighted Label - Compact Version */}
                              <motion.div
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                className="relative inline-block group"
                              >
                                <div className="absolute inset-0 bg-[#F4D160] blur-[15px] rounded-full opacity-40"></div>
                                <span className="relative flex items-center gap-1.5 bg-gradient-to-r from-[#F4D160] to-[#F6D365] shadow-[0_0_20px_rgba(244,209,96,0.4)] text-[#111] text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border border-white/40 overflow-hidden">
                                  <motion.div 
                                    animate={{ x: ['-200%', '400%'] }} 
                                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-30deg]"
                                  ></motion.div>
                                  <MapPin size={12} strokeWidth={2.5} className="text-[#111]" />
                                  <span className="mt-[1px]">Pop O' Bob - Film Nagar</span>
                                </span>
                              </motion.div>

                            {/* UX Value Proposition Subtitle */}
                            <motion.p
                              initial={{ y: 20, opacity: 0 }} 
                              animate={{ y: 0, opacity: 1 }} 
                              transition={{ delay: 0.35, type: 'spring' }}
                              className="text-white/70 text-[11px] md:text-[13px] max-w-[280px] md:max-w-md mx-auto mt-5 leading-relaxed font-medium"
                            >
                              Join today. Unlock your <strong className="text-white font-bold">first reward</strong>. Complete your journey to unlock <strong className="text-[#F4D160] font-bold">more rewards</strong>.
                            </motion.p>
                        </div>

                        {/* Step Flow - Looping Sliding Capsule */}
                        <motion.div
                          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }}
                          className="flex items-center w-full max-w-[360px] mx-auto p-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden"
                        >
                          {/* Moving Highlight Capsule */}
                          <motion.div
                             animate={{ x: ["0%", "100%", "200%", "0%"] }}
                             transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                             className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-[#F4D160] to-[#F6D365] shadow-[0_0_15px_rgba(244,209,96,0.3)] z-0 rounded-full"
                          />

                          {/* Step 1 */}
                          <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 relative z-10">
                             <motion.span 
                               animate={{ color: ["#111111", "#ffffff", "#ffffff", "#111111"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="w-4 h-4 bg-black/10 rounded-full flex items-center justify-center font-black text-[10px]"
                             >1</motion.span>
                             <motion.span 
                               animate={{ color: ["#111111", "#ffffff", "#ffffff", "#111111"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="text-[9.5px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                             >Unlock</motion.span>
                          </div>
                          
                          {/* Step 2 */}
                          <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 relative z-10">
                             <motion.span 
                               animate={{ color: ["#ffffff", "#111111", "#ffffff", "#ffffff"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="font-black text-[10px]"
                             >2</motion.span>
                             <motion.span 
                               animate={{ color: ["#ffffff", "#111111", "#ffffff", "#ffffff"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="text-[9.5px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                             >Redeem</motion.span>
                          </div>
                          
                          {/* Step 3 */}
                          <div className="flex flex-1 items-center justify-center gap-1.5 py-2.5 relative z-10">
                             <motion.span 
                               animate={{ color: ["#ffffff", "#ffffff", "#111111", "#ffffff"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="font-black text-[10px]"
                             >3</motion.span>
                             <motion.span 
                               animate={{ color: ["#ffffff", "#ffffff", "#111111", "#ffffff"] }} 
                               transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                               className="text-[9.5px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                             >Come Back</motion.span>
                          </div>
                        </motion.div>

                        {/* Compact Premium Scroll Indicator */}
                        <motion.div 
                          animate={{ y: [0, 5, 0], opacity: [0.3, 0.8, 0.3] }} 
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="mt-6 flex flex-col items-center gap-1 cursor-pointer"
                          onClick={() => document.getElementById('rewards-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          <span className="text-[8px] text-white/50 uppercase tracking-[0.3em] font-bold">Scroll</span>
                          <div className="w-2.5 h-2.5 border-b border-r border-white/50 rotate-45"></div>
                        </motion.div>
                    </div>
                  </div>
              
              <div id="rewards-section"></div>
              
              {/* REWARDS SECTION (2x2 Grid) */}
              {/* REWARDS SECTION (Grid for 3 items) */}
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
                    3 EXCLUSIVE REWARDS
                  </h2>
                  <p className="text-xs md:text-sm text-[#1A1A1A]/60 font-medium">
                    Visit. Collect. Enjoy more at Film Nagar.
                  </p>
                </div>

                {/* Grid for 3 items (first two side by side, third full width) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto relative z-10">
                  {displayRewards.map((reward, i) => {
                    const isActive = reward.status === 'ACTIVE' || (!journey && i === 0);
                    const isPending = reward.status === 'PENDING_UNLOCK';
                    const isLocked = reward.status === 'LOCKED' || (!journey && i > 0);

                    let cardDesc = "";
                    const seq = reward.sequence || (i + 1);
                    if (seq === 1) {
                      cardDesc = "Buy 1 Boba, get 1 completely FREE";
                    } else if (seq === 2) {
                      cardDesc = "Enjoy a flat 20% off your entire order";
                    } else if (seq === 3) {
                      cardDesc = "You made it! Claim your free Boba tea!";
                    }

                    // Make the 3rd reward span 2 columns on desktop
                    const spanClass = seq === 3 ? "md:col-span-2" : "";

                    // Boba Images
                    const bobaImgs = [
                      bogoImg, // User's Buy One Get One image
                      off20Img, // User's 20% OFF image
                      bobaFoodImg, // User's Boba + Food image
                      milestoneImg // User's Milestone image
                    ];

                    const overlayColor = isActive ? '#FFFDF6' : isPending ? '#F0F8FF' : '#FFFFFF';

                    return (
                      <motion.div 
                        key={i}
                        whileHover={!isLocked && !isPending ? { y: -5, scale: 1.02 } : {}}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`relative rounded-[24px] p-1 overflow-hidden group ${isLocked || isPending ? 'opacity-80' : ''} ${spanClass}`}
                      >
                        <div className={`relative flex flex-col justify-between overflow-hidden rounded-[24px] md:rounded-3xl p-5 md:p-6 transition-all shadow-lg min-h-[260px] md:min-h-[280px]
                        ${isActive 
                          ? 'bg-[#FFFDF6] border border-[#F6D365]/20' 
                          : isPending 
                            ? 'bg-blue-50/40 border border-blue-200/50' 
                            : 'bg-white border border-black/5'}`}>
                        
                        {/* Status Label & Icon */}
                        <div className="flex justify-between items-start z-10 relative">
                           <div className={`px-3 py-1.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-[#F4D160] text-[#2C2B29]' : isPending ? 'bg-blue-100 text-blue-800' : 'bg-black/5 text-black/40'}`}>
                             {isActive ? (journey ? 'ACTIVATED' : 'AVAILABLE') : isPending ? 'UNLOCKING SOON' : isLocked ? 'LOCKED' : 'REDEEMED'}
                           </div>
                           {!isActive && (
                             <div className="text-black/20 p-1.5 bg-black/5 rounded-full">
                               {isPending ? <div className="text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div> : <Lock size={14} className="md:w-5 md:h-5" />}
                             </div>
                           )}
                        </div>

                        {/* Image inside Card */}
                        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden rounded-inherit">
                           <img src={bobaImgs[i]} alt="Boba Reward" className={`w-full h-full object-cover object-center ${isActive ? 'opacity-80' : 'opacity-60'} mix-blend-multiply grayscale-[${isActive ? '0' : '100%'}]`} style={{ filter: isActive ? 'none' : isPending ? 'grayscale(50%) opacity(70%)' : 'grayscale(100%) opacity(60%)' }} />
                           {/* Soft fade overlay to softly blend the image and help text readability */}
                           <div className="absolute inset-0 bg-gradient-to-r to-transparent" style={{ backgroundImage: `linear-gradient(to right, ${overlayColor}CC, ${overlayColor}66, transparent)` }}></div>
                           <div className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent" style={{ backgroundImage: `linear-gradient(to top, ${overlayColor}99, transparent, transparent)` }}></div>
                        </div>

                        {/* Content */}
                        <div className="z-10 mt-auto relative pt-16">
                           <h3 className={`text-[22px] md:text-[28px] font-black leading-tight mb-2 ${isActive ? 'text-black' : 'text-black/90'}`}>
                             {reward.name}
                           </h3>
                           <p className={`text-[13px] md:text-[15px] font-bold leading-relaxed mb-6 max-w-[85%] ${isActive ? 'text-black/75' : 'text-black/50'}`}>
                             {cardDesc}
                           </p>

                             {/* Unlock Button */}
                             {isActive && (
                               <button
                                 onClick={() => {
                                   if (!journey) setStep('otp');
                                   else setStep('success'); // Re-open the ticket pass
                                 }}
                                 className="w-max bg-black/90 hover:bg-black text-[#F6D365] font-black text-[10px] tracking-[0.15em] uppercase px-6 py-3 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] backdrop-blur-md mt-2"
                               >
                                 <Gift size={13} className="text-[#F6D365]" />
                                 {journey ? 'View Pass' : 'Claim Offer'}
                               </button>
                             )}

                           {/* Pending Unlock Timer */}
                           {isPending && reward.activatedAt && (
                             <div className="w-full flex flex-col items-center justify-center mt-2 pt-4 border-t border-black/5">
                               <span className="text-[10px] uppercase font-black tracking-widest text-[#1A1A1A]/50 bg-white/40 px-3 py-1 rounded-full mb-1 backdrop-blur-sm shadow-sm">Reward Unlocks In</span>
                               <CountdownTimer targetDate={reward.activatedAt} />
                             </div>
                           )}
                        </div>
                        
                        {/* Decorative Crown for last reward */}
                        {seq === 3 && (
                          <div className="absolute right-4 top-12 text-3xl md:text-4xl opacity-20 blur-[1px] pointer-events-none rotate-12">
                             👑
                          </div>
                        )}
                      </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="w-full min-h-[100dvh] flex flex-col items-center justify-center p-4 pt-24 pb-8 bg-[#FFFDF9] relative z-[200]">
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                 <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F4D160] opacity-20 blur-[100px] rounded-full"></div>
                 <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4B030] opacity-10 blur-[80px] rounded-full"></div>
              </div>

              <div className="text-center mb-5 relative z-10 mt-6 md:mt-12">
                <div className="w-14 h-14 bg-[#F4D160] rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_6px_20px_rgba(244,209,96,0.4)]">
                  <svg className="w-7 h-7 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A] mb-1 tracking-tight">You're In, {customerName.split(' ')[0]}!</h1>
                <p className="text-[#1A1A1A]/60 font-semibold text-xs md:text-sm">{isTicketUsed ? 'This reward has already been used.' : 'Your reward is locked and ready.'}</p>
              </div>

              {/* Digital Pass Card */}
              <div className={`relative w-full max-w-[340px] bg-gradient-to-br ${isTicketUsed ? 'from-[#333] to-[#111] shadow-[0_20px_50px_rgba(0,0,0,0.5)] grayscale opacity-95' : 'from-[#B91C1C] to-[#7F1D1D] shadow-[0_20px_50px_rgba(185,28,28,0.3)]'} rounded-[28px] overflow-hidden border border-white/20 z-10 shrink-0`}>
                {/* Text Watermark */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col justify-around -rotate-12 opacity-10 z-0 scale-110">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`text-white font-black text-[26px] tracking-widest whitespace-nowrap flex gap-4 ${i % 2 === 0 ? '-ml-8' : '-ml-24'}`}>
                      <span>THE BOBA STANDARD</span>
                      <span className="opacity-50"> </span>
                      <span>THE BOBA STANDARD</span>
                      <span className="opacity-50"> </span>
                      <span>THE BOBA STANDARD</span>
                    </div>
                  ))}
                </div>

                {/* Pass Body */}
                <div className="px-7 py-8 text-center relative z-10 flex flex-col min-h-[460px] justify-end">
                  <div className={`absolute top-6 left-1/2 -translate-x-1/2 inline-block ${isTicketUsed ? 'bg-black/50 text-white/50 border border-white/10' : 'bg-white text-[#B91C1C]'} text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg`}>
                    {isTicketUsed ? 'REDEEMED' : 'AVAILABLE NOW'}
                  </div>

                  <div className="mt-6 flex flex-col flex-1 justify-end">
                    <h3 className="text-white/80 text-[10px] font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-sm">Reward #{targetTicketReward?.sequence || 1}</h3>
                    <h2 className="text-[36px] leading-[1.1] font-black text-white mb-6 tracking-tight drop-shadow-sm">{targetTicketReward?.name || 'Offer'}</h2>
                    
                    <div className={`bg-white border ${isTicketUsed ? 'border-black/40 opacity-70' : 'border-white/40'} rounded-[20px] p-5 mb-5 shadow-xl relative overflow-hidden`}>
                      <p className={`${isTicketUsed ? 'text-[#111]/60' : 'text-[#B91C1C]/60'} text-[9px] font-black tracking-widest uppercase mb-1.5`}>Your Unique Code</p>
                      <p className={`text-[28px] font-black ${isTicketUsed ? 'text-[#111]/50 line-through' : 'text-[#7F1D1D]'} tracking-[0.1em] drop-shadow-sm`}>{targetTicketReward?.couponCode || 'POP-TEST-1234'}</p>
                    </div>

                    <p className="text-white/80 text-[11px] font-medium mb-1.5">Valid at Film Nagar Outlet Only</p>
                    <p className="text-white text-[11px] font-bold mb-6 drop-shadow-sm bg-black/15 inline-block px-4 py-1.5 rounded-full">
                      {isTicketUsed ? 'Reward Used' : 'Expires in 10 Days'}
                    </p>

                    <div className="pt-5 border-t border-white/20">
                      <p className="text-white/90 text-[11px] font-medium leading-relaxed px-4">
                        {isTicketUsed ? 'This reward has already been claimed. Check your journey for the next one.' : 'Show this screen to the barista at checkout to claim your offer.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Pass Cutouts */}
                <div className="absolute top-[52%] -translate-y-1/2 -left-4 w-8 h-8 bg-[#FFFDF9] rounded-full shadow-inner z-20"></div>
                <div className="absolute top-[52%] -translate-y-1/2 -right-4 w-8 h-8 bg-[#FFFDF9] rounded-full shadow-inner z-20"></div>
              </div>

              <button onClick={() => setStep('landing')} className="mt-6 px-8 py-3.5 bg-[#F5F5F5] text-[#1A1A1A] font-black tracking-widest uppercase rounded-2xl hover:-translate-y-1 hover:shadow-lg active:scale-95 transition-all duration-300 text-[13px] z-10 border border-black/5">
                Go to My Journey
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* OTP / REGISTRATION MODAL */}
      <AnimatePresence>
        {step === 'otp' && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setStep('landing')}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:w-[440px] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-7 sm:p-9"
            >
              <button onClick={() => setStep('landing')} className="absolute top-6 right-6 text-black/40 hover:text-black transition-colors bg-black/5 hover:bg-black/10 rounded-full p-2.5">
                ✕
              </button>

              <h2 className="text-[28px] md:text-[34px] font-black tracking-tight mb-2 text-[#1A1A1A]">Join the Journey</h2>
              <p className="text-black/60 text-[13px] md:text-sm mb-8 font-semibold">Verify your number to securely lock in your 3 rewards.</p>
              
              {!window.configuration?.identifier ? (
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div className="group">
                    <label className="block text-[11px] font-black uppercase tracking-[0.15em] mb-2 text-black/40 group-focus-within:text-[#D4B030] transition-colors">Your Name</label>
                    <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Rahul Sharma"
                      className="w-full bg-[#F5F5F5] px-5 py-4 rounded-[16px] border-[2px] border-transparent focus:border-[#F4D160] focus:bg-[#FFFDF6] outline-none font-bold text-[#1A1A1A] text-[15px] placeholder:text-black/20 transition-all duration-300 ease-out focus:-translate-y-1 focus:shadow-[0_10px_20px_rgba(244,209,96,0.15)]" />
                  </div>
                  <div className="group">
                    <label className="block text-[11px] font-black uppercase tracking-[0.15em] mb-2 text-black/40 group-focus-within:text-[#D4B030] transition-colors">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-black/40 font-black border-r border-black/10 pr-3 group-focus-within:text-[#D4B030] transition-colors">+91</span>
                      <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="99999 99999"
                        className="w-full bg-[#F5F5F5] pl-16 pr-5 py-4 rounded-[16px] border-[2px] border-transparent focus:border-[#F4D160] focus:bg-[#FFFDF6] outline-none font-bold text-[#1A1A1A] text-[15px] placeholder:text-black/20 transition-all duration-300 ease-out tracking-wider focus:-translate-y-1 focus:shadow-[0_10px_20px_rgba(244,209,96,0.15)]" />
                    </div>
                  </div>
                  
                  {/* Terms & Conditions Checkbox */}
                  <label className="flex items-start gap-3.5 mt-6 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 rounded-[6px] border-[2px] border-black/15 bg-[#F5F5F5] peer-checked:bg-[#F4D160] peer-checked:border-[#F4D160] transition-all duration-300 flex items-center justify-center group-hover:border-[#F4D160]">
                        <svg className={`w-3.5 h-3.5 text-[#1A1A1A] ${termsAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'} transition-all duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-black/60 text-[12px] font-medium leading-relaxed select-none">
                      I agree to the <a href="#" className="text-[#1A1A1A] font-bold underline decoration-2 decoration-black/20 hover:decoration-[#F4D160] transition-colors">Terms & Conditions</a> and <a href="#" className="text-[#1A1A1A] font-bold underline decoration-2 decoration-black/20 hover:decoration-[#F4D160] transition-colors">Privacy Policy</a>.
                    </span>
                  </label>

                  {error && <p className="text-red-600 text-[11px] text-center font-bold bg-red-100 py-2.5 rounded-lg animate-pulse">{error}</p>}
                  
                  <button type="submit" disabled={loading || !termsAccepted} className="w-full bg-[#F4D160] hover:bg-[#F2C94C] text-[#1A1A1A] font-black tracking-widest uppercase py-4 rounded-[16px] mt-6 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 shadow-[0_8px_20px_rgba(244,209,96,0.3)] hover:shadow-[0_12px_25px_rgba(244,209,96,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_20px_rgba(244,209,96,0.3)] text-[14px]">
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6 pt-3">
                  <div className="flex justify-between gap-3 md:gap-4">
                     {otp.map((digit, i) => (
                       <input key={i} ref={el => { if (el) inputRefs.current[i] = el; }} type="text" maxLength={1} value={digit}
                         onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                         className="w-full aspect-square text-center text-[32px] font-black bg-[#F5F5F5] border-[2px] border-transparent rounded-[20px] focus:border-[#F4D160] focus:bg-[#FFFDF6] outline-none text-[#1A1A1A] transition-all duration-300 focus:-translate-y-1.5 focus:shadow-[0_12px_24px_rgba(244,209,96,0.2)] focus:scale-[1.05]" />
                     ))}
                  </div>
                  {error && <p className="text-red-600 text-[11px] text-center font-bold bg-red-100 py-2.5 rounded-lg animate-pulse">{error}</p>}
                  
                  <div className="text-center text-[13px] font-bold">
                    {canResend ? (
                      <button type="button" onClick={resendOtp} className="text-[#D4B030] hover:text-[#1A1A1A] transition-colors hover:underline decoration-2">Resend OTP</button>
                    ) : (
                      <span className="text-black/40">Resend in <span className="text-[#1A1A1A]">0:{otpTimer.toString().padStart(2, '0')}</span></span>
                    )}
                  </div>
                  
                  <button type="submit" disabled={loading || otp.join('').length !== 4} className="w-full bg-[#1A1A1A] hover:bg-black text-[#F4D160] font-black tracking-widest uppercase py-4.5 rounded-[16px] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 text-[14px]">
                    {loading ? 'Verifying...' : 'Unlock My Rewards'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FIXED BOTTOM CTA (Only on landing) --- */}
      <AnimatePresence>
        {step === 'landing' && (!journey || displayRewards.some(r => r.status === 'ACTIVE')) && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed bottom-4 left-0 w-full z-50 px-4 pointer-events-none"
          >
            <div className="max-w-md mx-auto flex flex-col items-center pointer-events-auto bg-[#111]/80 backdrop-blur-3xl border border-white/10 p-4 md:p-5 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              {!journey ? (
                <>
                  <button 
                    onClick={() => setStep('otp')}
                    className="w-full bg-gradient-to-r from-[#F4D160] to-[#F6D365] text-[#111] font-black text-[13px] tracking-[0.1em] uppercase py-3.5 rounded-[16px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,209,96,0.3)]"
                  >
                    <Gift size={16} strokeWidth={2.5} />
                    Unlock First Reward
                  </button>
                  <p className="text-white/50 text-[9px] md:text-[10px] font-bold tracking-[0.05em] mt-3 text-center uppercase">
                    Complete your journey &middot; Enjoy more
                  </p>
                </>
              ) : (
                <>
                   <div className="w-full bg-[#1A1A1A] border border-white/10 rounded-[16px] p-4 flex flex-col items-center shadow-inner">
                     <p className="text-white/50 text-[9px] font-bold tracking-widest uppercase mb-1">Your Active Reward Code</p>
                     <p className="text-2xl font-black text-[#F4D160] tracking-[0.2em]">
                       {displayRewards.find(r => r.status === 'ACTIVE')?.couponCode}
                     </p>
                     <p className="text-white/60 text-[9px] font-bold tracking-widest uppercase mt-3 text-center">
                       Show this code at the counter
                     </p>
                   </div>
                </>
              )}
              
              <div className="mt-3 flex items-center gap-1.5 text-white/30">
                <MapPin size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Pop O' Bob - Film Nagar</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
