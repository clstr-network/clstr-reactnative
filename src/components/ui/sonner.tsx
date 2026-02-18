import { Toaster as Sonner } from "sonner"
import { useThemeContext } from "@/components/ThemeProvider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { effectiveTheme } = useThemeContext();
  return (
    <Sonner
      theme={effectiveTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/[0.04] group-[.toaster]:backdrop-blur-md group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-white/60",
          actionButton:
            "group-[.toast]:bg-white/[0.08] group-[.toast]:text-white/70 group-[.toast]:border group-[.toast]:border-white/10 group-[.toast]:hover:bg-white/[0.12]",
          cancelButton:
            "group-[.toast]:bg-white/[0.04] group-[.toast]:text-white/60 group-[.toast]:border group-[.toast]:border-white/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
