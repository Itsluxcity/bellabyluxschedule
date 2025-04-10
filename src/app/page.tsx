'use client'

import { useState } from 'react'
import ChatInput from '@/components/ChatInput'
import MessageList from '@/components/MessageList'
import SuggestionBubbles from '@/components/SuggestionBubbles'
import WelcomeOverlay from '@/components/WelcomeOverlay'
import { Message } from '@/types'

interface SchedulingDetails {
  date: string;
  time: string;
  duration: string;
  purpose: string;
  participants: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [schedulingDetails, setSchedulingDetails] = useState<SchedulingDetails | null>(null)

  const handleNameSubmit = (name: string) => {
    setUserName(name)
    setShowWelcome(false)
    setMessages([
      { 
        id: Date.now().toString(),
        role: 'assistant' as const, 
        content: `Hi ${name}! I'm Bella, Christian Gates' scheduling assistant. How can I help you schedule something today?` 
      }
    ])
  }

  const formatMessageForLindy = (message: string) => {
    return `User speaking: ${userName}\nMessage: ${message}`
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return
    
    setIsLoading(true)
    const userMessage = { 
      id: Date.now().toString(),
      role: 'user' as const, 
      content: message 
    }
    
    try {
      // Add user message first
      setMessages(prev => [...prev, userMessage])

      // Send message to Lindy
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          userName,
          taskId: currentTaskId // Pass the current taskId if we have one
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Only update taskId if we get a new one and don't have one yet
      if (data.taskId && !currentTaskId) {
        setCurrentTaskId(data.taskId)
      }
      
      if (data.schedulingDetails) {
        setSchedulingDetails(data.schedulingDetails)
      }

      // Make sure we have content before adding the message
      if (data.content) {
        setMessages(prev => [
          ...prev,
          { 
            id: Date.now().toString(),
            role: 'assistant' as const, 
            content: data.content
          }
        ])
      } else {
        throw new Error('No response content received')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev,
        { 
          id: Date.now().toString(),
          role: 'assistant' as const, 
          content: 'I apologize, but I encountered an error processing your request. Please try again.'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      {showWelcome ? (
        <WelcomeOverlay onSubmit={handleNameSubmit} />
      ) : (
        <div className="chat-container">
          <MessageList messages={messages} isLoading={isLoading} />
          <div className="fixed-bottom">
            <SuggestionBubbles onSelect={handleSendMessage} />
            <div className="input-container">
              <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
} 