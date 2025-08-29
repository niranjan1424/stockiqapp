import { useState, useEffect, useRef } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "../components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover"
import { Input } from "../components/ui/input" // Added import
import { Check, ChevronDown } from "lucide-react"

const SuggestionDropdown = ({ value, onChange, suggestions, placeholder, className }) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (selectedValue) => {
    setInputValue(selectedValue)
    onChange(selectedValue)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                onChange(e.target.value)
                setOpen(true)
              }}
              placeholder={placeholder}
              className={`w-full pr-10 ${className}`}
            />
            <ChevronDown className="absolute right-3 h-4 w-4 text-gray-400" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <Command>
            <CommandInput placeholder="Search stocks..." />
            <CommandEmpty>No results found</CommandEmpty>
            <CommandGroup>
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => handleSelect(suggestion)}
                  className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {suggestion}
                  {inputValue === suggestion && <Check className="ml-2 h-4 w-4 text-blue-600 dark:text-blue-400" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default SuggestionDropdown