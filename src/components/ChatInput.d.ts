import { FC } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

declare const ChatInput: FC<ChatInputProps>;
export default ChatInput; 