import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { LoadingState } from '../types';
import { Trash2, MessageSquare, Skull, RefreshCw, Volume2, Square, Tv, TrendingUp, Gem, Hammer, CheckCircle, Download, FileCode, FileText } from 'lucide-react';
import { fixResume, FixedResumeData } from '../services/geminiService';

interface RoastOutputProps {
  roast: string;
  originalContent: string;
  originalMimeType: string;
  loadingState: LoadingState;
  onReset: () => void;
}

// Reliable, static meme images
const MEME_IMAGES = [
  "https://i.imgflip.com/4t0m5.jpg", // Spongebob Ight Imma head out
  "https://i.imgflip.com/1jwhww.jpg", // Facepalm Picard
  "https://i.imgflip.com/26am.jpg", // Aliens guy
  "https://i.imgflip.com/9ehk.jpg", // Disaster Girl
  "https://i.imgflip.com/1h7in3.jpg", // Mocking Spongebob
  "https://i.imgflip.com/345v97.jpg", // Woman yelling at cat
  "https://i.imgflip.com/261o3j.jpg", // Bernie I am once again asking
  "https://i.imgflip.com/1otk96.jpg", // Distracted boyfriend
];

const RoastOutput: React.FC<RoastOutputProps> = ({ roast, originalContent, originalMimeType, loadingState, onReset }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [randomMeme, setRandomMeme] = useState<string>("");
  const [atsScore, setAtsScore] = useState<number>(0);
  
  // Fix Resume States
  const [isFixing, setIsFixing] = useState(false);
  const [fixedData, setFixedData] = useState<FixedResumeData | null>(null);

  useEffect(() => {
    // Select a random meme reaction on mount
    const meme = MEME_IMAGES[Math.floor(Math.random() * MEME_IMAGES.length)];
    setRandomMeme(meme);
  }, []);

  // Extract ATS Score whenever roast updates
  useEffect(() => {
    const match = roast.match(/ATS SCORE:\s*(\d+)/i);
    if (match && match[1]) {
      setAtsScore(parseInt(match[1], 10));
    }
  }, [roast]);

  if (loadingState === LoadingState.IDLE) return null;

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsSpeaking(false);
      return;
    }

    // CLEANUP TEXT for TTS
    const cleanText = roast
      .replace(/#/g, '')
      .replace(/\*/g, '')
      .replace(/>/g, '')
      .replace(/-/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/ATS SCORE: \d+/g, '') // Don't read the score metadata abruptly
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // VOICE SELECTION
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Zira") || 
      v.name.includes("Samantha")
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.pitch = 0.9;
    utterance.rate = 1.0;

    // Background Audio
    const audio = new Audio('https://actions.google.com/sounds/v1/crowds/crowd_jeer.ogg');
    audio.volume = 0.3;
    audio.loop = true;
    audioRef.current = audio;

    utterance.onstart = () => {
      audio.play().catch(e => console.log("Audio play failed", e));
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      audio.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      audio.pause();
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const getAtsColor = (score: number) => {
    if (score < 30) return 'bg-alert';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // --- REPAIR LOGIC ---
  const handleFixResume = async () => {
    setIsFixing(true);
    try {
      const data = await fixResume(originalContent, originalMimeType); 
      setFixedData(data);
      generateAndDownloadPDF(data);
    } catch (e) {
      console.error(e);
      alert("Failed to build resume. The damage was too great.");
    } finally {
      setIsFixing(false);
    }
  };

  const generateAndDownloadPDF = (data: FixedResumeData) => {
    const doc = new jsPDF();
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    // Helper to add new page if needed
    const checkPageBreak = (spaceNeeded: number) => {
      if (y + spaceNeeded > 280) {
        doc.addPage();
        y = 20;
      }
    };

    // --- HEADER ---
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.text(data.pdfContent.header.name.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 8;

    if (data.pdfContent.header.title) {
        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        doc.text(data.pdfContent.header.title, pageWidth / 2, y, { align: 'center' });
        y += 7;
    }

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(data.pdfContent.header.contact, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // --- SECTIONS ---
    
    // Summary
    if (data.pdfContent.summary) {
        checkPageBreak(30);
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Summary", pageWidth / 2, y, { align: 'center' });
        y += 2;
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        doc.setFont("times", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(data.pdfContent.summary, contentWidth);
        doc.text(lines, margin, y);
        y += (lines.length * 5) + 8;
    }

    // Skills
    if (data.pdfContent.skills) {
        checkPageBreak(30);
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Skills", pageWidth / 2, y, { align: 'center' });
        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;

        doc.setFont("times", "normal");
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(data.pdfContent.skills, contentWidth);
        doc.text(lines, pageWidth / 2, y, { align: 'center' });
        y += (lines.length * 5) + 8;
    }

    // Experience
    if (data.pdfContent.experience && data.pdfContent.experience.length > 0) {
        checkPageBreak(30);
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Experience", pageWidth / 2, y, { align: 'center' });
        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        data.pdfContent.experience.forEach(exp => {
            checkPageBreak(25 + (exp.bullets.length * 5));
            
            // Company & Location
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text(exp.company, margin, y);
            
            doc.setFont("times", "normal");
            doc.text(exp.location, pageWidth - margin, y, { align: 'right' });
            y += 5;

            // Role & Date
            doc.setFont("times", "italic");
            doc.text(exp.role, margin, y);
            
            doc.setFont("times", "normal");
            doc.text(exp.date, pageWidth - margin, y, { align: 'right' });
            y += 6;

            // Bullets
            doc.setFontSize(10);
            exp.bullets.forEach(bullet => {
                const bulletText = `• ${bullet}`;
                const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 5);
                doc.text(bulletLines, margin + 5, y);
                y += (bulletLines.length * 5);
            });
            y += 4;
        });
        y += 4;
    }

    // Education
    if (data.pdfContent.education && data.pdfContent.education.length > 0) {
        checkPageBreak(30);
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Education", pageWidth / 2, y, { align: 'center' });
        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        data.pdfContent.education.forEach(edu => {
            checkPageBreak(15);
            
            // School & Location
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text(edu.school, margin, y);
            
            doc.setFont("times", "normal");
            doc.text(edu.location, pageWidth - margin, y, { align: 'right' });
            y += 5;

            // Degree & Date
            doc.setFont("times", "italic");
            doc.text(edu.degree, margin, y);
            
            doc.setFont("times", "normal");
            doc.text(edu.date, pageWidth - margin, y, { align: 'right' });
            y += 8;
        });
    }

    // Languages (Optional)
    if (data.pdfContent.languages) {
        checkPageBreak(20);
        y += 4;
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Languages", pageWidth / 2, y, { align: 'center' });
        y += 2;
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
        
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.text(data.pdfContent.languages, pageWidth / 2, y, { align: 'center' });
    }

    doc.save("Fixed_Resume_WilliamDavis_Style.pdf");
  };

  const downloadLatex = () => {
    if (!fixedData) return;
    const blob = new Blob([fixedData.latex], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "resume_overleaf_source.tex";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full animate-fade-in-up pb-20">
      <div className="bg-paper border-4 border-ink shadow-hard relative overflow-hidden w-full">
        
        {/* "ROASTED" STAMP */}
        <div className="absolute top-20 right-2 md:top-24 md:right-10 z-30 pointer-events-none opacity-90 transform rotate-12 animate-pulse">
          <div className="border-4 md:border-8 border-alert p-1 md:p-4 rounded-sm mix-blend-multiply bg-alert/10 backdrop-blur-sm">
            <div className="text-alert font-display font-black text-2xl md:text-6xl uppercase tracking-tighter stamped border-2 md:border-4 border-alert px-2 md:px-4 py-1 md:py-2">
              COOKED
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-ink text-white p-3 md:p-4 flex justify-between items-center border-b-4 border-ink relative z-40">
          <h2 className="font-display uppercase text-lg md:text-xl tracking-widest flex items-center gap-2">
            <Skull size={20} className="text-alert md:w-6 md:h-6" />
            DAMAGE REPORT
          </h2>
          
          <div className="flex items-center gap-3">
             <button
                onClick={handleSpeak}
                className={`flex items-center gap-2 px-3 py-1 border border-white font-mono text-[10px] md:text-xs font-bold uppercase transition-colors
                  ${isSpeaking ? 'bg-alert text-white animate-pulse' : 'bg-paper text-ink hover:bg-gray-200'}`}
             >
                {isSpeaking ? <Square size={14} /> : <Volume2 size={14} />}
                {isSpeaking ? 'STOP' : 'READ ALOUD'}
             </button>

             <button 
               onClick={onReset}
               className="bg-paper text-ink p-1 md:p-2 border border-white hover:bg-alert hover:text-white transition-colors"
               title="Restart"
             >
               <RefreshCw size={14} className="md:w-4 md:h-4" strokeWidth={3} />
             </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 md:p-12 font-mono text-ink relative z-10 custom-scrollbar bg-gray-50 min-h-[60vh]">
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 opacity-40 pointer-events-none z-0 fixed-bg" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}></div>

          <div className="relative z-10 space-y-8 w-full">
              
              {/* LIVE REACTION MEME WIDGET */}
              <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-8">
                {/* Meme */}
                <div className="bg-ink p-2 pb-6 border-4 border-ink transform -rotate-2 shadow-hard w-[200px] md:w-[250px] shrink-0">
                    <div className="bg-alert text-white font-display text-xs uppercase px-2 py-1 mb-2 flex items-center gap-2">
                        <Tv size={12} /> Live Reaction
                    </div>
                    {randomMeme && <img src={randomMeme} alt="Live Reaction Meme" className="w-full h-auto border-2 border-white/20 grayscale hover:grayscale-0 transition-all" />}
                </div>

                {/* ATS Score Card */}
                {atsScore > 0 && (
                   <div className="bg-white border-4 border-ink p-4 md:p-6 shadow-hard-lg transform rotate-1 w-full max-w-sm">
                      <div className="flex items-center gap-2 mb-2 border-b-2 border-ink pb-2">
                        <TrendingUp size={20} className="text-ink" />
                        <span className="font-display font-black uppercase text-lg">ATS Score</span>
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className={`text-6xl font-display font-black leading-none ${atsScore < 30 ? 'text-alert' : atsScore < 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {atsScore}
                        </span>
                        <span className="font-mono text-xl font-bold text-gray-400 mb-1">/100</span>
                      </div>
                      <div className="w-full h-4 bg-gray-200 border-2 border-ink rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${getAtsColor(atsScore)}`} 
                          style={{ width: `${atsScore}%` }}
                        ></div>
                      </div>
                      <p className="font-mono text-xs font-bold uppercase mt-2 text-gray-500">
                        {atsScore < 30 ? "UNHIREABLE GARBAGE" : atsScore < 70 ? "MID AT BEST" : "ACTUALLY DECENT?"}
                      </p>
                   </div>
                )}
              </div>

              <ReactMarkdown
                components={{
                  // Main Verdict Title
                  h1: ({node, ...props}) => (
                    <div className="bg-ink text-white p-4 md:p-8 border-4 border-alert shadow-hard mb-8 md:mb-12 transform -rotate-1 relative group">
                      <div className="absolute -inset-1 bg-alert/20 transform rotate-2 -z-10 group-hover:rotate-0 transition-transform"></div>
                      <h1 className="text-3xl md:text-6xl font-display font-black uppercase leading-none text-center text-alert" {...props} />
                    </div>
                  ),
                  // Section Headers
                  h2: ({node, ...props}) => {
                    const text = props.children?.toString() || "";
                    if (text.includes("ATS SCORE")) return null; // Hide default ATS header to rely on our custom widget
                    
                    return (
                      <div className="mt-12 md:mt-16 mb-6 md:mb-8">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 md:h-6 flex-grow bg-alert/20 border-t-4 border-b-4 border-alert bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48cGF0aCBkPSJNMTAgMEwwIDEwVjBIMTB6IiBmaWxsPSIjZmYyYTAwIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')]"></div>
                          <h2 className="bg-ink text-white px-4 md:px-8 py-2 md:py-3 font-display font-black uppercase text-xl md:text-3xl transform skew-x-[-10deg] shadow-hard-sm whitespace-nowrap" {...props} />
                          <div className="h-4 md:h-6 flex-grow bg-alert/20 border-t-4 border-b-4 border-alert bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48cGF0aCBkPSJNMTAgMEwwIDEwVjBIMTB6IiBmaWxsPSIjZmYyYTAwIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')]"></div>
                        </div>
                      </div>
                    )
                  },
                  // Sub-headers
                  h3: ({node, ...props}) => (
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-widest mt-6 md:mt-8 mb-4 border-l-[6px] border-alert pl-4 text-ink inline-block bg-alert/5 pr-4 py-1" {...props} />
                  ),
                  // Meme Quotes / Hater Comments
                  blockquote: ({node, ...props}) => (
                    <div className="my-8 md:my-10 relative pl-2 md:pl-0 transform rotate-1">
                      <div className="bg-white border-4 border-ink p-4 md:p-6 shadow-hard-sm relative">
                          <div className="absolute -top-3 md:-top-4 -left-2 bg-alert text-white px-2 md:px-3 py-1 text-[10px] md:text-xs font-black uppercase border-2 border-ink transform -rotate-3 z-10">
                            Recruiter's Inner Monologue
                          </div>
                          <MessageSquare className="absolute -right-2 md:-right-4 -top-2 md:-top-4 text-ink bg-paper p-1 md:p-2 border-2 border-ink w-8 h-8 md:w-12 md:h-12 transform rotate-12" />
                          <blockquote className="font-hand text-xl md:text-3xl text-ink font-bold leading-snug" {...props} />
                      </div>
                    </div>
                  ),
                  p: ({node, ...props}) => (
                    <p className="mb-4 md:mb-6 font-mono text-base md:text-lg font-medium text-ink leading-relaxed" {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul className="space-y-3 md:space-y-4 my-4 md:my-6 pl-1 md:pl-2" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="flex items-start gap-3 md:gap-4 text-base md:text-lg">
                      <span className="shrink-0 mt-1.5 w-3 h-3 md:w-4 md:h-4 bg-alert border-2 border-ink"></span>
                      <span className="font-medium" {...props} />
                    </li>
                  ),
                  hr: ({node, ...props}) => (
                      <div className="my-12 md:my-16 h-8 md:h-10 bg-yellow-300 border-y-4 border-ink flex items-center justify-center overflow-hidden transform -skew-y-2">
                        <div className="whitespace-nowrap font-display font-black text-ink uppercase tracking-widest animate-marquee text-xs md:text-sm">
                            CRIME SCENE DO NOT CROSS /// EMOTIONAL DAMAGE DETECTED /// SKILL ISSUE FOUND /// CRIME SCENE DO NOT CROSS ///
                        </div>
                      </div>
                  ),
                  strong: ({node, ...props}) => (
                    <strong className="text-alert-dark font-black bg-alert/20 px-1 rounded-sm border-b-2 border-alert" {...props} />
                  ),
                  em: ({node, ...props}) => (
                    <em className="font-hand text-lg md:text-xl font-bold text-gray-600 not-italic border-b border-gray-400" {...props} />
                  )
                }}
              >
                {roast}
              </ReactMarkdown>
          </div>
        </div>

        {/* --- PREMIUM UPSELL SECTION (Now Functional) --- */}
        <div className="relative z-20 -mt-8 mx-2 md:mx-12 mb-12">
           <div className="bg-[#121212] border-4 border-yellow-400 p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(250,204,21,1)] text-white relative overflow-hidden group">
              {/* Shine effect */}
              <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:animate-[shimmer_2s_infinite]"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                 <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 font-bold text-xs uppercase tracking-widest mb-3">
                       <Gem size={14} /> Premium Rescue
                    </div>
                    <h3 className="font-display font-black text-2xl md:text-4xl uppercase leading-none mb-2 text-yellow-400">
                       Stop Being Unemployed
                    </h3>
                    <p className="font-mono text-gray-400 text-sm md:text-base max-w-lg">
                       Get a professional, ATS-optimized rewrite of your resume. Includes PDF and LaTeX (Overleaf) source code.
                    </p>
                    <ul className="mt-4 space-y-2 font-mono text-xs md:text-sm text-gray-300 text-left inline-block">
                       <li className="flex items-center gap-2"><CheckCircle size={14} className="text-yellow-400" /> Auto-Generated PDF</li>
                       <li className="flex items-center gap-2"><CheckCircle size={14} className="text-yellow-400" /> Overleaf LaTeX Source</li>
                       <li className="flex items-center gap-2"><CheckCircle size={14} className="text-yellow-400" /> 100% Aura Increase</li>
                    </ul>
                 </div>
                 
                 <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                    {!fixedData ? (
                        <button 
                          onClick={handleFixResume}
                          disabled={isFixing}
                          className="bg-yellow-400 text-black font-display font-black text-xl px-8 py-4 uppercase tracking-widest hover:bg-white transition-colors border-4 border-transparent hover:border-yellow-400 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                        >
                          {isFixing ? (
                            <>
                               <RefreshCw className="animate-spin" size={24} /> Building...
                            </>
                          ) : (
                            <>
                               <Hammer size={24} />
                               Fix My Resume ($49)
                            </>
                          )}
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2 animate-fade-in-up">
                            <button 
                              onClick={() => generateAndDownloadPDF(fixedData)}
                              className="bg-green-500 text-white font-display font-black text-sm px-4 py-2 uppercase tracking-widest hover:bg-green-600 transition-colors border-2 border-transparent flex items-center justify-center gap-2"
                            >
                               <FileText size={16} /> Download PDF
                            </button>
                            <button 
                              onClick={downloadLatex}
                              className="bg-gray-800 text-white font-display font-black text-sm px-4 py-2 uppercase tracking-widest hover:bg-gray-700 transition-colors border-2 border-transparent flex items-center justify-center gap-2"
                            >
                               <FileCode size={16} /> Download LaTeX
                            </button>
                        </div>
                    )}
                    
                    <p className="text-center text-[10px] font-mono uppercase text-gray-500">
                       {fixedData ? "Your career is saved." : "Money back guarantee (if you survive)"}
                    </p>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Footer Actions */}
        <div className="border-t-4 border-ink p-4 md:p-6 bg-paper flex justify-center z-20 relative">
          <button 
            onClick={onReset}
            className="flex items-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 bg-white text-ink font-display font-bold uppercase text-lg md:text-xl border-4 border-ink hover:bg-alert hover:text-white transition-all hover:shadow-hard-reverse group"
          >
            <Trash2 size={20} className="group-hover:animate-bounce md:w-6 md:h-6" />
            <span>Burn It & Restart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoastOutput;