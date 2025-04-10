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

  const handleNameSubmit = (name: string) => {
    setUserName(name)
    setShowWelcome(false)
    
    // Add a welcome message from Bella
    setTimeout(() => {
      setMessages([
        { 
          id: Date.now().toString(),
          role: 'assistant' as const, 
          content: `Hi ${name}! I'm Bella, Christian Gates' scheduling assistant. How can I help you schedule something today?` 
        }
      ])
    }, 500)
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return
    
    // Add user message
    const newMessages = [...messages, { 
      id: Date.now().toString(),
      role: 'user' as const, 
      content: message 
    }]
    setMessages(newMessages)
    setIsLoading(true)
    
    try {
      // Send message to Lindy
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          userName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      // Add Lindy's response
      setMessages(messages => [...messages, { 
        id: Date.now().toString(),
        role: 'assistant' as const, 
        content: data.content || 'I apologize, but I encountered an error processing your request.'
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