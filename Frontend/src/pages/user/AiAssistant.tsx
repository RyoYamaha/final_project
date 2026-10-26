import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowLeft,
  BookOpen,
  Copy,
  Check,
  Lightbulb,
} from 'lucide-react'
import { contentService } from '@/services/content.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
}

const DEFAULT_PROMPTS = [
  { label: 'Tóm tắt cốt truyện', prompt: 'Hãy tóm tắt ngắn gọn cốt truyện chính của tác phẩm này.' },
  { label: 'Phân tích nhân vật', prompt: 'Ai là nhân vật chính và họ có động cơ hay tính cách gì nổi bật?' },
  { label: 'Bối cảnh thế giới', prompt: 'Giải thích thế giới, các quy tắc sức mạnh hoặc bối cảnh trong tác phẩm này.' },
  { label: 'Điểm đáng chú ý', prompt: 'Tác phẩm này có những điểm sáng hay chi tiết nào độc đáo đáng chú ý?' },
]

export function AiAssistant() {
  const { contentId } = useParams<{ contentId: string }>()
  const user = useAuthStore((state) => state.user)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', contentId],
    enabled: !!contentId,
    queryFn: async () => (await contentService.getDetail(contentId!)).data,
  })

  useEffect(() => {
    if (content && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Xin chào ${user?.username || 'bạn'}! Tôi là Trợ lý AI Nova, chuyên gia hỗ trợ bạn tìm hiểu và đồng hành khi đọc tác phẩm **"${content.title}"**.\n\nBạn có thể hỏi tôi về tóm tắt cốt truyện, giải thích bối cảnh, phân tích tuyến nhân vật hoặc các tình tiết bạn đang quan tâm!`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    }
  }, [content, user, messages.length])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (userPrompt?: string) => {
    const textToSend = (userPrompt ?? input).trim()
    if (!textToSend || isTyping) return

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!userPrompt) setInput('')
    setIsTyping(true)

    // Simulate intelligent AI contextual response tailored to the story
    setTimeout(() => {
      let reply = ''
      const promptLower = textToSend.toLowerCase()
      const title = content?.title || 'tác phẩm này'
      const synopsis = content?.synopsis || ''
      const chaptersCount = content?.chapters?.length || 0

      if (promptLower.includes('tóm tắt') || promptLower.includes('cốt truyện')) {
        reply = `**Tóm tắt cốt truyện "${title}":**\n\n${
          synopsis
            ? synopsis
            : `Tác phẩm theo chân các nhân vật chính đối mặt với thử thách sinh tồn, khám phá và vượt qua các thử thách kịch tính.`
        }\n\nHiện tại truyện đã phát hành **${chaptersCount} chương** trên nền tảng Nova Manga. Bạn nên bắt đầu từ chương 1 để cảm nhận trọn vẹn nhịp độ câu chuyện!`
      } else if (promptLower.includes('nhân vật') || promptLower.includes('ai là')) {
        reply = `**Về tuyến nhân vật trong "${title}":**\n\nNhân vật trung tâm được xây dựng với chiều sâu tâm lý rõ nét, bắt đầu từ vị trí khiêm tốn rồi dần bộc lộ tiềm năng qua các biến cố quan trọng. Bên cạnh đó, các nhân vật phụ cũng sở hữu động cơ và lý tưởng riêng biệt, tạo nên những màn đối đầu kịch tính và những nút thắt cảm xúc bất ngờ.`
      } else if (promptLower.includes('thế giới') || promptLower.includes('bối cảnh') || promptLower.includes('quy tắc')) {
        reply = `**Bối cảnh và thế giới của "${title}":**\n\nThế giới truyện thuộc thể loại **${content?.genres.map((g) => g.genre.name).join(', ') || 'Hành động / Phiêu lưu'}**, nơi các thế lực tranh giành quyền lực và tài nguyên. Cấu trúc thế giới có tính logic cao, các quy tắc chiến đấu và quan hệ chính trị giữa các phe phái được tác giả hé lộ khéo léo qua từng chương.`
      } else if (promptLower.includes('đáng chú ý') || promptLower.includes('điểm sáng')) {
        reply = `**Điểm nổi bật của "${title}":**\n\n1. **Tiết tấu cuốn hút:** Các chương kết thúc với cú twist giữ chân người đọc.\n2. **Chiều sâu tư tưởng:** Không chỉ là giải trí, tác phẩm còn khơi gợi các câu hỏi về niềm tin và sự hy sinh.\n3. **Cộng đồng sôi nổi:** Độc giả để lại rất nhiều bình luận giả thuyết thú vị bên dưới mỗi chương!`
      } else {
        reply = `Cảm ơn câu hỏi của bạn về **"${title}"**! Về vấn đề này, trong mạch truyện hiện tại, tác giả đang xây dựng nhiều chi tiết cài cắm (foreshadowing). Bạn hãy đọc tiếp các chương mới nhất hoặc trao đổi thêm với cộng đồng độc giả trong phần bình luận để khám phá thêm nhiều giả thuyết thú vị nhé!`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setIsTyping(false)
    }, 1200)
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-4xl flex-col rounded-3xl border border-white/10 bg-[#1e2631] shadow-2xl overflow-hidden">
      {/* 1. ASSISTANT HEADER */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#252f3b] px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-xl px-2.5 hover:bg-white/5">
            <Link to={contentId ? `/content/${contentId}` : '/'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-purple-600 shadow-md">
            <Bot className="h-5 w-5 text-black" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Nova AI Reader Assistant</h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sẵn sàng
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-md">
              {isLoading ? 'Đang kết nối...' : `Đang hỗ trợ đọc: ${content?.title || 'Tác phẩm'}`}
            </p>
          </div>
        </div>

        {contentId && (
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex rounded-xl border-white/10 text-xs">
            <Link to={`/content/${contentId}`}>
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Xem truyện
            </Link>
          </Button>
        )}
      </header>

      {/* 2. CHAT MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs font-bold ${
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-[#252f3b] text-primary border border-primary/20'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>

              <div
                className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-[#252f3b] text-foreground rounded-tl-sm border border-white/10'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>

                <div
                  className={`mt-2 flex items-center justify-between text-[10px] ${
                    isUser ? 'text-primary-foreground/75' : 'text-muted-foreground'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.id, msg.text)}
                      className="ml-3 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#252f3b] border border-primary/20 text-primary">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-[#252f3b] px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 3. PROMPT CHIPS */}
      <div className="border-t border-white/5 bg-[#252f3b]/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 flex items-center gap-1 text-muted-foreground font-medium pl-1">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Gợi ý:
          </span>
          {DEFAULT_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={isTyping}
              onClick={() => handleSend(p.prompt)}
              className="shrink-0 rounded-full border border-white/10 bg-[#252f3b] px-3 py-1 text-slate-300 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. CHAT INPUT BAR */}
      <div className="border-t border-white/10 bg-[#252f3b] p-4">
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
            placeholder={`Hỏi AI bất kỳ điều gì về ${content?.title || 'truyện'}...`}
            disabled={isTyping}
            className="h-11 rounded-2xl border-white/10 bg-[#1e2631] px-4 text-sm focus-visible:ring-primary placeholder:text-muted-foreground/60"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="h-11 w-11 shrink-0 rounded-2xl px-0 shadow-md shadow-primary/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

export default AiAssistant
