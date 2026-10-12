import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  suggestions?: string[];
  restrictToSuggestions?: boolean;
  className?: string;
  error?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  addLabel = 'Add',
  suggestions = [],
  className,
  error,
}: TagInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsAdding(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  const availableSuggestions = suggestions.filter(
    (s) => !value.includes(s)
  );

  return (
    <div 
      className={cn(
        "min-h-12 w-full rounded-md border border-input bg-background/50 p-2 text-sm ring-offset-background flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all",
        error && "border-destructive focus-within:ring-destructive",
        className
      )}
      ref={wrapperRef}
      onClick={() => {
        if (!isAdding) {
          setIsAdding(true);
          setShowSuggestions(true);
        }
      }}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary/80 text-secondary-foreground text-xs font-medium border border-border"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
            <span className="sr-only">Remove {tag}</span>
          </button>
        </span>
      ))}
      
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsAdding(!isAdding);
            setShowSuggestions(!showSuggestions);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground/50 hover:bg-muted/50 text-xs font-medium transition-all"
        >
          <Plus className="w-3 h-3" />
          {addLabel}
        </button>

        {showSuggestions && (
          <div className="absolute top-full left-0 mt-2 w-max min-w-[150px] max-w-[300px] bg-popover text-popover-foreground rounded-md border shadow-md z-50 overflow-hidden flex flex-col max-h-[200px] overflow-y-auto">
            <div className="p-1.5 flex flex-col">
              <span className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Select available options
              </span>
              {availableSuggestions.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground italic">
                  No options available
                </div>
              ) : (
                availableSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addTag(suggestion);
                    }}
                    className="text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
