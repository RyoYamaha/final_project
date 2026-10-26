import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DialogOptions {
  title: string
  description: string
  confirmLabel?: string
}

interface ConfirmOptions extends DialogOptions {
  cancelLabel?: string
  tone?: 'default' | 'destructive'
}

interface DialogRequest extends ConfirmOptions {
  id: number
  kind: 'confirm' | 'alert'
}

interface AppDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: DialogOptions) => Promise<void>
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null)

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const resolver = useRef<((confirmed: boolean) => void) | null>(null)
  const nextDialogId = useRef(0)
  const dialogPanelRef = useRef<HTMLElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const closeDialog = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed)
    resolver.current = null
    setDialog(null)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    if (resolver.current) return Promise.resolve(false)

    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setDialog({
        ...options,
        id: ++nextDialogId.current,
        kind: 'confirm',
      })
    })
  }, [])

  const alert = useCallback((options: DialogOptions) => {
    if (resolver.current) return Promise.resolve()

    return new Promise<void>((resolve) => {
      resolver.current = () => resolve()
      setDialog({
        ...options,
        id: ++nextDialogId.current,
        kind: 'alert',
      })
    })
  }, [])

  useEffect(() => {
    if (!dialog) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog(false)
        return
      }

      if (event.key === 'Tab' && dialogPanelRef.current) {
        const focusableElements = dialogPanelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )
        const firstElement = focusableElements.item(0)
        const lastElement = focusableElements.item(focusableElements.length - 1)
        if (!firstElement || !lastElement) return

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [closeDialog, dialog])

  const isDestructive = dialog?.tone === 'destructive'

  return (
    <AppDialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog(false)
          }}
        >
          <section
            ref={dialogPanelRef}
            role={dialog.kind === 'confirm' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={`app-dialog-title-${dialog.id}`}
            aria-describedby={`app-dialog-description-${dialog.id}`}
            className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  isDestructive
                    ? 'bg-destructive/10 text-destructive'
                    : dialog.kind === 'confirm'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-sky-400/10 text-sky-300'
                }`}
              >
                {isDestructive
                  ? <AlertTriangle className="h-5 w-5" />
                  : dialog.kind === 'confirm'
                    ? <ShieldAlert className="h-5 w-5" />
                    : <Info className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h2 id={`app-dialog-title-${dialog.id}`} className="text-lg font-semibold">
                  {dialog.title}
                </h2>
                <p
                  id={`app-dialog-description-${dialog.id}`}
                  className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground"
                >
                  {dialog.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {dialog.kind === 'confirm' && (
                <Button variant="outline" onClick={() => closeDialog(false)}>
                  {dialog.cancelLabel ?? 'Hủy'}
                </Button>
              )}
              <Button
                ref={confirmButtonRef}
                variant={isDestructive ? 'destructive' : 'default'}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel ?? (dialog.kind === 'alert' ? 'Đã hiểu' : 'Xác nhận')}
              </Button>
            </div>
          </section>
        </div>
      )}
    </AppDialogContext.Provider>
  )
}

export function useAppDialog() {
  const context = useContext(AppDialogContext)
  if (!context) {
    throw new Error('useAppDialog must be used within AppDialogProvider')
  }
  return context
}
