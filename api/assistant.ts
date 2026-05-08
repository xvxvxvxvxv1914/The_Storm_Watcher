import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_MESSAGES = 20;
const SYSTEM_PROMPT_BASE = `You are a concise space weather assistant for The Storm Watcher app. You help users understand solar activity, geomagnetic storms, aurora visibility, and related phenomena.

Guidelines:
- Be concise — 2-4 sentences unless a longer explanation is clearly needed
- Use plain language; explain jargon when you introduce it
- When asked about current conditions, use the live data provided below
- Never make up data or speculate beyond what the context provides
- If asked something unrelated to space weather, politely redirect`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SpaceWeatherContext {
  kp: number | null;
  windSpeed: number | null;
  bz: number | null;
  xrayClass: string | null;
  timestamp: string;
}

const buildSystemPrompt = (ctx: SpaceWeatherContext) => {
  const lines: string[] = [SYSTEM_PROMPT_BASE, '', 'Current space weather conditions:'];
  if (ctx.kp !== null) lines.push(`- Kp index: ${ctx.kp.toFixed(1)} ${ctx.kp >= 5 ? '(geomagnetic storm active)' : ctx.kp >= 3 ? '(elevated activity)' : '(quiet)'}`);
  if (ctx.windSpeed !== null) lines.push(`- Solar wind speed: ${Math.round(ctx.windSpeed)} km/s`);
  if (ctx.bz !== null) lines.push(`- Bz (IMF southward): ${ctx.bz.toFixed(1)} nT ${ctx.bz < -10 ? '(strongly southward — aurora favorable)' : ctx.bz < 0 ? '(southward)' : '(northward)'}`);
  if (ctx.xrayClass) lines.push(`- X-ray flux class: ${ctx.xrayClass}`);
  lines.push(`- Data as of: ${ctx.timestamp}`);
  return lines.join('\n');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, context } = req.body as { messages: ChatMessage[]; context: SpaceWeatherContext };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  const safeMessages = messages.slice(-MAX_MESSAGES).filter(
    m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: buildSystemPrompt(context ?? { kp: null, windSpeed: null, bz: null, xrayClass: null, timestamp: new Date().toUTCString() }),
      messages: safeMessages,
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error('Assistant error:', err);
    return res.status(500).json({ error: 'Failed to get response' });
  }
}
