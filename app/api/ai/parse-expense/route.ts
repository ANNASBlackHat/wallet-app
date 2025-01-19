import { NextResponse } from 'next/server'
import { auth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from "@google/generative-ai"

interface ParsedExpenseData {
  name: string
  category: string
  quantity: number
  unit: string
  total: number
  description: string
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

    const { text } = await request.json()
    console.log('text', text)    

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const prompt = getPrompt(text);

    const genaiResult = await model.generateContent([prompt, text]);
    const response = genaiResult.response.text();
    console.log('LLM Response:', response);

    // Parse the LLM response into structured data
    const parsedExpenses = parseAIResponse(response);

    return NextResponse.json({
      success: true,
      parsedExpenses
    });

  } catch (error) {
    console.error('AI Processing Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process expense' },
      { status: 500 }
    );
  }
} 

function getPrompt(text: string): string {
  return `
  You are a helpful assistant that can parse and categorize expenses.
  You will be given a text of an expense and you will need to parse it and return the following:
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
  `;
}