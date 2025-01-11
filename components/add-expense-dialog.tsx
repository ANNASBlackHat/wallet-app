'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mic, Plus, Loader2, PlayCircle, StopCircle, Trash2, Camera, Image, Maximize2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { updateMonthlySummary } from '@/lib/expense-helpers'

interface AddExpenseDialogProps {
  onSuccessfulSubmit?: () => void
}

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  total: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
})

interface ImagePreviewProps {
  src: string
  onClear: () => void
}

function ImagePreview({ src, onClear }: ImagePreviewProps) {
  const [showFullImage, setShowFullImage] = useState(false)

  return (
    <>
      <div className="space-y-2">
        <div className="relative rounded-lg border bg-background">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Selected"
              className="w-full h-auto max-h-[300px] object-contain"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setShowFullImage(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={onClear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Full size preview"
              className="w-full h-auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AddExpenseDialog({ onSuccessfulSubmit }: AddExpenseDialogProps) {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('text')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  
  // Add manual form state
  const [manualForm, setManualForm] = useState({
    category: '',
    name: '',
    quantity: '',
    unit: '',
    total: '',
    description: ''
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      quantity: "",
      unit: "",
      total: "",
      description: "",
    },
  })

  // Add manual submit handler
  const handleManualSubmit = async () => {
    if (!userId) return
    if (!manualForm.category || !manualForm.name || !manualForm.total) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      const now = new Date()
      const yearMonth = now.toISOString().slice(0, 7) // YYYY-MM format

      // Create new expense document with the new structure
      const expenseData = {
        category: manualForm.category,
        name: manualForm.name,
        quantity: Number(manualForm.quantity) || 1,
        unit: manualForm.unit || "unit",
        amount: parseFloat(manualForm.total),
        description: manualForm.description || "",
        date: now,
        yearMonth,
        day: now.getDate()
      }

      // Add to expenses collection
      const expenseRef = await addDoc(collection(db, `wallet/${userId}/expenses`), expenseData)

      // Update monthly summary
      await updateMonthlySummary(userId, expenseData)

      toast({
        title: "Success",
        description: "Expense added successfully"
      })

      if (onSuccessfulSubmit) {
        onSuccessfulSubmit()
      }

      // Reset form
      setManualForm({
        category: '',
        name: '',
        quantity: '',
        unit: '',
        total: '',
        description: ''
      })
      setOpen(false)
    } catch (error) {
      console.error('Error adding expense:', error)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = useCallback(async () => {
    console.log('Starting audio recording...')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      })
      console.log('Audio stream obtained:', stream.getTracks())
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/mp4'
      })
      console.log('MediaRecorder created with mimeType:', recorder.mimeType)
      
      setMediaRecorder(recorder)
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        console.log('Data available event:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          chunks.push(event.data)
          setAudioChunks(current => [...current, event.data])
        }
      }

      recorder.onstop = () => {
        console.log('Recording stopped, processing audio chunks...')
        console.log('Number of audio chunks:', chunks.length)
        
        if (chunks.length === 0) {
          console.error('No audio chunks recorded')
          toast({
            title: "Error",
            description: "No audio was recorded. Please try again.",
            variant: "destructive"
          })
          return
        }
        
        const blob = new Blob(chunks, { type: recorder.mimeType })
        console.log('Created audio blob:', blob.size, 'bytes, type:', blob.type)
        
        if (blob.size === 0) {
          console.error('Created blob is empty')
          toast({
            title: "Error",
            description: "Recording failed. Please try again.",
            variant: "destructive"
          })
          return
        }
        
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        console.log('Created blob URL:', url)
        setAudioUrl(url)
      }

      // Request data every 1 second
      recorder.start(1000)
      console.log('Started recording with 1 second time slices')
      setIsListening(true)
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone"
      })
    } catch (error) {
      console.error('Detailed error accessing microphone:', error)
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive"
      })
    }
  }, [toast])

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...')
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log('Current recorder state:', mediaRecorder.state)
      
      // Request final data
      mediaRecorder.requestData()
      
      // Stop the recorder after a short delay to ensure we get the last chunk
      setTimeout(() => {
        mediaRecorder.stop()
        console.log('Stopping audio tracks...')
        mediaRecorder.stream.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind, track.label)
          track.stop()
        })
        setIsListening(false)
        toast({
          title: "Recording completed",
          description: "You can now review your recording"
        })
      }, 100)
    } else {
      console.log('No active recording to stop')
    }
  }, [mediaRecorder, toast])

  const playRecording = useCallback(() => {
    console.log('Attempting to play recording...')
    if (audioUrl && audioBlob && audioBlob.size > 0) {
      console.log('Using audio URL:', audioUrl)
      const audio = new Audio()
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e)
        toast({
          title: "Error",
          description: "Failed to play recording",
          variant: "destructive"
        })
      }
      
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded:', {
          duration: audio.duration,
          readyState: audio.readyState
        })
      }
      
      audio.oncanplay = () => {
        console.log('Audio can play, starting playback...')
        audio.play().catch(err => {
          console.error('Play error:', err)
          toast({
            title: "Error",
            description: "Failed to play recording. Please try recording again.",
            variant: "destructive"
          })
        })
      }
      
      audio.src = audioUrl
    } else {
      console.log('No valid audio available to play')
      toast({
        title: "Error",
        description: "No valid recording found",
        variant: "destructive"
      })
    }
  }, [audioUrl, audioBlob, toast])

  const clearRecording = useCallback(() => {
    console.log('Clearing recording...')
    if (audioUrl) {
      console.log('Revoking URL:', audioUrl)
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setAudioChunks([])
    console.log('Recording cleared')
  }, [audioUrl])

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
  }

  const clearImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSubmit = async () => {
    console.log('Active tab:', activeTab)
    
    if (activeTab === 'manual') {
      await handleManualSubmit()
      return
    }

    // Rest of the existing submit logic
    if (!text && !audioBlob && !selectedImage) {
      toast({
        title: "Error",
        description: "Please add some expense details",
        variant: "destructive"
      })
      return
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to add expenses",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('user_id', userId)
      
      if (text) {
        formData.append('type', 'text')
        formData.append('text', text)
      } else if (audioBlob) {
        formData.append('type', 'audio')
        const extension = mediaRecorder?.mimeType.includes('webm') ? 'webm' : 'mp4'
        const audioFile = new File([audioBlob], `voice-note.${extension}`, { 
          type: mediaRecorder?.mimeType || 'audio/webm' 
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

      if (!response.ok) throw new Error('Failed to submit')

      toast({
        title: "Success",
        description: "Your expense has been recorded"
      })

      if (onSuccessfulSubmit) {
        onSuccessfulSubmit()
      }

      // Clear the form
      setText('')
      clearRecording()
      clearImage()
      setOpen(false)
    } catch (error) {
      console.error('Error submitting expense:', error)
      toast({
        title: "Error",
        description: "Failed to record expense. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  const startCamera = async () => {
    console.log('Starting camera...')
    try {
      console.log('Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      console.log('Camera access granted, stream:', stream.getTracks())
      console.log('Video track settings:', stream.getVideoTracks()[0].getSettings())
      
      setVideoStream(stream)
      setIsCameraReady(true)
      
      toast({
        title: "Camera",
        description: "Camera started. Click 'Capture' when ready."
      })
    } catch (err) {
      console.error('Detailed camera error:', err)
      let errorMessage = "Could not access camera. "
      
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotFoundError':
            errorMessage += 'No camera found.'
            break
          case 'NotAllowedError':
            errorMessage += 'Camera permission denied.'
            break
          case 'NotReadableError':
            errorMessage += 'Camera is already in use.'
            break
          default:
            errorMessage += 'Please check your camera permissions.'
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const stopCamera = () => {
    console.log('Stopping camera...')
    if (videoStream) {
      console.log('Found active video stream, stopping tracks')
      videoStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`)
        track.stop()
      })
      setVideoStream(null)
      if (videoRef.current) {
        console.log('Clearing video source')
        videoRef.current.srcObject = null
      }
    } else {
      console.log('No video stream found to stop')
    }
  }

  const captureImage = () => {
    console.log('Attempting to capture image...')
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    console.log('Video dimensions:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      offsetWidth: video.offsetWidth,
      offsetHeight: video.offsetHeight
    })
    
    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    console.log('Canvas dimensions set to:', {
      width: canvas.width,
      height: canvas.height
    })
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }
    
    try {
      ctx.drawImage(video, 0, 0)
      console.log('Successfully drew video frame to canvas')
      
      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Successfully created blob:', blob.size, 'bytes')
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
          handleImageSelect(file)
          stopCamera()
        } else {
          console.error('Failed to create blob from canvas')
        }
      }, 'image/jpeg')
    } catch (err) {
      console.error('Error capturing image:', err)
    }
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Add your expense details using text, voice, image, or manual entry.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="text" className="w-full" value={activeTab} onValueChange={(value) => {
            console.log('Tab changed to:', value)
            setActiveTab(value)
          }}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="expense-text">Expense Details</Label>
                  <Textarea
                    id="expense-text"
                    placeholder="Example: I bought 2 pizzas for $25"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="voice" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={isListening ? "destructive" : "secondary"}
                    className="w-full"
                    onClick={isListening ? stopRecording : startRecording}
                  >
                    {isListening ? (
                      <>
                        <StopCircle className="mr-2 h-4 w-4 animate-pulse" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </>
                    )}
                  </Button>
                </div>

                {audioUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={playRecording}
                    >
                      <PlayCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={clearRecording}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={videoStream ? stopCamera : startCamera}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {videoStream ? 'Stop Camera' : 'Camera'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => document.getElementById('gallery')?.click()}
                  >
                    <Image className="mr-2 h-4 w-4" />
                    Gallery
                    <input
                      id="gallery"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageSelect(file)
                        }
                      }}
                    />
                  </Button>
                </div>

                {videoStream && !imagePreview && (
                  <div className="space-y-2">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      {isCameraReady && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10"
                          onClick={captureImage}
                        >
                          Capture
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {imagePreview && (
                  <ImagePreview
                    src={imagePreview}
                    onClear={clearImage}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select value={manualForm.category} onValueChange={(value) => setManualForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Bills">Bills</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g., Pizza" 
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      placeholder="1"
                      value={manualForm.quantity}
                      onChange={(e) => setManualForm(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="unit">Unit</Label>
                    <Input 
                      id="unit" 
                      placeholder="e.g., pcs"
                      value={manualForm.unit}
                      onChange={(e) => setManualForm(prev => ({ ...prev, unit: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="total">Amount (IDR)</Label>
                  <Input 
                    id="total" 
                    type="number" 
                    placeholder="25000"
                    value={manualForm.total}
                    onChange={(e) => setManualForm(prev => ({ ...prev, total: e.target.value }))}
                  />
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any additional details..."
                    className="min-h-[60px]"
                    value={manualForm.description}
                    onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

