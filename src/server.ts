import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBeepWav } from './shared/audio.ts';

type ChatRequest = {
  userText?: string;
  history?: Array<{ role: string; content: string }>;
};

const port = Number(process.env.PORT || 3000);
const publicDir = fileURLToPath(new URL('../public', import.meta.url));
const sampleDir = fileURLToPath(new URL('./samples', import.meta.url));
loadEnvFromFile(join(fileURLToPath(new URL('..', import.meta.url)), '.env'));
const stubAudioBase64 = generateBeepWav().toString('base64');
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const elevenVoiceId =
  process.env.ELEVENLABS_VOICE_ID_JA || 'fUjY9K2nAIwlALOwSiwc';
const elevenModelId =
  process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const allowedSamples = new Set([
  'clap_soft.wav',
  'clap_mid.wav',
  'clap_sharp.wav',
]);

const mimeMap: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      return sendJson(res, 400, { error: 'Missing URL' });
    }
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname.startsWith('/samples/')) {
      return serveSample(url.pathname, res);
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const payload = (await readJson(req)) as ChatRequest;
      try {
        const result = await buildChatResponse(payload);
        return sendJson(res, 200, result);
      } catch (err) {
        console.error(err);
        const userText = (payload.userText ?? '').toString().trim();
        const fallbackReply =
          userText.length > 0
            ? `了解だよ。「${userText}」だね！（バックアップ回答）`
            : 'やっほー！ごきげんよう。（バックアップ回答）';
        return sendJson(res, 200, {
          reply_ja: fallbackReply,
          audio: { type: 'base64', mime: 'audio/wav', value: stubAudioBase64 },
          timestamps: [],
          meta: { source: 'fallback', error: (err as Error).message },
        });
      }
    }

    await serveStatic(url.pathname, res);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Server error' });
  }
});

async function serveStatic(pathname: string, res: ServerResponse) {
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target =
    safePath === '/' ? join(publicDir, 'index.html') : join(publicDir, safePath);

  try {
    const content = await readFile(target);
    const type = mimeMap[extname(target)] ?? 'text/plain; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch (err: unknown) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function sendJson(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

server.listen(port, () => {
  console.log(`Pachi Pachi server running at http://localhost:${port}`);
});

async function buildChatResponse(payload: ChatRequest) {
  const userText = (payload.userText ?? '').toString().trim();
  const history = payload.history ?? [];

  const missingAnthropic = !process.env.ANTHROPIC_API_KEY;
  const missingEleven = !process.env.ELEVENLABS_API_KEY;

  if (missingAnthropic || missingEleven) {
    console.warn('Missing API keys; using fallback stub audio and text.');
    const replyText =
      userText.length > 0
        ? `了解だよ。「${userText}」だね！（キー未設定のためダミー）`
        : 'やっほー！キー未設定だからダミーで話すね。';
    return {
      reply_ja: replyText,
      audio: { type: 'base64', mime: 'audio/wav', value: stubAudioBase64 },
      timestamps: [],
      meta: { source: 'fallback-missing-keys' },
    };
  }

  const anthropicReply = await fetchAnthropicReply(userText, history);
  const elevenAudio = await fetchElevenAudio(anthropicReply.reply_ja);

  return {
    reply_ja: anthropicReply.reply_ja,
    audio: elevenAudio.audio,
    timestamps: elevenAudio.timestamps ?? [],
    meta: {
      source: 'live',
      anthropic_model: anthropicModel,
      eleven_voice: elevenVoiceId,
      emotion: anthropicReply.emotion,
      scramble_chance: anthropicReply.scramble_chance,
    },
  };
}

async function fetchAnthropicReply(
  userText: string,
  history: Array<{ role: string; content: string }>,
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const systemPrompt =
    'You are Kun, a cute Japanese-speaking character. Always reply in strict JSON with keys reply_ja, reply_en (brief English gloss), emotion, scramble_chance. Keep reply_ja short (1-4 lines). Example: {"reply_ja": "やっほー！", "reply_en": "Hey there!", "emotion": "calm", "scramble_chance": 0.25}';

  const messages = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const askText =
    userText && userText.length > 0 ? userText : 'こんにちは！軽く挨拶して。';
  messages.push({ role: 'user', content: askText });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 200,
      system: systemPrompt,
      messages,
      temperature: 0.6,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic error: ${resp.status} ${text}`);
  }

  const json = (await resp.json()) as any;
  const rawText = json?.content?.[0]?.text?.toString() ?? '';
  const parsed = parseReplyJson(rawText);
  return {
    reply_ja: parsed.reply_ja || 'やっほー！',
    reply_en: parsed.reply_en,
    emotion: parsed.emotion || 'calm',
    scramble_chance: parsed.scramble_chance ?? 0.15,
    raw: rawText,
  };
}

async function fetchElevenAudio(text: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');
  const body = {
    text,
    model_id: elevenModelId,
    voice_settings: {
      stability: 0.35,
      similarity_boost: 0.7,
      style: 0.55,
      use_speaker_boost: true,
    },
    output_format: 'mp3_22050_32',
    optimize_streaming_latency: 3,
  };

  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const textBody = await resp.text();
    throw new Error(`ElevenLabs error: ${resp.status} ${textBody}`);
  }

  const audioBuf = Buffer.from(await resp.arrayBuffer());
  return {
    audio: { type: 'base64', mime: 'audio/mpeg', value: audioBuf.toString('base64') },
    timestamps: [],
  };
}

function parseReplyJson(raw: string): {
  reply_ja: string;
  reply_en?: string;
  emotion?: string;
  scramble_chance?: number;
} {
  const fallback = { reply_ja: raw };
  try {
    return JSON.parse(raw);
  } catch {
    // try to extract JSON substring if model wrapped it
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

async function serveSample(pathname: string, res: ServerResponse) {
  const name = pathname.split('/').pop() ?? '';
  if (!allowedSamples.has(name)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  try {
    const filePath = join(sampleDir, name);
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': 'audio/wav' });
    res.end(content);
  } catch (err) {
    console.error(err);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function loadEnvFromFile(path: string) {
  if (!existsSync(path)) return;
  try {
    const content = readFileSync(path, 'utf8');
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const idx = line.indexOf('=');
        if (idx === -1) return;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      });
  } catch (err) {
    console.warn('Failed to load .env', err);
  }
}
