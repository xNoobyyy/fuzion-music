import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "~/components/ui/sonner"

export const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors />
    </QueryClientProvider>
  </React.StrictMode>
)
