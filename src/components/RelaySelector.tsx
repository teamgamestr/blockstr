import { Check, ChevronsUpDown, Wifi, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";

interface RelaySelectorProps {
  className?: string;
}

export function RelaySelector(props: RelaySelectorProps) {
  const { className } = props;
  const { config, updateConfig, presetRelays = [] } = useAppContext();

  const selectedRelay = config.relayUrl;
  const setSelectedRelay = (relay: string) => {
    updateConfig((current) => ({ ...current, relayUrl: relay }));
  };

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedOption = presetRelays.find((option) => option.url === selectedRelay);

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;

    // Check if it already has a protocol
    if (trimmed.includes('://')) {
      return trimmed;
    }

    // Add wss:// prefix
    return `wss://${trimmed}`;
  };

  // Handle adding a custom relay
  const handleAddCustomRelay = (url: string) => {
    setSelectedRelay?.(normalizeRelayUrl(url));
    setOpen(false);
    setInputValue("");
  };

  // Check if input value looks like a valid relay URL
  const isValidRelayInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;

    // Basic validation - should contain at least a domain-like structure
    const normalized = normalizeRelayUrl(trimmed);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between bg-black border-gray-700 text-white hover:border-green-400 hover:bg-gray-900 font-retro text-xs", className)}
        >
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-green-400" />
            <span className="truncate">
              {selectedOption
                ? selectedOption.name
                : selectedRelay
                  ? selectedRelay.replace(/^wss?:\/\//, '')
                  : "Select relay..."
              }
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-black border-gray-700 text-white font-retro">
        <Command className="bg-black">
          <CommandInput
            placeholder="Search relays or type URL..."
            value={inputValue}
            onValueChange={setInputValue}
            className="text-xs bg-black text-white border-gray-700"
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && isValidRelayInput(inputValue) ? (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer hover:bg-gray-900 focus:bg-gray-900 text-xs"
                >
                  <Plus className="mr-2 h-3 w-3 text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-white">Add custom relay</span>
                    <span className="text-[0.65rem] text-gray-400">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-xs text-gray-500">
                  {inputValue ? "Invalid relay URL" : "No relay found."}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {presetRelays
                .filter((option) =>
                  !inputValue ||
                  option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.url.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((option) => (
                  <CommandItem
                    key={option.url}
                    value={option.url}
                    onSelect={(currentValue) => {
                      setSelectedRelay(normalizeRelayUrl(currentValue));
                      setOpen(false);
                      setInputValue("");
                    }}
                    className="hover:bg-gray-900 focus:bg-gray-900 text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3 text-green-400",
                        selectedRelay === option.url ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-white">{option.name}</span>
                      <span className="text-[0.65rem] text-gray-400">{option.url}</span>
                    </div>
                  </CommandItem>
                ))}
              {inputValue && isValidRelayInput(inputValue) && (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer border-t border-gray-700 hover:bg-gray-900 focus:bg-gray-900 text-xs"
                >
                  <Plus className="mr-2 h-3 w-3 text-green-400" />
                  <div className="flex flex-col">
                    <span className="text-white">Add custom relay</span>
                    <span className="text-[0.65rem] text-gray-400">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}