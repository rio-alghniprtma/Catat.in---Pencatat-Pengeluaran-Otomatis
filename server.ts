import express from 'express';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up memory storage for multer (no local file writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

app.use(express.json());

// Initialize Gemini client lazy-style
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please configure it in your Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API Endpoint 1: Parse Text (Natural Language Expense Input)
app.post('/api/parse-text', async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text input is required' });
    }

    const ai = getAiClient();
    const today = currentDate || new Date().toISOString().split('T')[0];

    const prompt = `Analisis teks berikut untuk mencatat pengeluaran atau pemasukan secara otomatis:
"${text}"

Ekstrak detail transaksi sesuai dengan schema JSON yang diberikan.
Aturan Kategori:
- Gunakan salah satu dari kategori berikut: 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan & Utilitas', 'Kesehatan', 'Investasi & Tabungan', 'Lainnya'.
- Tanggal hari ini adalah: ${today}. Jika tidak ada penyebutan tanggal spesifik (seperti kemarin, minggu lalu, lusa, dll), gunakan tanggal hari ini.
- Jumlah uang (amount) harus angka positif utuh (integer).
- Tipe harus 'expense' jika pengeluaran/pembayaran, atau 'income' jika pemasukan/gaji/menerima uang.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Anda adalah sistem ekstraksi data transaksi keuangan Indonesia yang akurat. Format response harus selalu JSON yang sesuai dengan schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Nama barang, jasa, merchant, atau sumber dana yang ringkas dan informatif (contoh: "Kopi Kenangan", "Gojek", "Gaji Bulanan", "Listrik PLN").'
            },
            amount: {
              type: Type.INTEGER,
              description: 'Jumlah nominal uang dalam Rupiah. Selalu bernilai positif.'
            },
            category: {
              type: Type.STRING,
              description: 'Kategori pengeluaran/pemasukan. Harus salah satu dari: "Makanan & Minuman", "Transportasi", "Belanja", "Hiburan", "Tagihan & Utilitas", "Kesehatan", "Investasi & Tabungan", "Lainnya".'
            },
            date: {
              type: Type.STRING,
              description: 'Tanggal transaksi dalam format YYYY-MM-DD.'
            },
            type: {
              type: Type.STRING,
              description: 'Tipe transaksi: "expense" atau "income".'
            },
            notes: {
              type: Type.STRING,
              description: 'Catatan tambahan jika ada informasi berguna lainnya.'
            }
          },
          required: ['title', 'amount', 'category', 'date', 'type']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini');
    }

    const parsedData = JSON.parse(resultText.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/parse-text:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses teks' });
  }
});

// API Endpoint 2: Parse Receipt Image
app.post('/api/parse-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image file is required' });
    }

    const ai = getAiClient();
    const today = new Date().toISOString().split('T')[0];

    const imagePart = {
      inlineData: {
        mimeType: req.file.mimetype,
        data: req.file.buffer.toString('base64'),
      },
    };

    const prompt = `Analisis struk/nota/receipt belanja ini untuk mendeteksi transaksi pengeluaran.
Ekstrak detail struk menjadi format JSON sesuai dengan schema yang diberikan.

Aturan Ekstraksi:
1. "title": Gunakan nama merchant/toko atau ringkasan barang utama yang dibeli (contoh: "Indomaret", "Pertamina", "Starbucks").
2. "amount": Cari total akhir yang dibayarkan (Grand Total / Total Belanja). Jika ada diskon, pastikan itu adalah nominal setelah diskon. Harus angka bulat positif.
3. "category": Tentukan kategori yang paling cocok: 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan & Utilitas', 'Kesehatan', 'Investasi & Tabungan', 'Lainnya'.
4. "date": Cari tanggal transaksi pada struk. Format menjadi YYYY-MM-DD. Jika tanggal struk tidak terbaca atau tidak ada, gunakan tanggal hari ini: ${today}.
5. "type": Selalu bernilai "expense" untuk struk belanja.
6. "notes": Cantumkan beberapa item barang yang dibeli (misal: "Beli susu, roti, sabun") untuk catatan tambahan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [imagePart, prompt],
      config: {
        systemInstruction: 'Anda adalah OCR scanner struk belanja Indonesia pintar yang akurat mengonversi gambar struk menjadi data transaksi finansial terstruktur.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Nama merchant atau toko dari struk belanja (contoh: "Alfamart", "SPBU Shell", "Kopi Nako").'
            },
            amount: {
              type: Type.INTEGER,
              description: 'Total pengeluaran akhir dalam Rupiah.'
            },
            category: {
              type: Type.STRING,
              description: 'Kategori pengeluaran. Harus salah satu dari: "Makanan & Minuman", "Transportasi", "Belanja", "Hiburan", "Tagihan & Utilitas", "Kesehatan", "Investasi & Tabungan", "Lainnya".'
            },
            date: {
              type: Type.STRING,
              description: 'Tanggal transaksi dari struk (format: YYYY-MM-DD).'
            },
            type: {
              type: Type.STRING,
              description: 'Tipe transaksi, selalu "expense" untuk struk belanja.'
            },
            notes: {
              type: Type.STRING,
              description: 'Rincian item belanja singkat jika ada.'
            }
          },
          required: ['title', 'amount', 'category', 'date', 'type']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini for receipt');
    }

    const parsedData = JSON.parse(resultText.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/parse-receipt:', error);
    res.status(500).json({ error: error.message || 'Gagal menganalisis struk belanja' });
  }
});

// API Endpoint 3: Financial AI Advisory Chat
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, transactions, budgets } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages history is required' });
    }

    const ai = getAiClient();

    // Compile financial context for the assistant
    const transactionContext = transactions && transactions.length > 0
      ? transactions.map((t: any) => `- ${t.date} | [${t.type.toUpperCase()}] ${t.title} (${t.category}) : Rp ${t.amount.toLocaleString('id-ID')}${t.notes ? ' - ' + t.notes : ''}`).join('\n')
      : 'Belum ada transaksi tercatat.';

    const budgetContext = budgets && budgets.length > 0
      ? budgets.map((b: any) => `- Kategori ${b.category}: Limit bulanan Rp ${b.limit.toLocaleString('id-ID')}`).join('\n')
      : 'Belum ada limit budget yang diatur.';

    // Construct history with system instruction embedded in chat context
    const formattedHistory = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Find the last user message to feed into the conversation
    const lastUserMessage = messages[messages.length - 1]?.text || 'Halo';

    const systemInstruction = `Anda adalah "Asisten Keuangan Personal Catat.in" yang cerdas, ramah, dan profesional.
Tugas Anda adalah membantu pengguna mengelola keuangan harian mereka, menganalisis pengeluaran, memberikan tips hemat yang relevan, dan membantu mencatat transaksi baru melalui chat.

Gunakan data keuangan riil pengguna saat ini untuk menjawab pertanyaan mereka:

--- DATA TRANSAKSI SAAT INI ---
${transactionContext}

--- TARGET BUDGET SAAT INI ---
${budgetContext}

Instruksi Tambahan:
- Berikan saran yang konkret, mudah dipahami, dan ramah gaya Indonesia.
- Format nominal uang selalu menggunakan standar Rupiah (Rp X.XXX.XXX).
- Gunakan Markdown untuk format teks agar rapi (bold, list, header, dll).
- JIKA pengguna ingin mencatat transaksi baru secara eksplisit lewat chat (contoh: "Tolong catat beli roti 15rb" atau "tambahkan pemasukan bonus 500rb"), Anda harus:
  1. Jawab konfirmasi dengan ramah bahwa Anda akan membantunya mencatat.
  2. Di akhir teks Anda, sebutkan detail transaksi tersebut secara jelas.
  3. Kembalikan respons dalam format terstruktur sehingga sistem dapat menyarankan aksi pencatatan otomatis di UI (Sistem akan menangkap prompt ini).`;

    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    // Populate previous message history (excluding the very last message we are about to send)
    const historyToLoad = formattedHistory.slice(0, -1);
    // Since the chats.create in @google/genai lets you send messages sequentially or pass history:
    // We can just query with the last message. If there is history, we can initialize chat with history.
    // In @google/genai SDK, chats can take history in config:
    // Or we can just build a single generateContent call with history. Let's build a single generateContent call
    // since it is simpler and extremely robust!
    
    // Constructing a single conversation prompt
    const chatPrompt = `Berikut adalah percakapan sebelumnya antara Pengguna (user) dan Asisten (model):
${historyToLoad.map((h: any) => `${h.role === 'user' ? 'User' : 'Asisten'}: ${h.parts[0].text}`).join('\n')}

User: ${lastUserMessage}

Asisten:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: chatPrompt,
      config: {
        systemInstruction,
      }
    });

    const replyText = response.text;
    if (!replyText) {
      throw new Error('No reply text generated');
    }

    // Now, let's also detect if there's an intent to add a transaction in the reply,
    // and optionally attach a structured suggestedAction.
    // We can do a quick sub-check using a lightweight extraction prompt OR regex,
    // but a reliable way is to ask the model or parse the reply. Let's do a quick regex check or a second fast call
    // if the assistant explicitly says "mencatat" or "dicatat" to make it magical!
    // Let's analyze if the assistant suggested adding a transaction.
    let suggestedAction = null;

    if (
      lastUserMessage.toLowerCase().includes('catat') ||
      lastUserMessage.toLowerCase().includes('tambah') ||
      lastUserMessage.toLowerCase().includes('beli') ||
      lastUserMessage.toLowerCase().includes('gajian') ||
      lastUserMessage.toLowerCase().includes('bayar')
    ) {
      // Let's do a fast extraction with Gemini of what transaction was requested
      try {
        const extractionPrompt = `Dari pesan pengguna ini: "${lastUserMessage}"
Ekstrak transaksi keuangan (jika ada). Jika pengguna bermaksud menambahkan transaksi pengeluaran/pemasukan baru, buatkan objek JSON transaksi. Jika tidak ada niat menambahkan transaksi baru, kembalikan objek kosong {}.
Hari ini tanggal: ${new Date().toISOString().split('T')[0]}.

Kembalikan format JSON:
{
  "hasTransaction": boolean,
  "transaction": {
    "title": string,
    "amount": number,
    "category": string,
    "date": string,
    "type": "expense" | "income",
    "notes": string
  }
}`;

        const extractResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: extractionPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                hasTransaction: { type: Type.BOOLEAN },
                transaction: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    amount: { type: Type.INTEGER },
                    category: { type: Type.STRING },
                    date: { type: Type.STRING },
                    type: { type: Type.STRING },
                    notes: { type: Type.STRING }
                  },
                  required: ['title', 'amount', 'category', 'date', 'type']
                }
              },
              required: ['hasTransaction']
            }
          }
        });

        const extractionResult = JSON.parse(extractResponse.text || '{}');
        if (extractionResult.hasTransaction && extractionResult.transaction) {
          suggestedAction = {
            type: 'ADD_TRANSACTION' as const,
            payload: extractionResult.transaction
          };
        }
      } catch (err) {
        console.error('Failed to extract suggested action from message', err);
      }
    }

    res.json({
      text: replyText,
      suggestedAction
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Asisten sedang sibuk' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
