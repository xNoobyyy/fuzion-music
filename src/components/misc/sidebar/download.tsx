import { DownloadIcon } from "@radix-ui/react-icons"
import { useQuery } from "@tanstack/react-query"
import { invoke } from "@tauri-apps/api"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
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
import { Label } from "~/components/ui/label"
import { Range } from "~/components/ui/range"
import { Separator } from "~/components/ui/separator"
import { Textarea } from "~/components/ui/textarea"
import { VideoSettings, VideoDetails } from "~/lib/store"
import { queryClient } from "~/main"

export const Download = () => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string>()
  const [settings, setSettings] = useState<VideoSettings>()

  const onFinish = (name: string) => {
    toast.success(`Downloaded ${name}`)
    setOpen(false)
    setUrl(undefined)
    setSettings(undefined)
    queryClient.invalidateQueries({ queryKey: ["songs"] })
  }

  const onCancel = () => {
    setOpen(false)
    setUrl(undefined)
    setSettings(undefined)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => setOpen(url && settings ? true : open)}
    >
      <DialogTrigger asChild>
        <Button className="w-full">Import</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {!url
              ? "Import from YouTube"
              : !settings
              ? "Input Download Settings"
              : "Downloading"}
          </DialogTitle>
        </DialogHeader>
        {!url ? (
          <InputUrl onInput={setUrl} />
        ) : !settings ? (
          <Settings url={url} onInput={setSettings} />
        ) : (
          <Downloading
            url={url}
            settings={settings}
            onFinish={() => onFinish(settings.title)}
          />
        )}
        <DialogFooter>
          <Button className="w-full" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const InputUrl = ({ onInput }: { onInput: (url: string) => void }) => {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    const parsed = z.string().url().safeParse(url)

    if (!parsed.success) {
      setError("Invalid URL")
      return
    }

    onInput(parsed.data)
  }

  return (
    <div className="flex w-full justify-center items-center flex-col gap-y-4">
      <div className="w-full">
        <Input
          className="w-full bg-background"
          placeholder="YouTube URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

      <Button className="w-full" onClick={handleSubmit}>
        Import
      </Button>
    </div>
  )
}

const Settings = ({
  url,
  onInput,
}: {
  url: string
  onInput: (settings: VideoSettings) => void
}) => {
  const [settings, setSettings] = useState<VideoSettings>()

  const fetchDetails = () => invoke<VideoDetails>("youtube_details", { url })

  const query = useQuery({
    queryKey: ["youtube_details", url],
    queryFn: fetchDetails,
  })

  useEffect(() => {
    if (query.data && !settings) {
      setSettings({
        start: 0,
        end: query.data.duration,
        title: query.data.title,
        thumbnail: query.data.thumbnail,
        artist: "",
      })
    }
  }, [query.data])

  return (
    <div className="flex w-full justify-center items-center flex-col gap-y-4">
      {query.isLoading && (
        <DownloadIcon className="size-8 m-8 animate-bounce" />
      )}
      {settings && query.data && (
        <div className="flex w-full flex-col gap-y-4">
          <Label htmlFor="range">Range: </Label>
          <Range
            defaultValue={[0, query.data.duration]}
            id="range"
            min={0}
            max={query.data.duration}
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
              src={settings.thumbnail}
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
          <Button onClick={() => onInput(settings)}>Download</Button>
        </div>
      )}
    </div>
  )
}

const Downloading = ({
  url,
  settings,
  onFinish,
}: {
  url: string
  settings: VideoSettings
  onFinish: () => void
}) => {
  const download = async () => {
    await invoke("youtube_download", { url, settings })
    onFinish()
  }

  const query = useQuery({
    queryKey: ["youtube_download", url, settings],
    queryFn: download,
  })

  useEffect(() => {
    if (query.isSuccess) onFinish()
  }, [query.isSuccess])

  return (
    <div className="flex w-full justify-center items-center">
      <DownloadIcon className="size-8 m-8 animate-bounce" />
    </div>
  )
}
