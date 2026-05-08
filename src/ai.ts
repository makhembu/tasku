import { GoogleGenAI } from '@google/genai';

interface ParsedTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  labels: string[];
  dueDate: Date | null;
}

export class AI {
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  async parseTask(prompt: string): Promise<ParsedTask[]> {
    const json = await this.tryLlmProviders(prompt);
    if (json) return json;
    return this.basicParse(prompt);
  }

  private async tryLlmProviders(prompt: string): Promise<ParsedTask[] | null> {
    const preferred = (process.env.LLM_PROVIDER || 'zen');

    if (preferred === 'gemini') {
      const r = await this.callGemini(prompt);
      if (r) return r;
    }

    const zen = await this.callZen(prompt);
    if (zen) return zen;

    if (preferred !== 'custom') {
      const gemini = await this.callGemini(prompt);
      if (gemini) return gemini;
    }

    return null;
  }

  private async callZen(prompt: string): Promise<ParsedTask[] | null> {
    try {
      const apiKey = process.env.ZEN_API_KEY || 'sk-u8mPctB6o43VPBTszjsy14D38yQGCWahMpYlNXSviU8s1mbjfY7dmUnvlhv6Pz3j';
      const model = process.env.ZEN_MODEL || 'big-pickle';
      const baseUrl = process.env.ZEN_API_URL || 'https://opencode.ai/zen/v1/chat/completions';
      const systemPrompt = `You are a task parser. Parse the user's natural language into structured tasks.
Return ONLY valid JSON array. Each task object has: title (string, required), description (string), priority ("low"|"medium"|"high"), labels (string array), dueDate (ISO date string or null).
Examples:
"add task review PR by Friday high priority" -> [{"title":"Review PR","priority":"high","labels":[],"dueDate":"2026-05-10"}]
"remind me to buy groceries tomorrow with label personal" -> [{"title":"Buy groceries","priority":"medium","labels":["personal"],"dueDate":"2026-05-09"}]
"fix login bug on saturday and deploy to production" -> [{"title":"Fix login bug","priority":"high","labels":[],"dueDate":"2026-05-11"},{"title":"Deploy to production","priority":"high","labels":["deploy"],"dueDate":"2026-05-11"}]`;

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: 500, temperature: 0.1 }),
      });

      if (!res.ok) return null;
      const data = await res.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((t: any) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        priority: t.priority || 'medium',
        labels: t.labels || [],
      }));
    } catch { return null; }
  }

  private async callGemini(prompt: string): Promise<ParsedTask[] | null> {
    if (!this.geminiClient) return null;
    try {
      const systemPrompt = `You are a task parser. Parse the user's natural language into structured tasks.
Return ONLY valid JSON array. Each task object has: title (string, required), description (string), priority ("low"|"medium"|"high"), labels (string array), dueDate (ISO date string or null).
Examples:
"add task review PR by Friday high priority" -> [{"title":"Review PR","priority":"high","labels":[],"dueDate":"2026-05-10"}]
"remind me to buy groceries tomorrow with label personal" -> [{"title":"Buy groceries","priority":"medium","labels":["personal"],"dueDate":"2026-05-09"}]
"fix login bug on saturday and deploy to production" -> [{"title":"Fix login bug","priority":"high","labels":[],"dueDate":"2026-05-11"},{"title":"Deploy to production","priority":"high","labels":["deploy"],"dueDate":"2026-05-11"}]`;

      const response = await this.geminiClient.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
          temperature: 0.1,
        }
      });

      const text = response.text;
      if (!text) return null;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((t: any) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        priority: t.priority || 'medium',
        labels: t.labels || [],
      }));
    } catch { return null; }
  }

  private basicParse(prompt: string): ParsedTask[] {
    const tasks: ParsedTask[] = [];
    const lower = prompt.toLowerCase();
    
    const segments = prompt.split(/\band\b/i).map(s => s.trim()).filter(Boolean);
    
    for (const segment of segments) {
      const title = segment
        .replace(/^(add|create|make|remind me to|task:?)\s+/i, '')
        .replace(/\s+(high|low|medium)\s+priority/i, '')
        .replace(/\s+with\s+label\s+\w+/i, '')
        .replace(/\s+(today|tomorrow|next\s+\w+|\w+\s+\d+)/i, '')
        .replace(/\s+by\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday)/i, '')
        .trim();
      
      if (!title) continue;
      
      const priority: 'low' | 'medium' | 'high' = 
        /high priority/i.test(segment) ? 'high' :
        /low priority/i.test(segment) ? 'low' : 'medium';
      
      const labelMatch = segment.match(/label\s+(\w+)/i);
      const labels = labelMatch ? [labelMatch[1].toLowerCase()] : [];
      
      let dueDate: Date | null = null;
      if (/tomorrow/i.test(segment)) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
      } else if (/today/i.test(segment)) {
        dueDate = new Date();
      }
      
      tasks.push({ title: title.charAt(0).toUpperCase() + title.slice(1), description: undefined, priority, labels, dueDate });
    }
    
    return tasks.length > 0 ? tasks : [{ title: prompt, description: undefined, priority: 'medium', labels: [], dueDate: null }];
  }
}
