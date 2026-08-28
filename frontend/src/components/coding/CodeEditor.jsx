import { useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'

const EDITOR_THEMES = {
  'arena-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c084fc' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'type', foreground: '60a5fa' },
      { token: 'function', foreground: '818cf8' },
    ],
    colors: {
      'editor.background': '#0d0d14',
      'editor.foreground': '#e2e8f0',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.selectionBackground': '#6366f140',
      'editorCursor.foreground': '#818cf8',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editor.selectionHighlightBackground': '#6366f120',
      'editorIndentGuide.background': '#1e293b',
      'editorIndentGuide.activeBackground': '#334155',
      'scrollbarSlider.background': '#ffffff10',
      'scrollbarSlider.hoverBackground': '#ffffff20',
    }
  }
}

const LANGUAGE_MAP = {
  cpp: 'cpp',
  java: 'java',
  python: 'python',
  javascript: 'javascript'
}

export default function CodeEditor({ language = 'python', value = '', onChange, onRun, onSubmit, readOnly = false }) {
  const editorRef = useRef(null)

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    
    // Define custom theme
    monaco.editor.defineTheme('arena-dark', EDITOR_THEMES['arena-dark'])
    monaco.editor.setTheme('arena-dark')

    // Keyboard shortcuts
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRun?.()
    })

    editor.addAction({
      id: 'submit-code',
      label: 'Submit Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: () => onSubmit?.()
    })

    // Focus editor
    editor.focus()
  }, [onRun, onSubmit])

  const handleChange = useCallback((val) => {
    onChange?.(val || '')
  }, [onChange])

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-white/[0.06]">
      {/* Editor header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d0d14] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs text-white/30 ml-2 font-mono">
            solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'cpp' ? 'cpp' : 'java'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/25">
          <span>Ctrl+Enter: Run</span>
          <span>•</span>
          <span>Ctrl+Shift+Enter: Submit</span>
        </div>
      </div>

      <Editor
        height="calc(100% - 36px)"
        language={LANGUAGE_MAP[language] || 'python'}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        loading={
          <div className="flex items-center justify-center h-full bg-[#0d0d14]">
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm">Loading editor...</span>
            </div>
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          tabSize: language === 'python' ? 4 : 2,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          wordWrap: 'off',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          readOnly,
          domReadOnly: readOnly,
        }}
      />
    </div>
  )
}
