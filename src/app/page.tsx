'use client'

import { useState } from 'react'
import ChatInput from '@/components/ChatInput'
import MessageList from '@/components/MessageList'
import SuggestionBubbles from '@/components/SuggestionBubbles'
import WelcomeOverlay from '@/components/WelcomeOverlay'
import { Message } from '@/types'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  const handleNameSubmit = (name: string) => {
    setUserName(name)
    setShowWelcome(false)
    
    // Just add a welcome message, no Lindy request
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
    if (!message.trim()) return
    
    // Add user message to chat
    const newMessages = [...messages, { 
      id: Date.now().toString(),
      role: 'user' as const, 
      content: message 
    }]
    setMessages(newMessages)
    setIsLoading(true)
    
    try {
      // Format and send message to Lindy
      const formattedMessage = formatMessageForLindy(message)
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: formattedMessage,
          userName,
          taskId: currentTaskId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Store taskId if provided
      if (data.taskId) {
        setCurrentTaskId(data.taskId)
      }
      
      // Add Lindy's response
      setMessages(messages => [...messages, { 
        id: Date.now().toString(),
        role: 'assistant' as const, 
        content: data.content
      }])
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message
      setMessages(messages => [...messages, { 
        id: Date.now().toString(),
        role: 'assistant' as const, 
        content: 'I apologize, but I encountered an error processing your request. Please try again.'
      }])
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