import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, GrammarItem, QuizQuestion, QuestionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateQuestion(
  vocab: VocabularyItem,
  type: QuestionType
): Promise<QuizQuestion> {
  const prompt = `
    Generate a ${type} question for the TOCFL (Chinese Proficiency Test) based on this vocabulary word:
    Word: ${vocab.word} (${vocab.pinyin})
    Meaning: ${vocab.meaning}
    Level: ${vocab.level}
    ${vocab.exampleSentence ? `User provided example: ${vocab.exampleSentence}` : ''}

    Requirements for ${type}:
    - multiple-choice: Return a sentence with the word missing (or its synonym), and 4 options. Correct answer is the word itself or a synonym.
    - fill-in-the-blank: Return a sentence with the word replaced by "____". Correct answer is the word.
    - sentence-reorder: Return a sentence using the word, but split into a scrambled array of words/short phrases.

    The response MUST be in JSON format matching this schema:
    {
      "prompt": "The question text or sentence",
      "options": ["option1", "option2", "option3", "option4"], // Only for multiple-choice
      "correctAnswer": "The correct string" // Or array of strings for sentence-reorder
      "explanation": "Briefly explain why this is correct in Vietnamese."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["prompt", "correctAnswer"],
        },
      },
    });

    const result = JSON.parse(response.text);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      vocabId: vocab.id,
      level: vocab.level,
      ...result
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function generateGrammarQuestion(
  grammar: GrammarItem,
  type: QuestionType
): Promise<QuizQuestion> {
  const isHighLevel = ['B2', 'C1', 'C2'].includes(grammar.level);
  
  const prompt = `
    Generate a ${type} question for the TOCFL (Chinese Proficiency Test) based on this grammar point:
    Topic: ${grammar.title}
    Pattern: ${grammar.pattern}
    Description: ${grammar.description}
    Level: ${grammar.level}

    Requirements for ${type}:
    - multiple-choice: Focus on the correct usage of the grammar pattern. Provide 4 options.
    - fill-in-the-blank: Missing part of the grammar structure.
    - sentence-reorder: A complete sentence demonstrating the pattern, scrambled into 5-8 pieces.

    ${isHighLevel ? `
    Since this is a high-level point (${grammar.level}), please:
    - sentence-reorder: Use more complex, academic, or formal sentence structures.
    - multiple-choice: Include "nubance comparison" or "sentence correction" style questions where options are subtly different.
    - Include a detailed "contextual usage analysis" in the explanation.
    ` : `
    Since this is a lower-level point, focus on clear, common everyday usage.
    `}

    The response MUST be in JSON format matching this schema:
    {
      "prompt": "The question text or sentence",
      "options": ["option1", "option2", "option3", "option4"], 
      "correctAnswer": "The correct string",
      "explanation": "Explain the grammar point and its nuance in Vietnamese."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["prompt", "correctAnswer"],
        },
      },
    });

    const result = JSON.parse(response.text);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      grammarId: grammar.id,
      level: grammar.level,
      ...result
    };
  } catch (error) {
    console.error("Gemini Grammar Error:", error);
    throw error;
  }
}

export async function getUsageExplanation(vocab: VocabularyItem): Promise<string> {
  const prompt = `
    Giải thích ngắn gọn cách dùng và ngữ cảnh thường gặp của từ vựng TOCFL sau bằng tiếng Việt:
    Từ: ${vocab.word} (${vocab.pinyin})
    Nghĩa: ${vocab.meaning}
    Cấp độ: ${vocab.level}
    
    Yêu cầu:
    1. Giải thích súc tích (khoảng 2-3 câu).
    2. Nêu rõ sắc thái hoặc ngữ cảnh sử dụng đặc trưng.
    3. Không cần đưa thêm ví dụ nếu đã có ví dụ trong dữ liệu cũ (chỉ tập trung vào giải thích cách dùng).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini Usage Error:", error);
    return "Không thể tải giải thích cách dùng lúc này.";
  }
}

export async function getGrammarExplanation(grammar: GrammarItem): Promise<string> {
  const prompt = `
    Giải thích chi tiết cách dùng cấu trúc ngữ pháp TOCFL sau bằng tiếng Việt:
    Cấu trúc: ${grammar.title}
    Mẫu: ${grammar.pattern}
    Mô tả ngắn: ${grammar.description}
    Cấp độ: ${grammar.level}
    
    Yêu cầu:
    1. Giải thích chi tiết, chuyên sâu nhưng dễ hiểu (khoảng 5-8 câu).
    2. Nêu rõ các SẮC THÁI NGHĨA (nuances) và ngữ cảnh sử dụng đặc trưng.
    3. Liệt kê các LỖI THƯỜNG GẶP (common mistakes) mà người học hay mắc phải.
    4. SO SÁNH với các cấu trúc tương đương hoặc dễ gây nhầm lẫn nếu có.
    5. Trình bày rõ ràng bằng các đoạn văn hoặc danh sách ngắn gọn.
    6. Không cần đưa thêm ví dụ nếu đã có trong dữ liệu.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini Grammar Explanation Error:", error);
    return "Không thể tải giải thích ngữ pháp lúc này.";
  }
}
