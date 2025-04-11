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
  const [schedulingDetails, setSchedulingDetails] = useState<SchedulingDetails>({})
  const [inputMessage, setInputMessage] = useState('')
  const [showSchedulingForm, setShowSchedulingForm] = useState(false)

  // Generate a new thread ID when the component mounts
  useEffect(() => {
    setThreadId(Date.now().toString());
  }, []);

  const handleNameSubmit = (name: string) => {
    setUserName(name);
    setShowWelcome(false);
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello ${name}! I'm Bella, your scheduling assistant. How can I help you today?`,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;

    // Format the message with the user's name
    const formattedMessage = `From ${userName}: ${message}`;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: formattedMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: formattedMessage,
          threadId: 'bella-scheduling',
          schedulingDetails: schedulingDetails
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Create a detailed error message
        const errorDetails = data.details || data.error || 'Unknown error occurred';
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${errorDetails}\n\nStatus: ${response.status}\nEndpoint: /api/lindy\nRequest: ${formattedMessage}\n\nPlease try again or contact support if this persists.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Add Bella's response to chat
      const bellaMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, bellaMessage]);

      // Update scheduling details if provided
      if (data.schedulingDetails) {
        setSchedulingDetails(data.schedulingDetails);
      }

      // If more details are required, show the scheduling form
      if (data.requiresDetails) {
        setShowSchedulingForm(true);
      }

    } catch (error) {
      // Create a detailed error message for network/parsing errors
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to server'}\n\nThis could be due to:\n- Network connectivity issues\n- Server being unavailable\n- Invalid response format\n\nPlease try again or contact support if this persists.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
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