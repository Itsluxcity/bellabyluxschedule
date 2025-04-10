'use client'

import { useState } from 'react'
import ChatInput from '@/components/ChatInput'
import MessageList from '@/components/MessageList'
import SuggestionBubbles from '@/components/SuggestionBubbles'
import WelcomeOverlay from '@/components/WelcomeOverlay'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

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
        { role: 'assistant' as const, content: `Hello ${name}! I'm Bella, your personal AI assistant. How can I help you today?` }
      ])
    }, 500)
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return
    
    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: message }]
    setMessages(newMessages)
    setIsLoading(true)
    
    // Simulate AI response
    setTimeout(() => {
      setMessages([
        ...newMessages,
        { role: 'assistant' as const, content: `I'm processing your request: "${message}". This is a placeholder response.` }
      ])
      setIsLoading(false)
    }, 1500)
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