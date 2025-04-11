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
      // Show a "thinking" message while we wait
      const thinkingMessage: Message = {
        id: 'thinking',
        role: 'assistant',
        content: 'Thinking...',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, thinkingMessage]);

      // Start polling for response
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts * 5 seconds = 300 seconds (5 minutes) max wait
      let response = null;
      let data = null;

      while (attempts < maxAttempts) {
        console.log(`Attempt ${attempts + 1} of ${maxAttempts}`);
        
        try {
          // First wait 5 seconds
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Then make the request
          response = await fetch('/api/lindy', {
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

          data = await response.json();
          
          // If we got a valid response with content, use it
          if (response.ok && data.content) {
            // Remove thinking message
            setMessages(prev => prev.filter(msg => msg.id !== 'thinking'));

            // Add Bella's response
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

            return;
          }

          // If we got an error that's not a timeout, break
          if (response.status !== 504) {
            break;
          }

          attempts++;
        } catch (error) {
          console.log(`Attempt ${attempts + 1} failed:`, error);
          attempts++;
        }
      }

      // If we get here, we've timed out or got an error
      setMessages(prev => prev.filter(msg => msg.id !== 'thinking'));
      
      const errorDetails = data || { error: 'Timeout waiting for response after 5 minutes' };
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an issue: ${errorDetails.error || 'No response received after 5 minutes of trying'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);

    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== 'thinking'));
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
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