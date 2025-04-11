'use client'

import { useState, useEffect } from 'react'
import ChatInput from '../components/ChatInput'
import MessageList from '../components/MessageList'
import SuggestionBubbles from '../components/SuggestionBubbles'
import WelcomeOverlay from '../components/WelcomeOverlay'
import { Message } from '@/types'

interface SchedulingDetails {
  date?: string;
  time?: string;
  duration?: string;
  purpose?: string;
  participants?: string[];
}

interface LindyRequest {
  content: string;
  taskId?: string;
  followUpUrl?: string;
  schedulingDetails?: SchedulingDetails;
}

interface LindyResponse {
  content: string;
  taskId: string;
  followUpUrl?: string;
  schedulingDetails?: SchedulingDetails;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [threadId, setThreadId] = useState<string>('')
  const [schedulingDetails, setSchedulingDetails] = useState<SchedulingDetails | null>(null)

  // Generate a new thread ID when the component mounts
  useEffect(() => {
    setThreadId(Date.now().toString());
  }, []);

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

  const handleSubmit = async (message: string) => {
    try {
      // Add user message immediately
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'user', 
        content: message 
      }]);
      setIsLoading(true);

      // Send message to Lindy with thread ID
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content: message,
          threadId: threadId,
          schedulingDetails: schedulingDetails || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Wait for and process the response
      const data = await response.json();
      console.log('Received response:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.content) {
        throw new Error('No response content received');
      }

      // Add the response to messages
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: data.content 
      }]);

      // Update scheduling details if provided
      if (data.schedulingDetails) {
        setSchedulingDetails(data.schedulingDetails);
      }

    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      {showWelcome ? (
        <WelcomeOverlay onSubmit={handleNameSubmit} />
      ) : (
        <div className="chat-container">
          <MessageList messages={messages} isLoading={isLoading} />
          <div className="fixed-bottom">
            <SuggestionBubbles onSelect={handleSubmit} />
            <div className="input-container">
              <ChatInput onSendMessage={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
} 