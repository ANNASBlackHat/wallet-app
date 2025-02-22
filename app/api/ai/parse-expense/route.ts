import { NextResponse } from 'next/server'
import { auth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server"

interface ParsedExpenseData {
  name: string
  category: string
  quantity: number
  unit: string
  total: number
  description: string
}

async function processAudioFile(audioBase64: string, mimeType: string) {
  // Initialize file manager
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');

  // Convert base64 to buffer and create a temporary file
  const buffer = Buffer.from(audioBase64, 'base64');
  const tempFilePath = `/tmp/expense_audio_${Date.now()}.${mimeType.split('/')[1]}`;
  await require('fs').promises.writeFile(tempFilePath, buffer);
  
  try {
    // Upload the file
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: mimeType,
      displayName: `expense_audio_${Date.now()}.${mimeType.split('/')[1]}`,
    });

    // Wait for processing
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === FileState.PROCESSING) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === FileState.FAILED) {
      throw new Error("Audio processing failed");
    }

    return uploadResult.file;

  } finally {
    // Clean up temporary file
    try {
      await require('fs').promises.unlink(tempFilePath);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }
}

function parseAIResponse(aiResponse: string): ParsedExpenseData[] {
  try {
    // Clean the response to ensure we only get the JSON part
    const jsonStr = aiResponse.substring(
      aiResponse.indexOf('['),
      aiResponse.lastIndexOf(']') + 1
    );
    
    const parsedData = JSON.parse(jsonStr);
    
    // Validate and transform the data
    return parsedData.map((item: any) => ({
      name: item.name || '',
      category: item.category?.toLowerCase() || 'others',
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'unit',
      total: Number(item.total) || 0,
      description: item.description || ''
    }));
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

async function validateAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('authHeader', authHeader)
    return false
  }

  // Extract and verify the token
  const token = authHeader.split('Bearer ')[1]
  try {
    console.log('verifying token')
    await auth.verifyIdToken(token)
    return true
  } catch (error) {
    console.error('Error verifying token:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    console.log('request.... ', request)  
    
    const isAuthenticated = await validateAuth(request)
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { text, image, audio, audioMimeType } = await request.json()
    console.log('Input received - Text:', text ? 'yes' : 'no', 'Image:', image ? 'yes' : 'no', 'Audio:', audio ? 'yes' : 'no')    

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest' });
    
    let result;
    if (audio) {
      // Handle audio input
      const processedFile = await processAudioFile(audio, audioMimeType);
      console.log('Audio file processed:', processedFile.name);
      const audioData = {
        fileData: {
          fileUri: processedFile.uri,
          mimeType: processedFile.mimeType,
        },
      }
      result = await model.generateContent([audioData, getPrompt()]);
    } else if (image) {
      // Handle image input
      const imageData = {
        inlineData: {
          data: image,
          mimeType: "image/jpeg"
        }
      };
      
      const prompt = "Parse this receipt/expense image and extract the expense details.";
      result = await model.generateContent([imageData, prompt, getPrompt()]);
    } else {      
      result = await model.generateContent([getPrompt(), text]);
    }

    const response = result.response.text();
    console.log('LLM Response:', response);

    // Parse the LLM response into structured data
    const parsedExpenses = parseAIResponse(response);

    return NextResponse.json({
      success: true,
      parsedExpenses
    });

  } catch (error) {
    console.log('Error:', error);
    console.error('AI Processing Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process expense' },
      { status: 500 }
    );
  }
} 

function getPrompt(): string {
  return `
  You are a helpful assistant that can parse and categorize expenses.
  You will be given a text, image, or transcribed audio of an expense and you will need to parse it and return the following:
  - name: The name of the expense
  - category: The category of the expense
  - quantity: The quantity of the expense
  - unit: The unit of the expense
  - total: The total cost of the expense
  - description: The description of the expense

  Your output should be in JSON format (array of objects). Example:
  [
    {
      "name": "Makan Malam",
      "quantity": 1,
      "unit": "portion",
      "total": 20000,
      "category": "food",
      "description": "makan malam dengan ayam, tahu dan tempe"
    }
  ]

  For images, carefully look for:
  1. The total amount (usually at the bottom)
  2. Individual items and their prices
  3. Any quantities mentioned
  4. The merchant name or receipt title
  5. The date (include in description if found)

  For audio, focus on:
  1. Listen for mentioned amounts and prices
  2. Identify item names and quantities
  3. Note any category-related keywords
  4. Include any additional context in the description
  `;
}