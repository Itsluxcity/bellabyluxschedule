import { FC } from 'react';
import { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

declare const MessageList: FC<MessageListProps>;
export default MessageList; 