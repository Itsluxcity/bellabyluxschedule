'use client'

import { useState, useCallback, useRef } from 'react'
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

interface LindyResponse {
  content: string;
  taskId?: string;
  requiresDetails?: boolean;
  schedulingDetails?: SchedulingDetails;
  error?: string;
  details?: string;
  retryable?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [schedulingDetails, setSchedulingDetails] = useState<SchedulingDetails | null>(null)
  
  // Use refs for managing retries and message queue
  const retryCountRef = useRef(0);
  const messageQueueRef = useRef<Array<{message: string, retryCount: number}>>([]);
  const processingRef = useRef(false);

  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

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

  const formatMessage = useCallback((userName: string, message: string): string => {
    return `User speaking: ${userName}\nMessage: ${message}`.trim();
  }, []);

  const addAssistantMessage = useCallback((content: string) => {
    setMessages(prev => [
      ...prev,
      { 
        id: Date.now().toString(),
        role: 'assistant' as const, 
        content 
      }
    ]);
  }, []);

  // Process message queue
  const processMessageQueue = useCallback(async () => {
    if (processingRef.current || messageQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    
    try {
      const { message, retryCount } = messageQueueRef.current[0];
      
      // Prepare request for Lindy
      const formattedMessage = formatMessage(userName, message);
      const requestBody = {
        message: formattedMessage,
        taskId: currentTaskId
      };

      console.log('Processing message:', {
        message: formattedMessage,
        taskId: currentTaskId,
        retryCount,
        queueLength: messageQueueRef.current.length,
        timestamp: new Date().toISOString()
      });

      const response = await fetch('/api/lindy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data: LindyResponse = await response.json();
      
      if (!response.ok || data.error) {
        if (data.retryable && retryCount < MAX_RETRIES) {
          // Update retry count and requeue
          messageQueueRef.current[0].retryCount++;
          addAssistantMessage('I encountered a temporary issue. Let me try that again...');
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          processingRef.current = false;
          processMessageQueue();
          return;
        }
        
        // Handle non-retryable error or max retries reached
        addAssistantMessage(
          data.retryable 
            ? 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.'
            : 'I apologize, but I encountered an error processing your request. Please try rephrasing your message.'
        );
        messageQueueRef.current.shift(); // Remove failed message
        processingRef.current = false;
        processMessageQueue();
        return;
      }

      // Handle successful response
      if (data.taskId !== currentTaskId) {
        setCurrentTaskId(data.taskId || null);
      }

      if (data.schedulingDetails) {
        setSchedulingDetails(data.schedulingDetails);
      }

      addAssistantMessage(data.content);
      
      // Remove processed message and continue queue
      messageQueueRef.current.shift();
      
    } catch (error) {
      console.error('Error processing message:', error);
      addAssistantMessage('I encountered an unexpected error. Please try again.');
      messageQueueRef.current.shift(); // Remove failed message
    } finally {
      processingRef.current = false;
      // Process next message if any
      if (messageQueueRef.current.length > 0) {
        processMessageQueue();
      } else {
        setIsLoading(false);
      }
    }
  }, [currentTaskId, userName, addAssistantMessage]);

  // Queue new message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || (isLoading && messageQueueRef.current.length > 0)) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: message
    }]);

    messageQueueRef.current.push({
      message,
      retryCount: 0
    });

    processMessageQueue();
  }, [isLoading, processMessageQueue]);

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