import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

const DEBT_TYPES = ["LINE BK", "Shopee", "KTC", "Need", "Czech"]

interface TypeComboboxProps {
  value: string
  onChange: (value: string) => void
}

export function TypeCombobox({ value, onChange }: TypeComboboxProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local input in sync when the form resets (e.g. open Add dialog)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Suggestions = preset types + the current typed value if it's new
  const suggestions = [
    ...DEBT_TYPES,
    ...(inputValue && !DEBT_TYPES.includes(inputValue) ? [inputValue] : []),
  ]

  function handleSelect(selected: string) {
    onChange(selected)
    setInputValue(selected)
    setOpen(false)
  }

  function handleInputChange(val: string) {
    setInputValue(val)
    onChange(val)         // keep form in sync while typing
    if (!open) setOpen(true)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          type="button"
          onClick={() => {
            setOpen((o) => !o)
            // Focus the command input after opening
            setTimeout(() => inputRef.current?.focus(), 0)
          }}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select or type a type…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Type or search…"
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {suggestions.length === 0 ? (
              <CommandEmpty>No results.</CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((t) => (
                  <CommandItem
                    key={t}
                    value={t}
                    onSelect={() => handleSelect(t)}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === t ? "opacity-100" : "opacity-0")}
                    />
                    {t}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
