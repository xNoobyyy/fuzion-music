import { Sidebar } from "~/components/misc/sidebar/sidebar"
import "./app.css"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable"
import { Main } from "~/components/misc/main/main"
import { Playing } from "~/components/misc/playing/playing"
import { useEffect } from "react"

const App = () => {
  useEffect(() => {
    document.addEventListener("keydown", function (event) {
      if (
        event.key === "F5" ||
        (event.ctrlKey && event.key === "r") ||
        (event.metaKey && event.key === "r")
      ) {
        event.preventDefault()
      }
    })

    document.addEventListener("contextmenu", function (event) {
      event.preventDefault()
    })
  }, [])

  return (
    <div className="h-dvh w-dvw flex flex-col">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} maxSize={30} minSize={15}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <Main />
        </ResizablePanel>
      </ResizablePanelGroup>
      <div className="h-28 w-full border-t">
        <Playing />
      </div>
    </div>
  )
}

export default App
