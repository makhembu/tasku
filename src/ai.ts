import { GoogleGenAI } from '@google/genai';

interface ParsedTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  labels: string[];
  dueDate: Date | null;
}

export class AI {
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async parseTask(prompt: string): Promise<ParsedTask[]> {
    if (this.client) {
      try {
        const systemPrompt = `You are a task parser. Parse the user's natural language into structured tasks.
Return ONLY valid JSON array. Each task object has: title (string, required), description (string), priority ("low"|"medium"|"high"), labels (string array), dueDate (ISO date string or null).
Examples:
"add task review PR by Friday high priority" → [{"title":"Review PR","priority":"high","labels":[],"dueDate":"2026-05-10"}]
"remind me to buy groceries tomorrow with label personal" → [{"title":"Buy groceries","priority":"medium","labels":["personal"],"dueDate":"2026-05-09"}]
"fix login bug on saturday and deploy to production" → [{"title":"Fix login bug","priority":"high","labels":[],"dueDate":"2026-05-11"},{"title":"Deploy to production","priority":"high","labels":["deploy"],"dueDate":"2026-05-11"}]`;

        const response = await this.client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
            temperature: 0.1,
          }
        });

        const text = response.text;
        if (text) {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((t: any) => ({
              ...t,
              dueDate: t.dueDate ? new Date(t.dueDate) : null,
              priority: t.priority || 'medium',
              labels: t.labels || [],
            }));
          }
        }
      } catch (error) {
        // Fallback to basic parsing
      }
    }
    return this.basicParse(prompt);
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
