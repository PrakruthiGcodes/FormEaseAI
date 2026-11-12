// One chat message. Each message is labelled so an error is never mistaken for an AI reply.
// Props:
//   message: { role: 'user' | 'assistant', text, isError? }
export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  let classes = 'message '
  classes += isUser ? 'message-user' : 'message-assistant'
  if (message.isError) classes += ' message-error'

  let caption = null
  if (message.isError) {
    caption = 'Service error · no AI reply was generated'
  } else if (!isUser) {
    caption = 'FormEase AI reply'
  }

  return (
    <div className={classes}>
      {caption && <span className="message-caption">{caption}</span>}
      <p className="message-text">{message.text}</p>
    </div>
  )
}
