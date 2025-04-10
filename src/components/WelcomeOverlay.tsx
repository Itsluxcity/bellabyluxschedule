'use client'

import { useState } from 'react'

interface WelcomeOverlayProps {
  onSubmit: (name: string) => void
}

export default function WelcomeOverlay({ onSubmit }: WelcomeOverlayProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setIsSubmitting(true)
      onSubmit(name.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Animated background with fog effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animated-bg" />
        <div className="fog-background" />
      </div>
      
      {/* Content container with proper spacing */}
      <div className="relative h-full flex flex-col items-center">
        {/* Welcome text positioned at the top */}
        <div className="text-center mt-32 mb-32">
          <h2 className="text-3xl font-light text-white mb-4">Hey, I'm Bella! 👋</h2>
          <p className="text-xl text-white text-opacity-90">Who am I speaking with?</p>
        </div>
        
        {/* Input form positioned at the bottom */}
        <div className="w-full max-w-md px-4 mt-auto mb-32">
          <form onSubmit={handleSubmit} className="welcome-input">
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full p-4 pr-12 text-white bg-chat-input-bg rounded-2xl focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors bg-white bg-opacity-10 rounded-full hover:bg-opacity-20"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L12 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 10L12 4L18 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 