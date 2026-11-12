import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'

// Scrollable conversation list. Scrolls to the newest message automatically.
export default function ChatWindow({ messages, isSending }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  if (messages.length === 0 && !isSending) {
    return (
      <div className="chat-window chat-empty">
        <p>Type your answer below to get started. Voice input is coming in a later phase.</p>
      </div>
    )
  }

  return (
    <div className="chat-window" role="log" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && (
        <div className="message message-assistant message-pending" role="status">
          <span className="typing-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="visually-hidden">FormEase AI is replying</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
