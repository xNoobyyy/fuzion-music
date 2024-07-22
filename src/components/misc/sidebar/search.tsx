import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { useStore } from "@tanstack/react-store"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { store } from "~/lib/store"

export const Search = () => {
  const search = useStore(store, (state) => state.search)

  return (
    <>
      <Input
        className="w-full @sm:flex hidden bg-background"
        placeholder="Search"
        value={search}
        onChange={(e) =>
          store.setState((state) => ({ ...state, search: e.target.value }))
        }
      />
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full @sm:hidden flex">
            <MagnifyingGlassIcon />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <Input
            className="w-full bg-background my-4"
            placeholder="Search"
            value={search}
            onChange={(e) =>
              store.setState((state) => ({ ...state, search: e.target.value }))
            }
          />
          <DialogFooter>
            <Button>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
