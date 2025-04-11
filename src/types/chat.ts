export interface Message {
  role: 'user' | 'assistant';
  content: string;
  userName?: string;
  schedulingDetails?: {
    date?: string;
    time?: string;
    timezone?: string;
  };
}

export interface LindyRequest {
  messages: Message[];
  metadata: {
    userName?: string;
    schedulingDetails?: {
      date?: string;
      time?: string;
      timezone?: string;
    };
    conversationId?: string;
    followUpUrl?: string;
  };
}

export interface LindyResponse {
  message: Message;
  conversationId?: string;
  followUpUrl?: string;
}

export interface TaskData {
  threadId: string;
  lastMessageId: string;
  conversationId?: string;
  followUpUrl?: string;
} 