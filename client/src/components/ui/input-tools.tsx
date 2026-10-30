import * as React from "react"

import { Input } from "@/components/ui/input"
import { FieldTools, appendText, setNativeValue } from "@/components/shared/FieldTools"
import { cn } from "@/lib/utils"

// Cuadro de una linea con microfono y clip (2026-10-30). Para cuadros donde la persona escribe
// informacion libre (datos, observaciones, respuestas); no para busquedas, correos ni claves.
const InputWithTools = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
    ({ className, disabled, readOnly, ...props }, ref) => {
        const inner = React.useRef<HTMLInputElement | null>(null)
        const setRef = (el: HTMLInputElement | null) => {
            inner.current = el
            if (typeof ref === "function") ref(el)
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
        }
        return (
            <div className="relative w-full flex-1 min-w-0">
                <Input ref={setRef} className={cn("pr-[4.25rem]", className)} disabled={disabled} readOnly={readOnly} {...props} />
                {!disabled && !readOnly && (
                    <FieldTools
                        className="absolute top-1/2 -translate-y-1/2 right-1.5"
                        onText={(text, kind) => {
                            const el = inner.current
                            if (el) setNativeValue(el, appendText(el.value, kind === "archivo" ? text.replace(/\n+/g, " ") : text))
                        }}
                    />
                )}
            </div>
        )
    }
)
InputWithTools.displayName = "InputWithTools"

export { InputWithTools }
