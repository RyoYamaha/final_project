import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAi: GoogleGenerativeAI;

  constructor() {
    this.genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async generateContent(prompt: string): Promise<string> {
    const model = this.genAi.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}