import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { auth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from "@google/generative-ai"

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

    const genAI = new GoogleGenerativeAI("AIzaSyAiflq8cPeW8y697gsERPE-zorg3ZrpmpQ");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = getPrompt(text);

    const genaiResult = await model.generateContent([prompt, text]);
    const response = genaiResult.response.text();
    console.log(response);

    // For now, return mock data along with the AI response for testing
    return NextResponse.json({
      success: true,
      aiResponse: response,
      parsedExpense: {
        name: "Office Supplies",
        category: "Stationery",
        quantity: 50,
        unit: "pieces",
        total: 1500,
        description: "Monthly paper and pen supplies for the office"
      }
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

  Your output should be in JSON format.
  `;
}