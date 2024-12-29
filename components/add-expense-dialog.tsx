'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Mic, Image, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'

interface AddExpenseDialogProps {
  onSuccessfulSubmit: () => void;
}

export function AddExpenseDialog({ onSuccessfulSubmit }: AddExpenseDialogProps) {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    if (!userId) return
    
    setIsLoading(true)
    formData.append('user_id', userId)
    
    console.log('Submitting expense:', {
      text: formData.get('text'),
      userId: formData.get('userId')
    })
    
    try {
      console.log('Starting request...')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/wallet`, {
        method: 'POST',
        body: formData
      })
      
      console.log('Response status:', response.status)
      const responseData = await response.text()
      console.log('Response data:', responseData)
      
      if (!response.ok) {
        throw new Error(`Failed to submit. Status: ${response.status}`)
      }
      
      toast({
        title: 'Success',
        description: 'Your expense has been recorded'
      })
      
      onSuccessfulSubmit();
      setText('')
      setOpen(false)
    } catch (error) {
      console.error('Submission error:', error)
      toast({
        title: 'Error',
        description: 'Failed to record expense. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 bg-primary"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Enter your expense details or use voice/camera input
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          handleSubmit(formData)
        }} className="space-y-4">
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
              className="w-full"
              onClick={() => {
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(stream => {
                    console.log('Microphone access granted')
                    // Handle recording
                  })
                  .catch(err => {
                    console.error('Microphone error:', err)
                    toast({
                      title: 'Error',
                      description: 'Failed to access microphone',
                      variant: 'destructive'
                    })
                  })
              }}
            >
              <Mic className="w-4 h-4 mr-2" />
              Voice
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(stream => {
                    console.log('Camera access granted')
                    // Handle camera
                  })
                  .catch(err => {
                    console.error('Camera error:', err)
                    toast({
                      title: 'Error',
                      description: 'Failed to access camera',
                      variant: 'destructive'
                    })
                  })
              }}
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
                    console.log('File selected:', e.target.files[0])
                    const formData = new FormData()
                    formData.append('image', e.target.files[0])
                    handleSubmit(formData)
                  }
                }}
              />
            </Button>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

