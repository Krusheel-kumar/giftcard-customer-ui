import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ArrowRight, ShieldCheck, Copy, CheckCircle2, Share2, MapPin, Gift, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import './index.css';

import wordmark from './assets/Horizontal Wordmark with Emblem.png';
import emblem from './assets/Brand Emblem.png';
import rakhiBg from './assets/rakhi-bg.jpg';
import heroImage from './assets/rakhibanner.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8081';

declare global {
  interface Window {
    initSendOTP: (config: any) => void;
    verifyOtp: (otp: string | number) => void;
    verifyOTP: (otp: string) => void;
    configuration: any;
  }
}

type Step = 'landing' | 'mobile' | 'otp' | 'success';

export default function App() {
  const [step, setStep] = useState<Step>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [bogoCode, setBogoCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // MSG91 configuration
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // 1. Inform backend to check if already claimed
      const res = await fetch(`${API}/api/bogo/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to claim offer');

      // 2. Initialize MSG91 Configuration
      const isLocalTest = window.location.hostname === 'localhost';
      if (isLocalTest) {
        setStep('otp');
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        setLoading(false);
        return;
      }

      let formattedPhone = phoneNumber.replace('+', '');
      if (!formattedPhone.startsWith('91')) formattedPhone = '91' + formattedPhone;

      window.configuration = {
        widgetId: "3668656e7541363234303538", 
        tokenAuth: "557539Tl9kAR3zw36a7347b5P1", 
        identifier: formattedPhone,
        exposeMethods: "true",
        success: async (data: any) => {
          try {
            const verifyRes = await fetch(`${API}/api/bogo/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                mobileNumber: phoneNumber, 
                token: data.message 
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || 'Verification failed');
            
            setBogoCode(verifyData.code);
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

    const isLocalTest = window.location.hostname === 'localhost';
    if (isLocalTest) {
      if (otpCode !== '1234') {
        setError('Invalid Test OTP. Use 1234.');
        setLoading(false);
        return;
      }
      try {
        const verifyRes = await fetch(`${API}/api/bogo/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobileNumber: phoneNumber, token: '1234' }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.message || 'Verification failed');
        setBogoCode(verifyData.code);
        setStep('success');
      } catch (err: any) {
        setError(err.message || 'Failed to verify local OTP.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Call MSG91 to verify the OTP entered
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

  const copyCode = () => {
    navigator.clipboard.writeText(bogoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = async () => {
    if (!cardRef.current) return;
    try {
      setSharing(true);
      const dataUrl = await toPng(cardRef.current, { 
        quality: 1, 
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'bogo-code.png', { type: 'image/png' });
      
      const shareData = {
        title: "Pop O'Bob BOGO Code",
        text: `Hey! Here's my Buy 1 Get 1 FREE code for Pop O'Bob Festive! Redeemable at the Film Nagar outlet. https://goo.gl/maps/popobob`,
        files: [file]
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const url = `https://wa.me/?text=${encodeURIComponent(`Hey! Here's my Buy 1 Get 1 FREE code for Pop O'Bob Festive! Code: ${bogoCode} Redeemable at the Film Nagar outlet. https://goo.gl/maps/popobob`)}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    } finally {
      setSharing(false);
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, { 
        quality: 1, 
        pixelRatio: 3,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      const link = document.createElement('a');
      link.download = `PopOBob-Card-${customerName || 'BOGO'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading:', err);
    } finally {
      setDownloading(false);
    }
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4 } }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-richBlack overflow-x-hidden relative selection:bg-[#710000] selection:text-cream">
      {/* Premium Festive Background Layer */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply bg-center bg-cover z-0"
        style={{ backgroundImage: `url(${rakhiBg})`, backgroundAttachment: 'fixed' }}
      />
      {/* Ambient Glowing Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-[#710000]/10 to-transparent rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-tr from-gold/15 to-transparent rounded-full blur-[120px] pointer-events-none z-0" />

      <header className="absolute top-0 left-0 w-full z-50 bg-transparent pt-1 md:pt-4">
        <div className="max-w-5xl mx-auto px-6 h-20 md:h-28 flex items-center justify-center">
          <img src={wordmark} alt="Pop O'Bob" className="h-16 md:h-28 object-contain scale-110 md:scale-125 drop-shadow-2xl hover:scale-125 transition-transform duration-700" />
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[100svh] w-full pt-20">
        <AnimatePresence mode="wait">
          
          {step === 'landing' && (
            <motion.div key="landing" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 w-full h-[100svh] z-40 flex flex-col text-center bg-[#FDFBF7]">
              
              {/* Hero Image - Flexes to dynamically fill all available space */}
              <div className="relative w-full flex-1 z-0 overflow-hidden bg-[#D1BCA6]">
                
                {/* Main Image, shifted down slightly to create space for logo */}
                <img src={heroImage} alt="Raksha Bandhan Love" className="absolute top-12 left-0 w-full h-[calc(100%-3rem)] object-cover object-center" />
                
                {/* Smooth blend gradient at the top for the logo */}
                <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#D1BCA6] via-[#D1BCA6]/80 to-transparent z-10 pointer-events-none" />
                
                {/* Cinematic gradient at the bottom to blend into the card */}
                <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent z-10 pointer-events-none" />
              </div>

              {/* Text Content Overlay - Anchored flawlessly to the bottom of the screen */}
              <div className="relative z-20 w-full max-w-2xl mx-auto px-4 -mt-16 pb-8 md:pb-12 flex-shrink-0 flex flex-col items-center">
                
                <div className="bg-[#FDFBF7]/90 backdrop-blur-2xl border border-gold/30 shadow-[0_20px_50px_rgba(113,0,0,0.08)] rounded-[2rem] p-6 md:p-8 text-center w-full relative overflow-hidden">
                  
                  {/* Subtle top accent line */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-50" />
                  
                  {/* Headings */}
                  <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight mb-2 text-richBlack">
                    Celebrate the Bond.
                  </h1>
                  
                  {/* Structured Offer Display */}
                  <div className="flex items-center justify-center gap-4 my-3">
                    <div className="h-px bg-gradient-to-r from-transparent to-gold/50 flex-1 max-w-[50px]"></div>
                    <h2 className="font-serif text-xl md:text-2xl italic text-[#710000] font-medium tracking-wide">
                      Buy 1 Get 1 Free
                    </h2>
                    <div className="h-px bg-gradient-to-l from-transparent to-gold/50 flex-1 max-w-[50px]"></div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm md:text-base text-richBlack/70 mb-5 font-medium leading-relaxed max-w-sm mx-auto">
                    Double the sweetness this Rakhi. Treat your sibling to a boba and the second one is on us!
                  </p>
                  
                  {/* CTA Button */}
                  <button
                    onClick={() => setStep('mobile')}
                    className="relative overflow-hidden w-full sm:w-auto bg-gradient-to-r from-[#710000] to-[#4A0000] text-cream px-8 py-4 rounded-full font-bold text-base hover:shadow-[0_10px_40px_rgba(113,0,0,0.3)] transition-all duration-300 inline-flex justify-center items-center gap-3 group border border-[#910000]"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Gift a Boba Now <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-2" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/20 to-gold/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </button>

                </div>
              </div>

            </motion.div>
          )}

          {step === 'mobile' && (
            <motion.div key="mobile" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md px-4 relative z-10">
              <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(113,0,0,0.1)] border border-white p-8 md:p-10 text-center relative overflow-hidden">
                {/* Subtle top gradient line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#710000]/40 to-transparent" />
                
                <img src={emblem} className="absolute -top-12 -right-12 w-56 opacity-[0.03] pointer-events-none rotate-12" />
                
                <h2 className="font-serif text-3xl font-bold mb-3 text-[#710000]">Send Rakhi Love</h2>
                <p className="text-gray-500 mb-8 font-medium text-sm px-4">Enter your details to generate your beautifully crafted Rakhi Gift Card.</p>
                
                <form onSubmit={handleSendOtp} className="space-y-5 text-left relative z-10">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 px-1 text-gray-500">Your Name</label>
                    <input required type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Rahul Sharma"
                      className="w-full bg-white/80 px-5 py-4 rounded-2xl border border-gray-200 focus:bg-white focus:border-[#710000] focus:ring-4 focus:ring-[#710000]/10 outline-none transition-all font-bold text-lg shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 px-1 text-gray-500">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold border-r border-gray-200 pr-3">+91</span>
                      <input required type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="99999 99999"
                        className="w-full bg-white/80 pl-20 pr-5 py-4 rounded-2xl border border-gray-200 focus:bg-white focus:border-[#710000] focus:ring-4 focus:ring-[#710000]/10 outline-none transition-all font-bold text-lg shadow-sm tracking-wide" />
                    </div>
                  </div>
                  {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#710000] to-[#520000] text-cream font-bold py-4 rounded-2xl hover:shadow-lg transition-all border border-[#910000] mt-4">
                    {loading ? 'Sending OTP...' : 'Get OTP'}
                  </button>
                  <button type="button" onClick={() => setStep('landing')} className="w-full text-sm text-gray-400 font-bold hover:text-black mt-2 transition-colors">Go Back</button>
                </form>
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div key="otp" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="w-full max-w-md px-4 relative z-10">
              <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(113,0,0,0.1)] border border-white p-8 md:p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#710000]/40 to-transparent" />
                
                <div className="w-16 h-16 bg-[#710000]/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#710000]/10">
                  <ShieldCheck className="text-[#710000] w-8 h-8" />
                </div>
                <h2 className="font-serif text-3xl font-bold mb-2">Verify OTP</h2>
                <p className="text-gray-500 mb-8 font-medium">Sent to +91 {phoneNumber}</p>

                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex gap-4 justify-center">
                    {otp.map((digit, index) => (
                      <input key={index} ref={el => { inputRefs.current[index] = el; }} type="text" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)} onKeyDown={e => handleOtpKeyDown(index, e)}
                        className="w-14 h-16 text-center text-3xl font-black bg-white border-2 border-gray-100 rounded-2xl focus:border-[#710000] focus:ring-4 focus:ring-[#710000]/10 outline-none shadow-sm transition-all text-[#710000]" />
                    ))}
                  </div>
                  {error && <p className="text-red-500 text-sm font-bold bg-red-50 py-2 rounded-lg">{error}</p>}
                  <button type="submit" disabled={loading || otp.join('').length !== 4} className="w-full bg-gradient-to-r from-[#710000] to-[#520000] text-cream font-bold py-4 rounded-2xl hover:shadow-lg transition-all border border-[#910000]">
                    {loading ? 'Verifying...' : 'Reveal My Card'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" variants={fadeUp} initial="hidden" animate="visible" className="w-full max-w-md px-4 relative z-10 pt-12">
              <div className="text-center mb-8">
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#710000] mb-3">Happy Rakhi! 🎉</h2>
                <p className="text-gray-700 font-medium px-4">Your beautiful Rakhi Gift Card is ready to be shared with your sibling.</p>
              </div>

              {/* Shareable Card Wrapper - Exact Rakhi Style */}
              <div 
                ref={cardRef} 
                className="w-full aspect-[4/3] bg-gradient-to-br from-[#710000] via-[#520000] to-[#360000] rounded-3xl p-6 relative overflow-hidden shadow-2xl mb-6 text-left border border-red-900/30 flex flex-col justify-between"
              >
                {/* Rakhi Background Watermark */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen bg-center bg-cover" 
                  style={{ backgroundImage: `url(${rakhiBg})` }}
                />
                
                {/* Decorative glowing dots like the screenshot */}
                <div className="absolute bottom-2 right-2 w-24 h-24 grid grid-cols-3 gap-1 opacity-10 pointer-events-none">
                   {[...Array(9)].map((_, i) => <div key={i} className="w-full h-full rounded-full bg-gold"></div>)}
                </div>

                {/* Top Section */}
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-[10px] text-gold tracking-[0.15em] font-bold uppercase mb-1">POP O'BOB FESTIVE</p>
                    <h3 className="font-serif text-4xl font-medium text-cream tracking-wide">Gift Card</h3>
                    <p className="inline-block px-3 py-1 bg-[#3a0000]/60 text-gold border border-gold/40 text-[10px] font-bold tracking-[0.15em] uppercase rounded-full mt-2 shadow-sm backdrop-blur-sm">Rakhi Edition</p>
                  </div>
                  <Gift className="text-gold w-8 h-8" strokeWidth={1.5} />
                </div>
                
                {/* Middle Section: Recipient */}
                <div className="relative z-10">
                  <p className="text-cream/70 text-sm mb-1">For</p>
                  <p className="font-serif text-[28px] font-bold text-white tracking-wide leading-none">
                    {customerName || 'Boba Lover'}
                  </p>
                </div>

                {/* Bottom Section: Offer and Code */}
                <div className="flex justify-end items-end relative z-10 w-full mt-2">
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right bg-black/40 px-5 py-3 rounded-2xl backdrop-blur-md border border-white/10 w-full shadow-2xl">
                      <p className="text-cream/80 text-[11px] tracking-[0.25em] uppercase mb-1.5 font-bold">CARD CODE</p>
                      <p className="font-mono text-[22px] font-bold text-white tracking-widest leading-none drop-shadow-md">
                        {bogoCode || 'BOGO-XXXX'}
                      </p>
                    </div>
                    <p className="text-gold text-[8px] md:text-[9px] uppercase tracking-[0.15em] font-bold mr-2 text-right">Offer valid from 25th to 31st Aug</p>
                  </div>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#710000] to-[#520000] text-white px-5 py-2.5 rounded-full text-xs font-bold mb-8 shadow-md border border-[#910000]">
                <MapPin size={14} className="text-gold" /> Redeemable ONLY at Film Nagar Store
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button onClick={downloadCard} disabled={downloading} className="col-span-1 bg-white/80 backdrop-blur-md border border-gray-200 text-richBlack font-bold py-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 shadow-sm text-xs group">
                  <Download size={20} className="text-gray-400 group-hover:text-[#710000] transition-colors" /> {downloading ? 'Saving' : 'Save'}
                </button>
                <button onClick={shareToWhatsApp} disabled={sharing} className="col-span-1 bg-white/80 backdrop-blur-md border border-gray-200 text-richBlack font-bold py-4 rounded-2xl hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all flex flex-col items-center justify-center gap-1 shadow-sm text-xs group">
                  <Share2 size={20} className="text-[#25D366] group-hover:text-white transition-colors" /> {sharing ? '...' : 'WhatsApp'}
                </button>
                <button onClick={copyCode} className="col-span-1 bg-white/80 backdrop-blur-md border border-gray-200 text-richBlack font-bold py-4 rounded-2xl hover:bg-white hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 shadow-sm text-xs group">
                  {copied ? <><CheckCircle2 size={20} className="text-green-500"/> Copied</> : <><Copy size={20} className="text-gray-400 group-hover:text-[#710000] transition-colors"/> Copy</>}
                </button>
              </div>

              <div className="pb-8">
                <div className="mt-2 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider text-left">Terms & Conditions:</h4>
                  <ul className="text-xs text-gray-500 text-left list-disc pl-4 space-y-2">
                    <li>Offer valid only from 25th Aug to 31st Aug.</li>
                    <li>Offer cannot be clubbed with other offers.</li>
                    <li>Offer valid at Film Nagar store only.</li>
                    <li>You can choose any 2 products on the menu and billing will be for the higher priced product, the other product goes free.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
