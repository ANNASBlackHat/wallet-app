import { handleManualSubmit } from './expense-helpers'
import { auth } from '@/lib/firebase'

interface AIExpenseInput {
  userId: string
  text?: string
  audioBlob?: Blob
  audioMimeType?: string
  selectedImage?: File
}

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

async function parseExpenseInput(input: AIExpenseInput): Promise<ParsedExpenseData[]> {
  try {
    // Get the current user's ID token
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    const token = await currentUser.getIdToken()

    // Convert image to base64 if present
    let imageBase64;
    if (input.selectedImage) {
      const buffer = await input.selectedImage.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    }

    // Convert audio to base64 if present
    let audioBase64;
    if (input.audioBlob) {
      const buffer = await input.audioBlob.arrayBuffer();
      audioBase64 = Buffer.from(buffer).toString('base64');
    }

    const response = await fetch('/api/ai/parse-expense', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text: input.text,
        image: imageBase64,
        audio: audioBase64,
        audioMimeType: input.audioMimeType
      })
    });

    if (!response.ok) {
      throw new Error('Failed to parse expense');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to parse expense');
    }
    
    return data.parsedExpenses;
  } catch (error) {
    console.error('Error parsing expense:', error);
    // Return mock data as fallback
    return [];
  }
}

export async function handleAIExpenseSubmit(input: AIExpenseInput): Promise<ParsedExpenseData[]> {
  if (!input.userId) {
    throw new Error('User ID is required')
  }

  if (!input.text && !input.audioBlob && !input.selectedImage) {
    throw new Error('Please add some expense details')
  }

  // Parse the input using AI
  let parsedExpenses;
  try {
    parsedExpenses = await parseExpenseInput(input);
  } catch (error) {
    console.error('Error parsing expense input:', error);
    throw new Error('Failed to parse expense details. Please try again.');
  }

  // Save each expense
  for (const expense of parsedExpenses) {
    await handleManualSubmit({
      userId: input.userId,
      category: expense.category,
      name: expense.name,
      quantity: expense.quantity.toString(),
      unit: expense.unit,
      total: expense.total.toString(),
      description: expense.description
    })
  }

  return parsedExpenses;
}

export async function handleAIExpenseSubmitByAPI({
  userId,
  text,
  audioBlob,
  audioMimeType,
  selectedImage
}: AIExpenseInput): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required')
  }

  if (!text && !audioBlob && !selectedImage) {
    throw new Error('Please add some expense details')
  }

  const formData = new FormData()
  formData.append('user_id', userId)
  
  if (text) {
    formData.append('type', 'text')
    formData.append('text', text)
  } else if (audioBlob) {
    formData.append('type', 'audio')
    const extension = audioMimeType?.includes('webm') ? 'webm' : 'mp4'
    const audioFile = new File([audioBlob], `voice-note.${extension}`, { 
      type: audioMimeType || 'audio/webm' 
    })
    formData.append('audio', audioFile)
  } else if (selectedImage) {
    formData.append('type', 'image')
    formData.append('image', selectedImage)
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/wallet`, {
      method: 'POST',
      body: formData
    })

    console.log('response ok?: ', response.ok);
    console.log('response: ', response)
    
    if (!response.ok) {
      throw new Error('Failed to submit expense to AI service')
    }
  } catch (error) {
    console.error('Error submitting expense:', error);
    throw error;
  }
} 