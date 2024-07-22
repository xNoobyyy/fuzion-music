import {
  Cross2Icon,
  PauseIcon,
  Pencil2Icon,
  PlayIcon,
  ResumeIcon,
  TrashIcon,
  UpdateIcon,
} from "@radix-ui/react-icons"
import { useStore } from "@tanstack/react-store"
import { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { useSongs } from "~/lib/songs"
import { cn, formatTime } from "~/lib/utils"
import { Song, store, VideoSettings } from "~/lib/store"
import { invoke, tauri } from "@tauri-apps/api"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { queryClient } from "~/main"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { Range } from "~/components/ui/range"
import { Separator } from "~/components/ui/separator"
import { Textarea } from "~/components/ui/textarea"
import { Input } from "~/components/ui/input"

export const Main = () => {
  const search = useStore(store, (state) => state.search)
  const playing = useStore(store, (state) => state.playing)
  const paused = useStore(store, (state) => state.paused)

  const query = useSongs()

  return (
    <div className="flex flex-col bg-muted/10 size-full">
      {query.isLoading && <UpdateIcon className="size-8 m-auto animate-spin" />}
      {typeof query.data !== "undefined" && (
        <>
          {query.data.length > 0 && (
            <ScrollArea>
              <Table className="mb-10">
                <TableHeader className="h-12">
                  <TableRow>
                    <TableHead className="w-[10%] text-center">#</TableHead>
                    <TableHead className="w-[40%]">Song</TableHead>
                    <TableHead className="w-[15%]">Duration</TableHead>
                    <TableHead className="w-[20%]">Added</TableHead>
                    <TableHead className="w-[15%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data
                    .filter(
                      (song) =>
                        `${song.artist.toLowerCase()} ${song.title.toLowerCase()} ${song.id.toLowerCase()}`.includes(
                          search.toLowerCase()
                        ) || search === ""
                    )
                    .map((song, index) => (
                      <TableRow
                        key={song.id}
                        className={cn("h-20 transition-shadow", {
                          "shadow-glow shadow-primary/40":
                            playing?.id === song.id,
                        })}
                      >
                        <TableCell className="font-medium text-sm group text-center">
                          {playing?.id !== song.id && (
                            <p className="group-hover:hidden m-auto">
                              {index + 1}
                            </p>
                          )}
                          {playing?.id !== song.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="group-hover:flex hidden justify-center items-center m-auto"
                              onClick={() =>
                                store.setState((state) => ({
                                  ...state,
                                  playing: song,
                                  paused: false,
                                }))
                              }
                            >
                              <PlayIcon className="size-4" />
                            </Button>
                          )}
                          {playing?.id === song.id && !paused && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="flex justify-center items-center m-auto"
                              onClick={() =>
                                store.setState((state) => ({
                                  ...state,
                                  paused: true,
                                }))
                              }
                            >
                              <PauseIcon className="size-4" />
                            </Button>
                          )}
                          {playing?.id === song.id && paused && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="flex justify-center items-center m-auto"
                              onClick={() =>
                                store.setState((state) => ({
                                  ...state,
                                  paused: false,
                                }))
                              }
                            >
                              <ResumeIcon className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 items-center">
                            <img
                              src={tauri.convertFileSrc(song.thumbnail)}
                              alt={song.title}
                              className="size-12 rounded-sm object-center object-cover"
                            />
                            <div className="flex flex-col justify-center">
                              <p
                                className={cn("font-medium transition-colors", {
                                  "text-primary": playing?.id === song.id,
                                })}
                              >
                                {song.title}
                              </p>
                              <p className="text-muted-foreground">
                                {song.artist}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-start">
                          {formatTime(song.duration)}
                        </TableCell>
                        <TableCell className="text-start">
                          {new Date(song.created_at).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="size-full flex items-center">
                            <Delete song={song} />
                            <Edit song={song} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {query.data.length === 0 && (
            <Cross2Icon className="size-8 h-full m-auto" />
          )}
        </>
      )}
    </div>
  )
}

const Delete = ({ song }: { song: Song }) => {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <TrashIcon className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this song?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={() => {
              setLoading(true)
              invoke("delete_song", {
                id: song.id,
              }).then(() => {
                void queryClient.invalidateQueries({
                  queryKey: ["songs"],
                })
                setLoading(false)
                setOpen(false)
              })
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const Edit = ({ song }: { song: Song }) => {
  const [settings, setSettings] = useState<VideoSettings>({ ...song })
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="flex justify-center items-center"
        >
          <Pencil2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit</DialogTitle>
        </DialogHeader>
        <div className="flex w-full flex-col gap-y-4">
          <Label htmlFor="range">Range: </Label>
          <Range
            defaultValue={[0, song.duration]}
            id="range"
            min={0}
            max={song.duration}
            onValueChange={(values) => {
              setSettings({
                ...settings,
                start: Math.min(...values),
                end: Math.max(...values),
              })
            }}
          />
          <Separator />
          <Label htmlFor="thumbnail">Thumbnail: </Label>
          <div className="flex justify-center items-center gap-x-4">
            <img
              src={
                settings.thumbnail.startsWith("http")
                  ? settings.thumbnail
                  : tauri.convertFileSrc(settings.thumbnail)
              }
              alt="thumbnail"
              className="size-40 aspect-square object-center object-cover rounded-lg"
            />
            <Textarea
              value={settings.thumbnail}
              placeholder="Thumbnail URL"
              id="thumbnail"
              className="h-40 resize-none"
              onChange={(e) =>
                setSettings({ ...settings, thumbnail: e.target.value })
              }
            />
          </div>
          <Separator />
          <Label htmlFor="title">Title: </Label>
          <Input
            className="w-full"
            placeholder="Title"
            id="title"
            value={settings.title}
            onChange={(e) =>
              setSettings({ ...settings, title: e.target.value })
            }
          />
          <Separator />
          <Label htmlFor="artist">Artist: </Label>
          <Input
            className="w-full"
            placeholder="Artist"
            id="artist"
            value={settings.artist}
            onChange={(e) =>
              setSettings({ ...settings, artist: e.target.value })
            }
          />
          <Separator />
          <Button
            disabled={loading}
            onClick={() => {
              setLoading(true)
              invoke("edit_song", {
                id: song.id,
                settings,
              }).then(() => {
                void queryClient.invalidateQueries({
                  queryKey: ["songs"],
                })
                setLoading(false)
                setOpen(false)
              })
            }}
          >
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
