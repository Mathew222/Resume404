import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, ArrowRight, FileText, Trash, FileType, AlertTriangle } from 'lucide-react';

interface RoastInputProps {
  onRoast: (content: string, mimeType: string) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE_MB = 2; // 2MB Limit
const MAX_CHARS = 20000; // ~4-5 pages single spaced

const RoastInput: React.FC<RoastInputProps> = ({ onRoast, isLoading }) => {
  const [text, setText] = useState('');
  const [fileData, setFileData] = useState<{ name: string; content: string; mimeType: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'text/plain',
      'text/markdown'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setError("INVALID FILE TYPE. ACCEPTED: PDF, WORD, TXT.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`FILE TOO LARGE. LIMIT: ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1];
          setFileData({
            name: file.name,
            content: base64,
            mimeType: 'application/pdf'
          });
          setText(''); 
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Dynamically import mammoth only when needed
        const mammoth = await import('mammoth');
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result.value.length > MAX_CHARS) {
            setError(`DOC TOO LONG (${result.value.length} chars). MAX: ${MAX_CHARS}.`);
            return;
          }
          setFileData({
            name: file.name,
            content: result.value,
            mimeType: 'text/plain' 
          });
          setText('');
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content.length > MAX_CHARS) {
             setError(`TEXT TOO LONG (${content.length} chars). MAX: ${MAX_CHARS}.`);
             return;
          }
          setFileData({
            name: file.name,
            content: content,
            mimeType: 'text/plain'
          });
          setText('');
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error("File processing error", err);
      setError("FILE CORRUPTED. JUST LIKE YOUR CAREER.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const clearFile = () => {
    setFileData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final Validation check
    if (!fileData && text.length > MAX_CHARS) {
      setError(`TEXT EXCEEDS LIMIT (${text.length}/${MAX_CHARS}).`);
      return;
    }
    
    if (fileData) {
      onRoast(fileData.content, fileData.mimeType);
    } else if (text.trim()) {
      onRoast(text, 'text/plain');
    }
  };

  const hasContent = !!fileData || !!text.trim();

  return (
    <div className="w-full">
      <div className="bg-white border-4 border-ink shadow-hard p-4 md:p-8 relative">
        {/* Form decorative staple */}
        <div className="absolute -top-3 left-4 md:left-8 w-4 h-12 bg-gray-400 border-2 border-ink rounded-full z-20 shadow-sm"></div>

        <div className="mb-6 md:mb-8 border-b-4 border-ink pb-4 border-dashed flex justify-between items-end">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-black uppercase text-ink leading-none">
              Evidence Submission
            </h2>
            <p className="font-mono text-[10px] md:text-xs font-bold uppercase text-alert mt-1">
              Accepted: PDF, DOCX, TXT (Max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
          <div className="font-mono text-[10px] md:text-xs font-bold border-2 border-ink px-2 bg-alert text-white hidden md:block">
            BIN: 000
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          
          {/* Error Banner */}
          {error && (
            <div className="bg-alert/10 border-2 border-alert p-3 flex items-center gap-3 animate-pulse" role="alert">
               <AlertTriangle className="text-alert w-5 h-5 shrink-0" aria-hidden="true" />
               <span className="text-alert font-bold text-xs md:text-sm uppercase font-mono">{error}</span>
            </div>
          )}
          
          {/* UPLOAD ZONE */}
          <div className="relative">
            <label className="block font-display text-base md:text-lg uppercase mb-2">
              1. Drop File
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.md,.pdf,.docx"
              className="hidden"
              aria-label="Upload Resume File"
            />

            {!fileData ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop your resume file here or click to upload"
                className={`
                  relative border-4 border-dashed border-ink p-6 md:p-10 text-center cursor-pointer transition-all
                  ${isDragging ? 'bg-alert text-white scale-[1.02]' : 'bg-paper hover:bg-gray-200'}
                `}
              >
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <div className="border-4 border-current p-3 md:p-4 rounded-full">
                     <Upload size={24} className="md:w-8 md:h-8" strokeWidth={3} />
                  </div>
                  <div>
                    <span className="block font-display font-black text-xl md:text-2xl uppercase">
                      Drag Resume Here
                    </span>
                    <span className="block font-mono text-[10px] md:text-xs font-bold uppercase mt-2 opacity-70">
                      Supports PDF, Word, Text
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-4 border-ink bg-paper-dark p-3 md:p-4 flex items-center justify-between shadow-hard-sm animate-fade-in-up">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="bg-ink text-white p-2 md:p-3 shrink-0">
                    <FileType size={20} className="md:w-6 md:h-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                     <div className="font-display font-black uppercase text-base md:text-lg leading-none truncate pr-4">{fileData.name}</div>
                     <div className="font-mono text-[10px] md:text-xs font-bold text-gray-600 uppercase mt-1">
                       Type: {fileData.mimeType === 'application/pdf' ? 'PDF' : 'TEXT/DOC'}
                     </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={clearFile}
                  className="shrink-0 bg-white border-2 border-ink p-1 md:p-2 hover:bg-alert hover:text-white hover:border-alert transition-colors"
                  title="Remove File"
                  aria-label="Remove uploaded file"
                >
                  <X size={16} className="md:w-5 md:h-5" strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-4 py-2 opacity-50">
            <div className="h-1 flex-grow bg-ink"></div>
            <span className="font-display font-black uppercase text-xs md:text-sm">OR PASTE TEXT</span>
            <div className="h-1 flex-grow bg-ink"></div>
          </div>

          {/* TEXT PASTE AREA */}
          <div className="relative">
             <div className="absolute top-2 right-2 text-[10px] font-mono font-bold text-gray-400 z-10 bg-gray-50 px-1">
               {text.length}/{MAX_CHARS}
             </div>
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                    setText(e.target.value);
                    if (e.target.value) setFileData(null); 
                }
              }}
              aria-label="Paste resume text manually"
              placeholder="PASTE TEXT MANUALLY HERE..."
              className="w-full h-24 md:h-32 bg-gray-50 border-4 border-ink p-3 md:p-4 font-mono text-xs md:text-sm leading-relaxed resize-y focus:outline-none focus:bg-white focus:border-alert transition-colors placeholder:text-gray-400"
              disabled={isLoading || !!fileData}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !hasContent || !!error}
            className={`w-full py-4 md:py-5 font-display font-black text-xl md:text-2xl uppercase tracking-widest border-4 border-ink transition-all relative overflow-hidden group
              ${isLoading || !hasContent || !!error
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-ink text-white hover:bg-alert shadow-hard hover:shadow-hard-lg hover:-translate-y-1'
              }`}
          >
            {/* Warning stripes on button hover */}
            <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMCwwLDAsMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMCAyMEwyMCAwIi8+PC9zdmc+')] opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            
            <span className="relative flex items-center justify-center gap-3 md:gap-4 z-10">
              EXECUTE JUDGMENT
              {!isLoading && hasContent && !error && <ArrowRight strokeWidth={4} className="w-5 h-5 md:w-6 md:h-6" />}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoastInput;