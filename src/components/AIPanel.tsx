import React, { useState, useRef } from 'react';
import { Transaction, Budget, ChatMessage, CATEGORIES } from '../types';
import {
  Sparkles,
  Send,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  FileText,
  Loader2,
  BrainCircuit,
  MessageSquare,
  BadgeAlert,
  ArrowRight,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

interface AIPanelProps {
  transactions: Transaction[];
  budgets: Budget[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export default function AIPanel({
  transactions,
  budgets,
  onAddTransaction,
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'scan'>('chat');
  
  // Natural Language & Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Halo! Saya **Asisten Keuangan Catat.in** bertenaga AI. 🙋‍♂️

Saya siap membantu Anda mengelola anggaran secara otomatis. Anda bisa:
1. **Mencatat cepat via ketikan teks**: Tulis saja seperti *"beli bensin pertamax di spbu 50rb sore ini"* atau *"gajian bulanan dapet 6 juta rupiah tadi pagi"*. Saya akan langsung mendeteksinya!
2. **Meminta analisis keuangan**: Tanyakan hal seperti *"Berapa pengeluaran makanku bulan ini?"* atau *"Berikan tips hemat anggaran bulanan"*.
3. **Membuat target**: *"Bagaimana sisa budget untuk belanja?"*

Bagaimana saya bisa membantu keuangan Anda hari ini?`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Scan Receipt states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [parsedReceipt, setParsedReceipt] = useState<Omit<Transaction, 'id'> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Currency Formatter
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Basic custom markdown parser to support formatting safely without extra libraries
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line;
      
      // Headers
      if (content.startsWith('### ')) {
        return <h4 key={lineIdx} className="text-xs font-bold text-earth mt-3 mb-1">{content.replace('### ', '')}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={lineIdx} className="text-sm font-bold text-earth mt-4 mb-1.5">{content.replace('## ', '')}</h3>;
      }
      if (content.startsWith('# ')) {
        return <h2 key={lineIdx} className="text-base font-bold text-earth mt-4 mb-2">{content.replace('# ', '')}</h2>;
      }

      // Bullet lists
      if (content.trim().startsWith('- ') || content.trim().startsWith('* ')) {
        const cleanLi = content.trim().substring(2);
        return (
          <ul key={lineIdx} className="list-disc pl-4 space-y-0.5 text-xs text-earth-light my-1">
            <li>{parseInlineFormatting(cleanLi)}</li>
          </ul>
        );
      }

      // Numbered lists
      const numMatch = content.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <ol key={lineIdx} className="list-decimal pl-4 space-y-0.5 text-xs text-earth-light my-1">
            <li value={parseInt(numMatch[1], 10)}>{parseInlineFormatting(numMatch[2])}</li>
          </ol>
        );
      }

      return (
        <p key={lineIdx} className="text-xs text-earth-light leading-relaxed mb-2">
          {parseInlineFormatting(content)}
        </p>
      );
    });
  };

  const parseInlineFormatting = (text: string) => {
    // Basic regex for strong/bold markdown
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-earth">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Send message to AI Advisor Chat
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    const newUserMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    scrollToBottom();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, newUserMessage],
          transactions,
          budgets,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: data.suggestedAction,
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'assistant',
        text: `⚠️ Maaf, asisten sedang mengalami kendala jaringan: **${err.message || 'Gagal tersambung ke server'}**.\n\nPastikan Anda telah memasukkan API Key di panel **Settings > Secrets** di Google AI Studio.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsChatLoading(false);
      scrollToBottom();
    }
  };

  // Trigger file select click
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  // Handle Drag over & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processSelectedImage(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedImage(file);
    }
  };

  const processSelectedImage = (file: File) => {
    setReceiptFile(file);
    setParsedReceipt(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send image to backend Gemini OCR Parse receipt
  const handleScanReceipt = async () => {
    if (!receiptFile || isScanLoading) return;

    setIsScanLoading(true);
    setScanStatus('Membaca file struk belanja...');

    const statuses = [
      'Memulai pemindaian OCR bertenaga AI...',
      'Membaca teks dari struk belanja...',
      'Mengekstrak nama toko/merchant...',
      'Menganalisis rincian barang belanjaan...',
      'Menghitung nominal akhir & pajak...',
      'Menentukan kategori transaksi terdekat...',
    ];

    let statusIdx = 0;
    const interval = setInterval(() => {
      if (statusIdx < statuses.length) {
        setScanStatus(statuses[statusIdx]);
        statusIdx++;
      }
    }, 1500);

    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error scan receipt');
      }

      const data = await response.json();
      setParsedReceipt(data);
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ Gagal memindai struk: ${err.message || 'Silakan coba lagi'}`);
    } finally {
      clearInterval(interval);
      setIsScanLoading(false);
      setScanStatus('');
    }
  };

  // Approve and Add AI Suggested Transaction
  const handleApproveSuggestedAction = (payload: Omit<Transaction, 'id'>, msgId: string) => {
    onAddTransaction(payload);
    // Remove the suggested action action flag to avoid double submission
    setChatMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, suggestedAction: undefined, text: m.text + '\n\n✅ *Transaksi berhasil ditambahkan ke catatan keuangan harian!*' };
      }
      return m;
    }));
  };

  const handleApproveParsedReceipt = () => {
    if (!parsedReceipt) return;
    onAddTransaction(parsedReceipt);
    setParsedReceipt(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    alert('✅ Struk belanja berhasil disimpan ke log keuangan harian!');
  };

  return (
    <div className="bg-white rounded-[32px] border border-border-warm shadow-sm overflow-hidden flex flex-col h-[520px]" id="ai_panel_container">
      {/* Header Tabs */}
      <div className="bg-sage px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-tan animate-pulse" />
          <h2 className="text-sm font-extrabold text-white tracking-tight">Catat otomatis bertenaga AI</h2>
        </div>
        
        {/* Toggle tabs */}
        <div className="flex bg-sage-dark/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'chat' ? 'bg-white text-sage shadow-sm' : 'text-sage-light hover:text-white'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Asisten Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'scan' ? 'bg-white text-sage shadow-sm' : 'text-sage-light hover:text-white'}`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Scan Struk</span>
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-1 overflow-hidden bg-cream relative flex flex-col">
        {activeTab === 'chat' ? (
          /* TAB 1: Chatbot & Text Assistant */
          <>
            {/* Message Feed list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat_messages_feed">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs ${msg.sender === 'user' ? 'bg-sage text-white rounded-tr-none' : 'bg-white text-earth border border-border-warm rounded-tl-none space-y-1'}`}
                  >
                    {msg.sender !== 'user' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-sage-dark uppercase tracking-widest mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ASISTEN CATAT.IN</span>
                      </div>
                    )}
                    
                    <div>
                      {msg.sender === 'user' ? <p>{msg.text}</p> : renderFormattedText(msg.text)}
                    </div>
                    
                    <span className={`text-[9px] block text-right mt-1.5 ${msg.sender === 'user' ? 'text-sage-light' : 'text-earth-light'}`}>
                      {msg.timestamp}
                    </span>

                    {/* Render Interactive Suggested Transaction Action if detected */}
                    {msg.sender === 'assistant' && msg.suggestedAction && (
                      <div className="mt-3 p-3 bg-tan-light/40 border border-border-warm rounded-xl space-y-2.5 animate-bounce-subtle">
                        <div className="flex items-center gap-1.5 text-sage-dark font-bold text-[10px]">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span>MENDETEKSI LOG TRANSAKSI</span>
                        </div>
                        <div className="space-y-1 text-earth">
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-earth text-xs">{msg.suggestedAction.payload.title}</span>
                            <span className="font-bold text-sage-dark font-mono text-xs">{formatIDR(msg.suggestedAction.payload.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-earth-light">
                            <span>Kategori: {msg.suggestedAction.payload.category}</span>
                            <span className="font-mono">{msg.suggestedAction.payload.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApproveSuggestedAction(msg.suggestedAction!.payload, msg.id)}
                            className="flex-1 py-1.5 bg-sage hover:bg-sage-dark text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Simpan Ke Log</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-earth border border-border-warm rounded-2xl p-4 rounded-tl-none max-w-[80%] shadow-sm flex items-center gap-2 text-xs">
                    <Loader2 className="w-4 h-4 text-sage animate-spin" />
                    <span className="text-earth-light font-medium">Asisten sedang mengetik analisis keuangan...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message input footer */}
            <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-border-warm flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Tulis transaksi (bensin 30rb) atau tanya 'saran hemat'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-cream-dark/50 border border-border-warm rounded-xl px-4 py-2.5 text-xs text-earth focus:outline-none transition-all"
                id="chat_input_field"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-sage hover:bg-sage-dark text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* TAB 2: Scan Receipt Image OCR */
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-earth">Scan Otomatis Struk Belanja</h3>
                <p className="text-[11px] text-earth-light leading-normal">
                  Kamera akan memindai nota fisik, mendeteksi nama merchant, total belanja, tanggal, hingga kategori belanjaan Anda secara instan.
                </p>
              </div>

              {/* Upload Drop Area */}
              {!receiptPreview ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={handleSelectFileClick}
                  className="border-2 border-dashed border-border-warm hover:border-sage hover:bg-sage-light/20 bg-white rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 h-56 group"
                >
                  <div className="w-12 h-12 bg-cream-dark rounded-2xl flex items-center justify-center text-sage group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-earth block">Tarik & Lepas Foto Struk</span>
                    <p className="text-[10px] text-earth-light">Atau klik untuk memilih file gambar (JPEG, PNG, WEBP)</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                /* Struk Selected / Preview and parsed details grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Image preview */}
                  <div className="relative border border-border-warm rounded-2xl overflow-hidden bg-cream-dark/30 aspect-[4/3] sm:aspect-auto sm:h-56">
                    <img src={receiptPreview} alt="Struk Preview" className="w-full h-full object-cover" />
                    
                    {!isScanLoading && !parsedReceipt && (
                      <button
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview(null);
                          setParsedReceipt(null);
                        }}
                        className="absolute right-2 top-2 w-8 h-8 bg-earth/80 hover:bg-earth text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Right Column: Dynamic Analysis State */}
                  <div className="bg-white rounded-2xl border border-border-warm p-4 flex flex-col justify-between min-h-56">
                    {isScanLoading ? (
                      /* Processing Loader spinner */
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                        <Loader2 className="w-8 h-8 text-sage animate-spin" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-earth block">Asisten AI sedang bekerja...</span>
                          <p className="text-[10px] text-sage font-semibold animate-pulse">{scanStatus}</p>
                        </div>
                      </div>
                    ) : parsedReceipt ? (
                      /* Parsed receipt outputs view */
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-1.5 text-sage font-bold text-[10px] border-b border-border-warm pb-2">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          <span>HASIL PEMINDAIAN STRUK AI</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-baseline justify-between">
                            <span className="text-earth-light uppercase text-[9px] font-bold">Merchant:</span>
                            <span className="font-bold text-earth">{parsedReceipt.title}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-earth-light uppercase text-[9px] font-bold">Total Belanja:</span>
                            <span className="font-bold text-rose-600 font-mono">{formatIDR(parsedReceipt.amount)}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-earth-light uppercase text-[9px] font-bold">Kategori:</span>
                            <span className="font-semibold text-earth">{parsedReceipt.category}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-earth-light uppercase text-[9px] font-bold">Tanggal:</span>
                            <span className="font-mono text-earth">{parsedReceipt.date}</span>
                          </div>
                          {parsedReceipt.notes && (
                            <div className="space-y-0.5">
                              <span className="text-earth-light uppercase text-[9px] font-bold block">Detail Item:</span>
                              <p className="text-[10px] bg-cream-dark/50 p-2 rounded-lg text-earth border border-border-warm">{parsedReceipt.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Idle state before Scanning starts */
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
                        <FileText className="w-10 h-10 text-earth-light stroke-1" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-earth">Foto Struk Siap</span>
                          <p className="text-[10px] text-earth-light">Tekan tombol di bawah untuk mulai memindai otomatis</p>
                        </div>
                      </div>
                    )}

                    {/* Bottom scanning execution action trigger */}
                    {!isScanLoading && (
                      <div className="pt-2">
                        {parsedReceipt ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setParsedReceipt(null);
                                setReceiptFile(null);
                                setReceiptPreview(null);
                              }}
                              className="flex-1 py-2.5 border border-border-warm hover:bg-cream-dark/50 text-earth-light rounded-xl text-xs font-bold transition-colors"
                            >
                              Ulangi
                            </button>
                            <button
                              onClick={handleApproveParsedReceipt}
                              className="flex-1 py-2.5 bg-sage hover:bg-sage-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-sage/10"
                            >
                              <Check className="w-4 h-4" />
                              <span>Simpan Log</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleScanReceipt}
                            disabled={!receiptFile}
                            className="w-full py-3 bg-sage hover:bg-sage-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sage/10"
                          >
                            <Sparkles className="w-4 h-4 animate-pulse" />
                            <span>Mulai Scan Struk Belanja</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips label at the bottom */}
            <div className="bg-tan-light/40 border border-border-warm p-3.5 rounded-2xl flex items-start gap-2.5 shrink-0 mt-auto">
              <BrainCircuit className="w-4.5 h-4.5 text-sage shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-earth block uppercase tracking-wide">Tips Scan AI</span>
                <p className="text-[10px] text-earth-light leading-normal">
                  Pastikan foto struk memiliki pencahayaan cukup, tegak lurus, dan tulisan nominal total transaksi terlihat dengan jelas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
