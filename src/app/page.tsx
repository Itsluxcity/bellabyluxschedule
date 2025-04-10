'use client'

import { useState } from 'react'
import ChatInput from '@/components/ChatInput'
import MessageList from '@/components/MessageList'
import SuggestionBubbles from '@/components/SuggestionBubbles'
import WelcomeOverlay from '@/components/WelcomeOverlay'
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
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
}

interface LindyResponse {
  content: string;
  taskId: string;
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentTaskId, setCurrentTaskId] = useState<string>('')
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

  const formatMessage = (userName: string, message: string): string => {
    return message.trim();  // No need for the "User speaking" prefix anymore
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Add user message first
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: message
      }]);

      // Format request for Lindy
      const lindyRequest: LindyRequest = {
        content: formatMessage(userName, message),
        taskId: currentTaskId,
        requiresDetails: true,
        schedulingDetails: {
          date: '',
          time: '',
          duration: '',
          purpose: '',
          participants: [userName]
        }
      };

      // Send to Lindy
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lindyRequest)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Always update taskId with what Lindy sends back
      setCurrentTaskId(data.taskId);

      // Add Lindy's response
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content
      }]);

      // Update scheduling details if provided
      if (data.schedulingDetails) {
        setSchedulingDetails(data.schedulingDetails);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
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