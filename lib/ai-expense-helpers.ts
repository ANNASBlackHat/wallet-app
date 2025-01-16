import { handleManualSubmit } from './expense-helpers'

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

// This function will be implemented later with actual AI processing
async function parseExpenseInput(input: AIExpenseInput): Promise<ParsedExpenseData> {
  // TODO: Implement actual AI processing
  // For now, return mock data for testing
  return {
    name: "Office Supplies",
    category: "Stationery",
    quantity: 50,
    unit: "pieces",
    total: 1500,
    description: "Monthly paper and pen supplies for the office"
  }
}

export async function handleAIExpenseSubmit(input: AIExpenseInput): Promise<void> {
  if (!input.userId) {
    throw new Error('User ID is required')
  }

  if (!input.text && !input.audioBlob && !input.selectedImage) {
    throw new Error('Please add some expense details')
  }

  // Parse the input using AI (currently mocked)
  const parsedData = await parseExpenseInput(input)

  // Use the existing handleManualSubmit to save the data
  await handleManualSubmit({
    userId: input.userId,
    category: parsedData.category,
    name: parsedData.name,
    quantity: parsedData.quantity.toString(),
    unit: parsedData.unit,
    total: parsedData.total.toString(),
    description: parsedData.description
  })
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

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/wallet`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) throw new Error('Failed to submit expense to AI service')
} 