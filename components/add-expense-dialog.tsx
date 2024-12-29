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
import { Mic, Plus, Loader2, PlayCircle, StopCircle, Trash2, Camera, Image } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AddExpenseDialogProps {
  onSuccessfulSubmit?: () => void
}

export function AddExpenseDialog({ onSuccessfulSubmit }: AddExpenseDialogProps) {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(current => [...current, event.data])
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }

      recorder.start()
      setIsListening(true)
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone"
      })
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive"
      })
    }
  }, [audioChunks, toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setIsListening(false)
      toast({
        title: "Recording completed",
        description: "You can now review your recording"
      })
    }
  }, [mediaRecorder, toast])

  const playRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play()
    }
  }, [audioUrl])

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setAudioBlob(null)
    setAudioChunks([])
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
    if (!userId) return
    if (!text && !audioBlob && !selectedImage) {
      toast({
        title: "Error",
        description: "Please add some expense details",
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
        // Send audio as a file
        const audioFile = new File([audioBlob], 'voice-note.wav', { type: 'audio/wav' })
        formData.append('audio', audioFile)
      } else if (selectedImage) {
        formData.append('type', 'image')
        formData.append('image', selectedImage)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/wallet`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to submit. Status: ${response.status}`)
      }

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
            Add your expense details using text, voice, or image.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
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
                      onLoadedMetadata={() => {
                        console.log('Video metadata loaded')
                        if (videoRef.current) {
                          videoRef.current.play()
                            .then(() => {
                              console.log('Video playback started successfully')
                            })
                            .catch(err => {
                              console.error('Error playing video:', err)
                              toast({
                                title: "Error",
                                description: "Could not start video preview",
                                variant: "destructive"
                              })
                            })
                        }
                      }}
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
                <div className="space-y-2">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Selected"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={clearImage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isProcessing || (!text && !audioBlob && !selectedImage)}
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
  )
}

