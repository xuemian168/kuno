import { 
  FileJson, 
  FileText, 
  Database,
  Globe,
  Code,
  Terminal,
  Cpu
} from 'lucide-react'

export const LanguageIcons: Record<string, React.ComponentType<any>> = {
  // JavaScript/TypeScript
  javascript: () => <div className="w-3 h-3 rounded-sm bg-yellow-400" />,
  typescript: () => <div className="w-3 h-3 rounded-sm bg-blue-500" />,
  js: () => <div className="w-3 h-3 rounded-sm bg-yellow-400" />,
  ts: () => <div className="w-3 h-3 rounded-sm bg-blue-500" />,
  jsx: () => <div className="w-3 h-3 rounded-sm bg-cyan-400" />,
  tsx: () => <div className="w-3 h-3 rounded-sm bg-cyan-600" />,
  
  // Web Technologies
  html: () => <div className="w-3 h-3 rounded-sm bg-orange-500" />,
  css: () => <div className="w-3 h-3 rounded-sm bg-blue-600" />,
  scss: () => <div className="w-3 h-3 rounded-sm bg-pink-500" />,
  sass: () => <div className="w-3 h-3 rounded-sm bg-pink-600" />,
  less: () => <div className="w-3 h-3 rounded-sm bg-blue-800" />,
  
  // Python
  python: () => <div className="w-3 h-3 rounded-sm bg-green-500" />,
  py: () => <div className="w-3 h-3 rounded-sm bg-green-500" />,
  
  // Java/JVM Languages
  java: () => <div className="w-3 h-3 rounded-sm bg-red-600" />,
  kotlin: () => <div className="w-3 h-3 rounded-sm bg-purple-500" />,
  scala: () => <div className="w-3 h-3 rounded-sm bg-red-500" />,
  
  // C Family
  c: () => <div className="w-3 h-3 rounded-sm bg-blue-700" />,
  cpp: () => <div className="w-3 h-3 rounded-sm bg-blue-800" />,
  'c++': () => <div className="w-3 h-3 rounded-sm bg-blue-800" />,
  csharp: () => <div className="w-3 h-3 rounded-sm bg-purple-600" />,
  'c#': () => <div className="w-3 h-3 rounded-sm bg-purple-600" />,
  
  // System Languages
  rust: () => <div className="w-3 h-3 rounded-sm bg-orange-600" />,
  go: () => <div className="w-3 h-3 rounded-sm bg-cyan-500" />,
  golang: () => <div className="w-3 h-3 rounded-sm bg-cyan-500" />,
  
  // Functional Languages
  haskell: () => <div className="w-3 h-3 rounded-sm bg-purple-700" />,
  elixir: () => <div className="w-3 h-3 rounded-sm bg-purple-400" />,
  erlang: () => <div className="w-3 h-3 rounded-sm bg-red-700" />,
  
  // Scripting Languages
  php: () => <div className="w-3 h-3 rounded-sm bg-purple-800" />,
  ruby: () => <div className="w-3 h-3 rounded-sm bg-red-500" />,
  perl: () => <div className="w-3 h-3 rounded-sm bg-blue-900" />,
  
  // Data & Config
  json: FileJson,
  yaml: () => <div className="w-3 h-3 rounded-sm bg-gray-600" />,
  yml: () => <div className="w-3 h-3 rounded-sm bg-gray-600" />,
  toml: () => <div className="w-3 h-3 rounded-sm bg-gray-500" />,
  xml: () => <div className="w-3 h-3 rounded-sm bg-orange-700" />,
  
  // Database
  sql: Database,
  mysql: Database,
  postgresql: Database,
  
  // Shell/Terminal
  bash: Terminal,
  sh: Terminal,
  zsh: Terminal,
  powershell: Terminal,
  cmd: Terminal,
  
  // Markup
  markdown: FileText,
  md: FileText,
  
  // Others
  text: FileText,
  txt: FileText,
  dockerfile: () => <div className="w-3 h-3 rounded-sm bg-blue-400" />,
  
  // Default fallback
  default: Code
}

export function getLanguageIcon(language: string): React.ComponentType<any> {
  const normalizedLang = language.toLowerCase().trim()
  return LanguageIcons[normalizedLang] || LanguageIcons.default
}