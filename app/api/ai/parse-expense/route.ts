import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { auth } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    console.log('request.... ', request)
    // Get the Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        console.log('authHeader', authHeader)
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Extract and verify the token
    const token = authHeader.split('Bearer ')[1]
    try {
        console.log('verifying token')
      await auth.verifyIdToken(token)
    } catch (error) {
      console.error('Error verifying token:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { text } = await request.json()
    console.log('text', text)

    // Initialize Vertex AI
    const vertex_ai = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT, 
      location: 'us-central1'
    });
    
    // Load the model
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-pro'
    });

    // Generate response
    const result = await model.generateContent(text || 'Parse this expense');
    const response = await result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    // For now, return mock data along with the AI response for testing
    return NextResponse.json({
      success: true,
      aiResponse: responseText,
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