import { useParams } from 'react-router'

export function AiAssistant() {
  const { contentId } = useParams<{ contentId: string }>()

  return (
    <div className="flex flex-col h-[80vh] max-w-3xl mx-auto w-full p-4 border rounded-xl shadow-sm bg-card mt-6">
      <div className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">Trợ lý AI</h1>
        <p className="text-sm text-muted-foreground">Hỏi đáp cùng AI về tác phẩm (ID: {contentId})</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
            <circle cx="9" cy="9" r="1" />
            <circle cx="15" cy="9" r="1" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Tính năng đang trong quá trình bảo trì</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Trợ lý AI hiện đang được nâng cấp để phục vụ bạn tốt hơn. Quá trình bảo trì sẽ sớm hoàn tất. Xin cảm ơn sự kiên nhẫn của bạn!
        </p>
      </div>
    </div>
  )
}

export default AiAssistant
