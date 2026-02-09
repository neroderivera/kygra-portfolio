
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Minus, Terminal as TerminalIcon } from "lucide-react";

type HistoryItem = {
  type: "command" | "output";
  content: React.ReactNode;
};

type TerminalTheme = "tokyo-night" | "catppuccin" | "minimal";

interface ThemeColors {
  bg: string;
  bgOverlay: string;
  header: string;
  border: string;
  text: string;
  textMuted: string;
  prompt: string;
  path: string;
  command: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  accent: string;
}

const themes: Record<TerminalTheme, ThemeColors> = {
  "tokyo-night": {
    bg: "bg-[#1a1b26]/95",
    bgOverlay: "bg-black/40",
    header: "bg-[#16161e]",
    border: "border-[#414868]",
    text: "text-[#c0caf5]",
    textMuted: "text-[#565f89]",
    prompt: "text-[#9ece6a]",
    path: "text-[#7dcfff]",
    command: "text-[#c0caf5]",
    success: "text-[#9ece6a]",
    error: "text-[#f7768e]",
    warning: "text-[#e0af68]",
    info: "text-[#7dcfff]",
    accent: "text-[#bb9af7]",
  },
  catppuccin: {
    bg: "bg-[#1e1e2e]/95",
    bgOverlay: "bg-black/30",
    header: "bg-[#181825]",
    border: "border-[#45475a]",
    text: "text-[#cdd6f4]",
    textMuted: "text-[#6c7086]",
    prompt: "text-[#a6e3a1]",
    path: "text-[#89dceb]",
    command: "text-[#cdd6f4]",
    success: "text-[#a6e3a1]",
    error: "text-[#f38ba8]",
    warning: "text-[#f9e2af]",
    info: "text-[#89b4fa]",
    accent: "text-[#cba6f7]",
  },
  minimal: {
    bg: "bg-card/60",
    bgOverlay: "bg-background/10",
    header: "bg-muted/30",
    border: "border-primary/10",
    text: "text-foreground/90",
    textMuted: "text-muted-foreground/60",
    prompt: "text-primary",
    path: "text-primary/70",
    command: "text-foreground",
    success: "text-primary",
    error: "text-destructive",
    warning: "text-primary/80",
    info: "text-primary/60",
    accent: "text-primary/90",
  },
};

export const Terminal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<TerminalTheme>(() => {
    const saved = localStorage.getItem("terminal-theme");
    return (saved as TerminalTheme) || "tokyo-night";
  });
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      type: "output",
      content: (
        <span>
          Welcome to <span className={themes[theme].accent}>kygra.xyz</span> terminal{" "}
          <span className={themes[theme].warning}>v1.0.0</span>
        </span>
      ),
    },
    {
      type: "output",
      content: (
        <span>
          Type <span className={themes[theme].info}>help</span> for available
          commands.
        </span>
      ),
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Toggle visibility with Ctrl+K or Backtick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === "k") || e.key === "`") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom on history update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Simple Levenshtein distance for fuzzy matching
  const getLevenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  };

  const findClosestTheme = (input: string): TerminalTheme | null => {
    const themeNames = Object.keys(themes) as TerminalTheme[];
    let minDistance = Infinity;
    let closestTheme: TerminalTheme | null = null;

    for (const themeName of themeNames) {
      const distance = getLevenshteinDistance(input.toLowerCase(), themeName);
      if (distance < minDistance) {
        minDistance = distance;
        closestTheme = themeName;
      }
    }

    // Only suggest if the distance is reasonable (<=3 for typos)
    return minDistance <= 3 ? closestTheme : null;
  };

  const handleCommand = (cmd: string) => {
    const parts = cmd.trim().split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const newHistory: HistoryItem[] = [
      ...history,
      { type: "command", content: cmd },
    ];

    switch (command) {
      case "help":
        newHistory.push({
          type: "output",
          content: (
            <div className="flex flex-col gap-1">
              <div className={`${themes[theme].info} mb-2`}>Available commands:</div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className={themes[theme].info}>help</span>
                <span className={themes[theme].textMuted}>Show this help message</span>

                <span className={themes[theme].info}>ls</span>
                <span className={themes[theme].textMuted}>List available pages</span>

                <span className={themes[theme].info}>cd</span>
                <span className={themes[theme].textMuted}>Navigate to a page (usage: cd [page])</span>

                <span className={themes[theme].info}>theme</span>
                <span className={themes[theme].textMuted}>Change terminal theme (usage: theme [name])</span>

                <span className={themes[theme].info}>whoami</span>
                <span className={themes[theme].textMuted}>Display current user</span>

                <span className={themes[theme].info}>date</span>
                <span className={themes[theme].textMuted}>Show current date/time</span>

                <span className={themes[theme].info}>clear</span>
                <span className={themes[theme].textMuted}>Clear terminal history</span>

                <span className={themes[theme].info}>exit</span>
                <span className={themes[theme].textMuted}>Close terminal</span>
              </div>
            </div>
          ),
        });
        break;
      case "ls":
        newHistory.push({
          type: "output",
          content: (
            <div className="flex gap-4">
              <span className={themes[theme].success}>index</span>
              <span className={themes[theme].success}>writings</span>
              <span className={themes[theme].success}>projects</span>
              <span className={themes[theme].success}>artifacts</span>
              <span className={themes[theme].success}>guestbook</span>
            </div>
          ),
        });
        break;
      case "cd":
      case "goto":
        if (args.length === 0) {
          newHistory.push({
            type: "output",
            content: (
              <span>
                Usage: <span className={themes[theme].warning}>cd [page]</span>
              </span>
            ),
          });
        } else {
          const target = args[0].toLowerCase();
          const routes: Record<string, string> = {
            index: "/",
            home: "/",
            writings: "/writings",
            projects: "/projects",
            artifacts: "/artifacts",
            gallery: "/artifacts",
            guestbook: "/guestbook",
          };

          if (routes[target]) {
            newHistory.push({
              type: "output",
              content: (
                <span>
                  Navigating to <span className={themes[theme].success}>{target}</span>
                  ...
                </span>
              ),
            });
            navigate(routes[target]);
            setIsOpen(false); // Optional: close on navigation
          } else {
            newHistory.push({
              type: "output",
              content: (
                <span className={themes[theme].error}>
                  Directory not found: {target}
                </span>
              ),
            });
          }
        }
        break;
      case "whoami":
        newHistory.push({
          type: "output",
          content: (
            <span className={`${themes[theme].accent} font-bold`}>Only you can ever truly know yourself.</span>
          ),
        });
        break;
      case "date":
        newHistory.push({
          type: "output",
          content: <span className={themes[theme].warning}>{new Date().toLocaleString()}</span>,
        });
        break;
      case "theme":
        if (args.length === 0 || args[0] === "list") {
          newHistory.push({
            type: "output",
            content: (
              <div className="flex flex-col gap-2">
                <div>Available themes:</div>
                <div className="flex gap-4 ml-2">
                  <span className={themes[theme].success}>tokyo-night</span>
                  <span className={themes[theme].success}>catppuccin</span>
                  <span className={themes[theme].success}>minimal</span>
                </div>
                <div className={themes[theme].textMuted}>Current: {theme}</div>
              </div>
            ),
          });
        } else {
          const newTheme = args[0].toLowerCase() as TerminalTheme;
          if (themes[newTheme]) {
            setTheme(newTheme);
            localStorage.setItem("terminal-theme", newTheme);
            newHistory.push({
              type: "output",
              content: (
                <span>
                  Theme changed to <span className={themes[newTheme].success}>{newTheme}</span>
                </span>
              ),
            });
          } else {
            const suggestion = findClosestTheme(args[0]);
            newHistory.push({
              type: "output",
              content: suggestion ? (
                <span className={themes[theme].error}>
                  Unknown theme: {args[0]}. Did you mean "<span className={themes[theme].success}>{suggestion}</span>"?
                </span>
              ) : (
                <span className={themes[theme].error}>
                  Unknown theme: {args[0]}. Use "theme list" to see available themes.
                </span>
              ),
            });
          }
        }
        break;
      case "clear":
        setHistory([]);
        return; // Return early to avoid setting history with 'clear' command
      case "exit":
        setIsOpen(false);
        break;
      case "":
        break;
      default:
        newHistory.push({
          type: "output",
          content: (
            <span>
              Command not found: <span className={themes[theme].error}>{command}</span>
            </span>
          ),
        });
    }

    setHistory(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${themes[theme].bgOverlay} z-50 flex items-center justify-center backdrop-blur-sm`}
      onClick={() => setIsOpen(false)}
    >
      <div
        className={`w-full max-w-2xl h-96 ${themes[theme].bg} border ${themes[theme].border} rounded-lg shadow-2xl flex flex-col font-mono text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-8 ${themes[theme].header} border-b ${themes[theme].border} flex items-center justify-between px-3 select-none`}>
          <div className={`flex items-center gap-2 ${themes[theme].info}`}>
            <TerminalIcon size={14} />
            <span className="text-xs">guest@kygra.xyz:~</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className={`${themes[theme].textMuted} hover:${themes[theme].text} transition-colors`}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={`${themes[theme].textMuted} hover:${themes[theme].error} transition-colors`}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 p-4 overflow-y-auto ${themes[theme].text} scrollbar-thin scrollbar-thumb-[#414868] scrollbar-track-transparent`}
          onClick={() => inputRef.current?.focus()}
        >
          {history.map((item, i) => (
            <div key={i} className="mb-1 whitespace-pre-wrap break-words">
              {item.type === "command" ? (
                <div className={`flex gap-2 ${themes[theme].command}`}>
                  <span className={themes[theme].prompt}>➜</span>
                  <span className={themes[theme].path}>~</span>
                  <span className="font-bold">{item.content}</span>
                </div>
              ) : (
                <div className="ml-6">{item.content}</div>
              )}
            </div>
          ))}

          <div className={`flex gap-2 items-center ${themes[theme].command} mt-1`}>
            <span className={themes[theme].prompt}>➜</span>
            <span className={themes[theme].path}>~</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`flex-1 bg-transparent border-none outline-none ${themes[theme].command} placeholder-${themes[theme].textMuted}`}
              autoFocus
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};
