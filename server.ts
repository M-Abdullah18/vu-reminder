import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Configure body-parser limit to handle high-res screenshots and multi-page PDFs
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize GoogleGenAI server-side with telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Extraction JSON Schema
const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      description: 'List of academic tasks, assignments, quizzes, GDBs, exams, or announcements extracted from the document or screenshot.',
      items: {
        type: Type.OBJECT,
        properties: {
          courseCode: {
            type: Type.STRING,
            description: "Course code e.g., 'CS504', 'ENG101', 'MTH302', 'CS601'. Output 'Unknown Course' if not found. Do NOT invent codes.",
          },
          courseName: {
            type: Type.STRING,
            description: "Course title e.g. 'Software Engineering - I', 'General Mathematics'. Empty string if not found.",
          },
          activityType: {
            type: Type.STRING,
            description: "Activity category: 'Assignment', 'Quiz', 'GDB', 'Exam', 'Announcement', or 'Other'",
          },
          title: {
            type: Type.STRING,
            description: "Official title or name of the activity e.g. 'Assignment No. 1', 'Quiz # 2', 'Graded Discussion Board 1', 'Midterm Examination'",
          },
          instructions: {
            type: Type.STRING,
            description: 'Key instructions, submission guidelines (.doc, .cpp), syllabus coverage (e.g. Lectures 1 to 12), or notice details.',
          },
          rawDeadlineText: {
            type: Type.STRING,
            description: "Verbatim text snippet of the deadline found in the document, e.g. 'Due Date: Nov 15, 2026 11:59 PM', or 'Deadline unknown'.",
          },
          isoDeadline: {
            type: Type.STRING,
            description: "Normalized ISO 8601 string in Pakistan Standard Time (UTC+5, e.g. '2026-11-15T23:59:00+05:00'). Empty string if deadline is unknown.",
          },
          deadlineStatus: {
            type: Type.STRING,
            description: "Must be 'exact' (clearly visible date & time), 'ambiguous' (missing year, vague time, or ambiguous format), or 'unknown' (no deadline shown).",
          },
          rawOpeningDateText: {
            type: Type.STRING,
            description: "Verbatim snippet of the opening / publish date if visible, e.g. 'Opening Date: Nov 10, 2026'. Empty if not mentioned.",
          },
          isoOpeningDate: {
            type: Type.STRING,
            description: "Normalized ISO 8601 string in PKT (UTC+5) for opening date, or empty string.",
          },
          totalMarks: {
            type: Type.STRING,
            description: "Total marks if explicitly specified (e.g. '20', '10'), or empty string.",
          },
          gracePeriod: {
            type: Type.STRING,
            description: "Grace period if mentioned (e.g. '24 Hours Grace Period will be given'), or empty string.",
          },
          sourceReference: {
            type: Type.STRING,
            description: "Page or visual location in document where this task was found, e.g., 'Page 1', 'Announcement Table Row 2'.",
          },
          confidence: {
            type: Type.OBJECT,
            properties: {
              overall: { type: Type.STRING, description: "'High', 'Medium', or 'Low'" },
              courseCode: { type: Type.STRING, description: "'High', 'Medium', or 'Low'" },
              title: { type: Type.STRING, description: "'High', 'Medium', or 'Low'" },
              deadline: { type: Type.STRING, description: "'High', 'Medium', or 'Low'" },
              rationale: { type: Type.STRING, description: 'Brief rationale explaining confidence level and any assumptions.' },
            },
            required: ['overall', 'courseCode', 'title', 'deadline', 'rationale'],
          },
          ambiguityFlags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of ambiguities or caveats detected (e.g., Year not printed - assumed current academic calendar, Deadline time assumed 23:59 PKT, Date format DD/MM vs MM/DD ambiguous). Empty if clear.',
          },
        },
        required: [
          'courseCode',
          'activityType',
          'title',
          'rawDeadlineText',
          'deadlineStatus',
          'confidence',
          'ambiguityFlags',
        ],
      },
    },
    documentSummary: {
      type: Type.STRING,
      description: 'One to two sentence summary of the uploaded document or screenshot content.',
    },
  },
  required: ['tasks', 'documentSummary'],
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL_NAME,
    serverTime: new Date().toISOString(),
    timezone: 'Asia/Karachi (PKT, UTC+5)',
  });
});

// AI extraction endpoint
app.post('/api/extract', async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Missing fileBase64 or mimeType in request body.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please check your environment configuration.',
      });
    }

    // Clean base64 string if it contains data URI header
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

    const ai = aiClient || new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const promptText = `
You are an expert Virtual University of Pakistan (VU) Academic Assistant and LMS document analyst.
Extract all academic activities, assignments, quizzes, GDBs (Graded Discussion Boards), exams, and announcements with deadlines from this document/screenshot.

CRITICAL RULES & VU CONTEXT:
1. VU Course Codes: Common patterns like CS101, CS201, CS301, CS504, CS601, MTH101, MTH302, ENG101, PAK301, ISL202, PHY101, STA301, etc. Do NOT guess or invent a course code if none is shown.
2. Activity Types:
   - Assignment (usually has Due Date, 24 Hours Grace Period, Marks like 20)
   - Quiz (usually has Open Date, Close Date, 10 or 15 MCQs)
   - GDB (Graded Discussion Board, has topic, Opening and Closing dates)
   - Exam (Midterm / Final Term exam date and time)
   - Announcement (VU LMS announcement notice)
   - Other
3. VALIDATION & INTEGRITY:
   - NEVER invent missing dates, times, course codes, or titles.
   - Distinguish carefully between OPENING DATE and DEADLINE/CLOSING DATE.
   - Pakistan Standard Time (PKT, UTC+5) is the authoritative timezone for Virtual University of Pakistan.
   - If closing time is not specified in the document, VU deadlines normally end at 23:59:00 PKT. If you infer 23:59:00, you MUST explicitly flag this in 'ambiguityFlags' ("Closing time was not specified; defaulted to 23:59 PKT").
   - If the date format is ambiguous (e.g., 04/05/2026 could be 4th May or 5th April), set 'deadlineStatus' to 'ambiguous' and add an ambiguity flag.
   - If the year is omitted (e.g. 'Due Date: Nov 15'), note this in ambiguityFlags.
   - If NO deadline is visible at all, set 'deadlineStatus' to 'unknown', 'isoDeadline' to '', and 'rawDeadlineText' to 'Deadline unknown'.
   - Extract total marks, grace period, and syllabus coverage/instructions if visible.
4. Return structured JSON matching the provided schema.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
      config: {
        systemInstruction: 'You extract academic deadlines accurately and strictly without hallucinating or inventing missing information.',
        responseMimeType: 'application/json',
        responseSchema: extractionSchema,
        temperature: 0.1,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: 'Empty response received from Gemini model.' });
    }

    const parsedData = JSON.parse(responseText.trim());
    return res.json({
      success: true,
      fileName: fileName || 'uploaded_document',
      extractedAt: new Date().toISOString(),
      modelUsed: MODEL_NAME,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Extraction error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to extract academic tasks from the uploaded document.',
      details: error?.toString(),
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VU Smart Deadline Manager running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
