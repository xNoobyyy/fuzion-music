import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [
        {
          shadow: ["glow"],
        },
      ],
    },
  },
})

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}
