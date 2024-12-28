'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Mic, Image } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function AddExpensePage() {
  const { phone } = useAuth()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    if (!phone) return
    
    setIsLoading(true)
    try {
      const response = await fetch('https://wallet.annasblackhat.com/v1/wallet', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to submit')
      
      toast({
        title: 'Success',
        description: 'Your expense has been recorded'
      })
      
      setText('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record expense',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Handle voice recording
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access microphone',
        variant: 'destructive'
      })
    }
  }

  const handleCameraInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // Handle camera capture
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access camera',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Example: I bought 2 pizzas for $25"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px]"
            name="text"
          />
          <div className="grid grid-cols-3 gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleVoiceInput}
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCameraInput}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => document.getElementById('gallery')?.click()}
            >
              <Image className="w-4 h-4 mr-2" />
              Gallery
              <input
                id="gallery"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const formData = new FormData()
                    formData.append('image', e.target.files[0])
                    handleSubmit(formData)
                  }
                }}
              />
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

