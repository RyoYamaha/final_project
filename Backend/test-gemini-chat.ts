import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';


async function main() {
  const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAi.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
  //tạo 1 đoạn chat hội thoại 
  const chat = model.startChat({
    history: [
      {
        role: 'user', parts: [{ text: 'tên tôi là ryo' }],
      },
      {
        role: 'model', parts: [{ text: ' chào ryo rất vui được làm quen bạn' }],
      }
    ]
  });
  const result = await chat.sendMessage('bạn có nhớ tên tôi không');
  console.log(result.response.text());
}
main();