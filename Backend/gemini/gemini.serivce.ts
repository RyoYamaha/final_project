import 'dotenv/config';
import {GoogleGenerativeAI} from '@google/generative-ai';

async function main() {
    const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); //tạo 1 object để  có thể giao tiếp với gemini

    //chọn model
    const model = genAi.getGenerativeModel({model: 'gemini-3.5-flash-lite'});

    const result =  await model.generateContent('Hello, ngày hôm nay của bạn như thế nào ');
    console.log(result.response.text())
}