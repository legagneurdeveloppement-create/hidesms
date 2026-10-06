"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"

// Safe arithmetic evaluator (supports + - × ÷ and parentheses, integers).
function evaluate(expr: string): number {
  const tokens = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .match(/(\d+\.?\d*|\+|-|\*|\/|\(|\))/g)
  if (!tokens) throw new Error("empty")

  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  const parseFactor = (): number => {
    const t = peek()
    if (t === "(") {
      next()
      const v = parseExpr()
      if (peek() === ")") next()
      return v
    }
    if (t === "-") {
      next()
      return -parseFactor()
    }
    if (t === "+") {
      next()
      return parseFactor()
    }
    const n = parseFloat(next())
    if (Number.isNaN(n)) throw new Error("bad number")
    return n
  }

  const parseTerm = (): number => {
    let v = parseFactor()
    while (peek() === "*" || peek() === "/") {
      const op = next()
      const r = parseFactor()
      v = op === "*" ? v * r : v / r
    }
    return v
  }

  const parseExpr = (): number => {
    let v = parseTerm()
    while (peek() === "+" || peek() === "-") {
      const op = next()
      const r = parseTerm()
      v = op === "+" ? v + r : v - r
    }
    return v
  }

  const result = parseExpr()
  if (pos < tokens.length) throw new Error("trailing")
  return result
}

// Fake cover screen: a fully functional calculator.
// Press and HOLD "=" for 1.2s to reveal the real PIN pad (still locked).
export function FakeCover() {
  const setView = useApp((s) => s.setView)
  const [expr, setExpr] = useState("")
  const [result, setResult] = useState<string>("0")
  const [error, setError] = useState(false)
  const [holdTimer, setHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const press = (v: string) => {
    setError(false)
    if (v === "C") {
      setExpr("")
      setResult("0")
      return
    }
    if (v === "⌫") {
      setExpr((e) => e.slice(0, -1))
      return
    }
    if (v === "=") {
      try {
        const r = evaluate(expr)
        const display = Number.isInteger(r) ? String(r) : String(parseFloat(r.toFixed(6)))
        setResult(display)
        setExpr(display)
      } catch {
        setResult("Erreur")
        setError(true)
      }
      return
    }
    setExpr((e) => e + v)
  }

  const startHold = () => {
    const t = setTimeout(() => {
      // Reveal the real PIN pad (the app stays locked).
      setView("reveal-pin")
    }, 1200)
    setHoldTimer(t)
  }
  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer)
      setHoldTimer(null)
    }
  }

  useEffect(() => () => cancelHold(), [holdTimer])

  const keys = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "0", "⌫"]

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 select-none">
      <div className="flex-1 flex flex-col justify-end items-end px-6 pb-3">
        <div className="text-neutral-500 text-sm font-mono h-5 break-all text-right max-w-full">
          {expr || "\u00A0"}
        </div>
        <div
          className={`text-6xl font-light font-mono break-all text-right max-w-full ${
            error ? "text-red-400" : ""
          }`}
        >
          {result}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-px bg-neutral-800 border-t border-neutral-800">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`h-20 text-2xl font-medium hover:bg-neutral-800 active:bg-neutral-700 transition ${
              ["C", "(", ")", "÷", "×", "-", "+"].includes(k)
                ? "bg-neutral-900 text-amber-400"
                : "bg-neutral-950"
            }`}
          >
            {k}
          </button>
        ))}
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onClick={() => press("=")}
          className="col-span-3 h-20 text-2xl font-medium bg-amber-500 text-neutral-950 hover:bg-amber-400 transition"
        >
          =
        </button>
      </div>
      <div className="text-[10px] text-neutral-600 text-center py-2">
        Calculatrice • maintenez « = » pour ouvrir la messagerie
      </div>
    </div>
  )
}
