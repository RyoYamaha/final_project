import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AiReadingDrawerProps {
  isOpen: boolean
  onClose: () => void
  contentTitle?: string
  chapterNumber?: number
  chapterTitle?: string | null
  chapterContextText?: string
}

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  time: string
}

export function AiReadingDrawer({
  isOpen,
  onClose,
  contentTitle = 'Tác phẩm',
  chapterNumber,
  chapterTitle,
  chapterContextText,
}: AiReadingDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'init',
          sender: 'assistant',
          text: `Chào bạn! Tôi là Trợ lý AI đồng hành đọc truyện. Bạn đang đọc **${contentTitle}** - Chương ${chapterNumber}${
            chapterTitle ? `: "${chapterTitle}"` : ''
          }. Bạn cần tôi tóm tắt diễn biến chương này, giải thích nhân vật hay chi tiết nào không?`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
  }, [isOpen, contentTitle, chapterNumber, chapterTitle, messages.length])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  if (!isOpen) return null

  const handleSend = (presetText?: string) => {
    const textToSend = (presetText ?? input).trim()
    if (!textToSend || isTyping) return

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!presetText) setInput('')
    setIsTyping(true)

    setTimeout(() => {
      let reply = ''
      const lower = textToSend.toLowerCase()

      if (lower.includes('tóm tắt')) {
        reply = `**Tóm tắt chương ${chapterNumber}:**\n\n${
          chapterContextText
            ? chapterContextText.slice(0, 300) + '...'
            : 'Chương này đẩy nhịp độ câu chuyện lên cao trào với các biến chuyển then chốt trong tình huống của nhân vật chính, đối mặt với các thế lực đối kháng và mở ra ngã rẽ mới.'
        }\n\nĐiểm then chốt là bước ngoặt quyết định về chiến lược của nhân vật!`
      } else if (lower.includes('nhân vật')) {
        reply = `Trong chương ${chapterNumber}, sự tương tác giữa các nhân vật làm nổi bật sự mâu thuẫn giữa lý tưởng và thực tế. Nhân vật chính thể hiện sự kiên định trong khi các nhân vật đối lập bắt đầu tung ra các con bài chiến lược.`
      } else {
        reply = `Về thắc mắc của bạn đối với chương ${chapterNumber} của "${contentTitle}": Tác giả đã cài cắm tình tiết này nhằm chuẩn bị cho bước ngoặt ở các chương tiếp theo. Bạn hãy chú ý đến phản ứng của các nhân vật xung quanh nhé!`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setIsTyping(false)
    }, 1000)
  }

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#1e2631]/95 backdrop-blur-2xl shadow-2xl transition-all">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#252f3b] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-purple-600 text-black shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Trợ lý AI Đọc Truyện</h2>
            <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
              Chương {chapterNumber} · {contentTitle}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-lg p-0 hover:bg-white/10">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {messages.map((m) => {
          const isUser = m.sender === 'user'
          return (
            <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-[#252f3b] text-primary border border-primary/20'
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-[#252f3b] text-foreground rounded-tl-none border border-white/10'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
                  <span>{m.time}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => copy(m.id, m.text)}
                      className="ml-2 hover:text-foreground"
                    >
                      {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>AI đang phân tích chương...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested chips */}
      <div className="border-t border-white/5 bg-[#252f3b]/60 px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground shrink-0 font-medium">
            <Lightbulb className="h-3 w-3 text-amber-400" /> Gợi ý:
          </span>
          <button
            type="button"
            onClick={() => handleSend('Tóm tắt diễn biến chính của chương này')}
            className="shrink-0 rounded-full border border-white/10 bg-[#252f3b] px-2.5 py-0.5 text-slate-300 hover:border-primary/40 hover:text-primary"
          >
            Tóm tắt chương
          </button>
          <button
            type="button"
            onClick={() => handleSend('Phân tích tâm lý nhân vật trong cảnh vừa rồi')}
            className="shrink-0 rounded-full border border-white/10 bg-[#252f3b] px-2.5 py-0.5 text-slate-300 hover:border-primary/40 hover:text-primary"
          >
            Tâm lý nhân vật
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-[#252f3b] p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI về chương này..."
            disabled={isTyping}
            className="h-10 rounded-xl border-white/10 bg-[#1e2631] px-3 text-xs focus-visible:ring-primary"
          />
          <Button type="submit" size="sm" disabled={!input.trim() || isTyping} className="h-10 w-10 shrink-0 rounded-xl px-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
