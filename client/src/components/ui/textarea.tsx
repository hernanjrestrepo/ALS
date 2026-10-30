import * as React from "react"

import { cn } from "@/lib/utils"
import { FieldTools, appendText, setNativeValue } from "@/components/shared/FieldTools"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    // Microfono y clip en todos los cuadros de escritura (2026-10-30). tools={false} los quita.
    tools?: boolean
}

const BASE = "flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, tools = true, ...props }, ref) => {
        const inner = React.useRef<HTMLTextAreaElement | null>(null)
        const setRef = (el: HTMLTextAreaElement | null) => {
            inner.current = el
            if (typeof ref === "function") ref(el)
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
        }

        if (!tools || props.disabled || props.readOnly) {
            return <textarea className={cn(BASE, className)} ref={setRef} {...props} />
        }

        return (
            <div className="relative w-full">
                <textarea className={cn(BASE, "pb-9", className)} ref={setRef} {...props} />
                <FieldTools
                    className="absolute bottom-1 right-1.5 bg-white/80 rounded-full"
                    onText={(text, kind) => {
                        const el = inner.current
                        if (el) setNativeValue(el, appendText(el.value, text, kind === "archivo"))
                    }}
                />
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
