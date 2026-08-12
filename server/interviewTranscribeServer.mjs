import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssemblyAI } from 'assemblyai';
import express from 'express';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(rootDirectory, '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

loadLocalEnv();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});
const port = Number(process.env.API_PORT ?? 8787);

function sendClientError(res, status, message) {
  return res.status(status).json({ error: message });
}

function logError(label, error) {
  console.error(label, error instanceof Error ? error.message : error);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/interview/transcribe', upload.single('audio'), async (req, res) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    console.error('AssemblyAI API key is not configured.');
    return sendClientError(res, 500, '음성을 글자로 바꾸는 서버 설정이 아직 완료되지 않았어요.');
  }

  if (!req.file) {
    return sendClientError(res, 400, '음성 파일이 없습니다.');
  }

  if (!req.file.buffer?.length) {
    return sendClientError(res, 400, '음성 파일을 읽지 못했어요. 다시 말씀해 주세요.');
  }

  if (req.file.mimetype && !req.file.mimetype.startsWith('audio/') && req.file.mimetype !== 'application/octet-stream') {
    return sendClientError(res, 400, '올바른 음성 파일이 아닙니다. 다시 녹음해 주세요.');
  }

  try {
    const client = new AssemblyAI({ apiKey });
    const transcript = await client.transcripts.transcribe({
      audio: req.file.buffer,
      language_code: 'ko',
      punctuate: true,
      format_text: true,
    });

    if (transcript.status === 'error') {
      console.error('AssemblyAI transcription failed:', transcript.error);
      return sendClientError(res, 502, '음성을 잘 듣지 못했어요. 다시 말씀해 주세요.');
    }

    const text = transcript.text?.trim();
    if (!text) {
      return sendClientError(res, 422, '음성을 잘 듣지 못했어요. 다시 말씀해 주세요.');
    }

    return res.json({ text });
  } catch (error) {
    logError('Unexpected transcription error:', error);
    return sendClientError(res, 500, '음성을 글자로 바꾸는 중 문제가 발생했어요. 다시 시도해 주세요.');
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    logError('Audio upload failed:', error.code);
    return sendClientError(res, 400, '음성 파일을 업로드하지 못했어요. 다시 녹음해 주세요.');
  }

  logError('Unhandled API error:', error);
  return sendClientError(res, 500, '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
});

app.listen(port, () => {
  console.log(`Interview transcription API listening on http://localhost:${port}`);
});
