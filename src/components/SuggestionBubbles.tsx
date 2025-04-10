'use client'

interface SuggestionBubblesProps {
  onSelect: (suggestion: string) => void;
}

export default function SuggestionBubbles({ onSelect }: SuggestionBubblesProps) {
  const suggestions = [
    "Schedule a day with Christian",
    // Add more suggestions here if needed
  ];

  return (
    <div className="suggestion-container">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="suggestion-bubble flex items-center gap-2"
          onClick={() => onSelect(suggestion)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          {suggestion}
        </button>
      ))}
    </div>
  );
} 