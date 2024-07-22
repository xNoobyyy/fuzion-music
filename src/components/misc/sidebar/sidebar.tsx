import { Download } from "~/components/misc/sidebar/download"
import { Search } from "~/components/misc/sidebar/search"

export const Sidebar = () => {
  return (
    <div className="flex flex-col items-center p-6 gap-y-4 size-full bg-muted/20 @container">
      <Search />
      <Download />
    </div>
  )
}
