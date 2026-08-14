import { AssemblyAI } from 'assemblyai';
import Busboy from 'busboy';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

import { generateGeminiConnectionTest, getGeminiLogDetails } from './lib/gemini.mjs';
import { generateExperienceCard } from './lib/experienceCard.mjs';
import { generateNextInterviewQuestion } from './lib/interviewQuestion.mjs';

const app = express();
const maxAudioFileSize = 25 * 1024 * 1024;

app.use(express.json({ limit: '1mb' }));

function sendClientError(res, status, message) {
  return res.status(status).json({ error: message });
}

function logError(label, error) {
  console.error(label, error instanceof Error ? error.message : error);
}

function createClientError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseAudioUpload(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      reject(createClientError(400, '음성 파일이 없습니다.'));
      return;
    }

    const chunks = [];
    let audioFile = null;
    let uploadTooLarge = false;

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: maxAudioFileSize,
        files: 1,
      },
    });

    busboy.on('file', (fieldName, file, info) => {
      if (fieldName !== 'audio') {
        file.resume();
        return;
      }

      audioFile = {
        mimetype: info.mimeType,
        originalname: info.filename,
      };

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('limit', () => {
        uploadTooLarge = true;
        file.resume();
      });
    });

    busboy.on('error', reject);
    busboy.on('finish', () => {
      if (uploadTooLarge) {
        reject(createClientError(400, '음성 파일이 너무 큽니다. 짧게 다시 녹음해 주세요.'));
        return;
      }

      const buffer = Buffer.concat(chunks);
      if (!audioFile || !buffer.length) {
        reject(createClientError(400, '음성 파일이 없습니다.'));
        return;
      }

      resolve({
        ...audioFile,
        buffer,
      });
    });

    if (req.rawBody) {
      busboy.end(req.rawBody);
      return;
    }

    req.pipe(busboy);
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/ai/test', async (_req, res) => {
  try {
    const text = await generateGeminiConnectionTest();
    return res.json({ success: true, text });
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini connection test failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      success: false,
      error: {
        code,
        message: 'Gemini 연결 확인 중 문제가 발생했습니다.',
      },
    });
  }
});

app.post('/api/interview/next-question', async (req, res) => {
  try {
    const result = await generateNextInterviewQuestion(req.body);
    return res.json(result);
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini interview question failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      error: {
        code,
        message: '질문을 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
    });
  }
});

app.post('/api/interview/experience-card', async (req, res) => {
  try {
    const card = await generateExperienceCard(req.body);
    return res.json({ success: true, card });
  } catch (error) {
    const status = Number(error.status) || 500;
    const code = error.code || 'unexpected_error';

    console.error('Gemini experience card failed:', getGeminiLogDetails(error));

    return res.status(status).json({
      success: false,
      error: {
        code,
        message: '경험을 정리하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
      },
    });
  }
});

app.post('/api/interview/transcribe', async (req, res) => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    console.error('AssemblyAI API key is not configured.');
    return sendClientError(res, 500, '음성 변환 서버 설정이 아직 완료되지 않았어요.');
  }

  try {
    const audioFile = await parseAudioUpload(req);

    if (audioFile.mimetype && !audioFile.mimetype.startsWith('audio/') && audioFile.mimetype !== 'application/octet-stream') {
      return sendClientError(res, 400, '올바른 음성 파일이 아닙니다. 다시 녹음해 주세요.');
    }

    const client = new AssemblyAI({ apiKey });
    const transcript = await client.transcripts.transcribe({
      audio: audioFile.buffer,
      language_code: 'ko',
      punctuate: true,
      format_text: true,
    });

    if (transcript.status === 'error') {
      console.error('AssemblyAI transcription failed:', transcript.error);
      return sendClientError(res, 502, '음성을 분석하지 못했어요. 다시 말해주세요.');
    }

    const text = transcript.text?.trim();
    if (!text) {
      return sendClientError(res, 422, '음성을 분석하지 못했어요. 다시 말해주세요.');
    }

    return res.json({ text });
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      return sendClientError(res, error.status, error.message);
    }

    logError('Unexpected transcription error:', error);
    return sendClientError(res, 500, '음성을 글자로 바꾸는 중 문제가 발생했어요. 다시 시도해 주세요.');
  }
});

app.use((error, _req, res, _next) => {
  logError('Unhandled API error:', error);
  return sendClientError(res, 500, '서버에서 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
});

export const api = onRequest(
  {
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['ASSEMBLYAI_API_KEY', 'GEMINI_API_KEY'],
  },
  app,
);
