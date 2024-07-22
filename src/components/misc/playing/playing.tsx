import { useStore } from "@tanstack/react-store"
import { FC, useEffect, useRef } from "react"
import { songsStore, store, StoreType } from "~/lib/store"
import { tauri } from "@tauri-apps/api"
import useColorThief from "use-color-thief"
import { Slider } from "~/components/ui/slider"
import { formatTime } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  LoopIcon,
  MoonIcon,
  PauseIcon,
  ResumeIcon,
  ShuffleIcon,
  SpeakerLoudIcon,
  SpeakerModerateIcon,
  SpeakerOffIcon,
  SpeakerQuietIcon,
  SunIcon,
  TrackNextIcon,
  TrackPreviousIcon,
} from "@radix-ui/react-icons"
import { Toggle } from "~/components/ui/toggle"
import { useTransitions } from "~/lib/transitions"
import { fs } from "@tauri-apps/api"
import { useSongs } from "~/lib/songs"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "~/components/ui/context-menu"

type SavedConfig = Omit<StoreType, "playing" | "paused"> & {
  playing: string
}

export const Playing: FC = () => {
  const audio = useRef<HTMLAudioElement>(null)

  const playing = useStore(store, (state) => state.playing)
  const paused = useStore(store, (state) => state.paused)
  const currentTime = useStore(store, (state) => state.currentTime)
  const shuffle = useStore(store, (state) => state.shuffle)
  const loop = useStore(store, (state) => state.loop)
  const volume = useStore(store, (state) => state.volume)
  const darkMode = useStore(store, (state) => state.darkMode)

  const songsQuery = useSongs()

  useEffect(() => {
    if (!playing) return

    const updateConfig = async () => {
      const exists = await fs.exists("config.json", {
        dir: fs.BaseDirectory.AppConfig,
      })

      if (!exists) {
        await fs.createDir("", {
          dir: fs.BaseDirectory.AppConfig,
          recursive: true,
        })
      }

      const state = {
        ...store.state,
        playing: playing?.id,
      } as SavedConfig

      await fs.writeTextFile("config.json", JSON.stringify(state), {
        dir: fs.BaseDirectory.AppConfig,
        append: false,
      })
    }

    updateConfig()
  }, [playing, paused, shuffle, loop, volume, darkMode])

  useEffect(() => {
    if (!songsQuery.isSuccess) return

    songsStore.setState(() => songsQuery.data!)

    if (!playing) {
      store.setState((state) => ({
        ...state,
        playing: songsQuery.data[0],
        paused: true,
      }))
    }

    const loadConfig = async () => {
      const exists = await fs.exists("config.json", {
        dir: fs.BaseDirectory.AppConfig,
      })

      if (exists) {
        const text = await fs.readTextFile("config.json", {
          dir: fs.BaseDirectory.AppConfig,
        })

        const config = JSON.parse(text) as SavedConfig

        const newState = {
          ...config,
          playing: songsQuery.data.find((value) => value.id === config.playing),
          paused: true,
        }

        store.setState(() => newState)
      }
    }

    loadConfig()
  }, [songsQuery.isSuccess])

  const transitions = useTransitions()

  useEffect(() => {
    if (!audio.current || !playing) return

    audio.current.src = tauri.convertFileSrc(playing.file)

    if (paused) {
      void audio.current.pause()
    } else {
      void audio.current.play()
    }
  }, [playing])

  useEffect(() => {
    if (!audio.current || !playing) return

    audio.current.src = tauri.convertFileSrc(playing.file)

    if (!paused) {
      void audio.current.play()
    } else {
      void audio.current.pause()
    }
  }, [audio.current])

  useEffect(() => {
    if (!audio.current) return

    audio.current.volume = volume / 1000
  }, [volume, audio.current])

  useEffect(() => {
    if (!audio.current) return

    if (paused) {
      void audio.current.pause()
    } else {
      void audio.current.play()
    }
  }, [paused, audio.current])

  useEffect(() => {
    transitions.disable()
    if (darkMode) {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
    }
    window.getComputedStyle(transitions.style).opacity
    transitions.enable()
  }, [darkMode])

  const handleEnded = () => {
    if (!audio.current) return

    switch (loop) {
      case "none": {
        store.setState((state) => ({
          ...state,
          currentTime: 0,
          paused: true,
        }))
        audio.current.currentTime = 0
        void audio.current.pause()
        break
      }
      case "one": {
        store.setState((state) => ({
          ...state,
          currentTime: 0,
          paused: false,
        }))
        audio.current.currentTime = 0
        void audio.current.play()
        break
      }
      case "all": {
        const currentIndex = songsStore.state.findIndex(
          (value) => value.id === playing!.id
        )
        if (shuffle) {
          store.setState((state) => ({
            ...state,
            playing: getShuffledSong(currentIndex),
            currentTime: 0,
            paused: false,
          }))
          audio.current.currentTime = 0
          void audio.current.play()
        } else {
          if (currentIndex === songsStore.state.length - 1) {
            store.setState((state) => ({
              ...state,
              playing: songsStore.state.at(0),
              currentTime: 0,
              paused: false,
            }))
          } else {
            store.setState((state) => ({
              ...state,
              playing: songsStore.state.at(currentIndex + 1),
              currentTime: 0,
              paused: false,
            }))
          }
          audio.current.currentTime = 0
          void audio.current.play()
        }
        break
      }
    }
  }

  const handleTimeUpdate = () => {
    if (!audio.current) return
    store.setState((state) => ({
      ...state,
      currentTime: audio.current!.currentTime,
    }))
  }

  if (!playing) return null

  return (
    <>
      <audio
        onPause={(e) => {
          e.preventDefault()
          store.setState((state) => ({ ...state, paused: true }))
        }}
        onPlay={(e) => {
          e.preventDefault()
          store.setState((state) => ({ ...state, paused: false }))
        }}
        onEnded={(e) => {
          e.preventDefault()
          handleEnded()
        }}
        onTimeUpdate={(e) => {
          e.preventDefault()
          handleTimeUpdate()
        }}
        onVolumeChange={(e) => {
          e.preventDefault()
          if (e.currentTarget.volume < 0) {
            e.currentTarget.volume = 0
            store.setState((state) => ({
              ...state,
              volume: 0,
            }))
          } else if (e.currentTarget.volume > 0.1) {
            e.currentTarget.volume = 0.1
            store.setState((state) => ({
              ...state,
              volume: 100,
            }))
          } else if (e.currentTarget.volume * 1000 !== volume) {
            store.setState((state) => ({
              ...state,
              volume: e.currentTarget.volume * 1000,
            }))
          }
        }}
        ref={audio}
      />
      <div className="size-full grid grid-cols-[1fr,2fr,1fr]">
        <div className="size-full relative flex items-center">
          {playing && (
            <>
              <Gradient url={tauri.convertFileSrc(playing.thumbnail)} />
              <div className="ml-5 h-16 flex gap-x-4">
                <img
                  src={tauri.convertFileSrc(playing.thumbnail)}
                  alt={playing.title}
                  className="shadow-2xl shadow-background size-16 rounded-lg object-cover"
                />
                <div className="flex flex-col justify-center mt-1">
                  <p className="font-bold text-sm line-clamp-1">
                    {playing.title}
                  </p>
                  <p className="text-sm line-clamp-1">{playing.artist}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="size-full flex flex-col justify-center gap-y-1 items-center relative overflow-hidden">
          {playing && (
            <>
              <div className="left-1/2 -translate-x-1/2 -z-10 bg-[radial-gradient(hsl(var(--primary)),transparent_40%)] blur-3xl inset-0 absolute" />
              <div className="flex justify-center items-center gap-x-2">
                <Toggle
                  size="icon"
                  onPressedChange={(toggled) =>
                    store.setState((state) => ({
                      ...state,
                      shuffle: toggled,
                    }))
                  }
                  pressed={shuffle}
                >
                  <ShuffleIcon className="size-4 opacity-50" />
                </Toggle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    store.setState((state) => ({
                      ...state,
                      playing: songsStore.state.at(
                        songsStore.state.findIndex(
                          (value) => value.id === playing.id
                        ) - 1
                      ),
                      paused: false,
                    }))
                  }}
                >
                  <TrackPreviousIcon className="size-4" />
                </Button>
                <Button
                  onClick={() =>
                    store.setState((state) => ({
                      ...state,
                      paused: !state.paused,
                    }))
                  }
                  size="icon"
                >
                  {!paused && <PauseIcon className="size-4" />}
                  {paused && <ResumeIcon className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const currentIndex = songsStore.state.findIndex(
                      (value) => value.id === playing.id
                    )

                    if (currentIndex === songsStore.state.length - 1) {
                      return store.setState((state) => ({
                        ...state,
                        playing: songsStore.state.at(0),
                        paused: false,
                      }))
                    } else {
                      store.setState((state) => ({
                        ...state,
                        playing: songsStore.state.at(currentIndex + 1),
                        paused: false,
                      }))
                    }
                  }}
                >
                  <TrackNextIcon className="size-4" />
                </Button>
                <ContextMenu modal={false}>
                  <ContextMenuTrigger asChild>
                    <Toggle
                      className="relative"
                      size="icon"
                      onPressedChange={() =>
                        store.setState((state) => ({
                          ...state,
                          loop:
                            loop === "none"
                              ? "one"
                              : loop === "one"
                              ? "all"
                              : "none",
                        }))
                      }
                      pressed={loop === "one" || loop === "all"}
                    >
                      <LoopIcon className="size-4 opacity-50 relative" />
                      {loop === "one" && (
                        <div className="absolute flex justify-center items-center -top-1.5 -right-1.5 size-5 text-[0.65rem] leading-[0.6rem] text-center bg-primary text-primary-foreground rounded-lg">
                          1
                        </div>
                      )}
                      {loop === "all" && (
                        <div className="absolute flex justify-center items-center -top-1.5 -right-1.5 size-5 text-[0.65rem] leading-[0.6rem] text-center bg-primary text-primary-foreground rounded-lg">
                          ∞
                        </div>
                      )}
                    </Toggle>
                  </ContextMenuTrigger>
                  <ContextMenuContent loop className="max-w-64">
                    <ContextMenuCheckboxItem
                      checked={loop === "none"}
                      onCheckedChange={() =>
                        store.setState((state) => ({
                          ...state,
                          loop: "none",
                        }))
                      }
                    >
                      Repeat none
                    </ContextMenuCheckboxItem>
                    <ContextMenuSeparator />
                    <ContextMenuCheckboxItem
                      checked={loop === "one"}
                      onCheckedChange={() =>
                        store.setState((state) => ({
                          ...state,
                          loop: "one",
                        }))
                      }
                    >
                      Repeat one
                    </ContextMenuCheckboxItem>
                    <ContextMenuSeparator />
                    <ContextMenuCheckboxItem
                      checked={loop === "all"}
                      onCheckedChange={() =>
                        store.setState((state) => ({
                          ...state,
                          loop: "all",
                        }))
                      }
                    >
                      Repeat all
                    </ContextMenuCheckboxItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
              <div className="flex justify-center items-center w-full">
                <p>{formatTime(currentTime ?? 0)}</p>
                <Slider
                  className="w-full mx-4 py-2"
                  value={[currentTime ?? 0]}
                  min={0}
                  max={playing.duration ?? 0}
                  onValueChange={(values) => {
                    if (audio.current) {
                      audio.current!.currentTime = values[0]
                      store.setState((state) => ({
                        ...state,
                        currentTime: values[0],
                      }))
                    }
                  }}
                />
                <p>{formatTime(playing.duration ?? 0)}</p>
              </div>
            </>
          )}
        </div>
        <div className="size-full relative flex justify-end pr-8 items-center gap-x-6">
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary/10 to-transparent" />
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              store.setState((state) => ({
                ...state,
                darkMode: !darkMode,
              }))
            }
          >
            {darkMode ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )}
          </Button>
          <div className="flex justify-center items-center gap-x-2">
            {volume === 0 ? (
              <SpeakerOffIcon className="size-4" />
            ) : volume < 30 ? (
              <SpeakerQuietIcon className="size-4" />
            ) : volume < 70 ? (
              <SpeakerModerateIcon className="size-4" />
            ) : (
              <SpeakerLoudIcon className="size-4" />
            )}
            <Slider
              className="w-32"
              value={[volume]}
              min={0}
              max={100}
              onValueChange={(values) =>
                store.setState((state) => ({
                  ...state,
                  volume: values[0],
                }))
              }
            />
            <p className="text-sm w-8">{volume}%</p>
          </div>
        </div>
      </div>
    </>
  )
}

const Gradient = ({ url }: { url?: string }) => {
  if (!url) return null

  const { color } = useColorThief(url, {
    format: "hex",
    colorCount: 10,
    quality: 10,
  })

  return (
    <div
      className="absolute inset-0 opacity-50 -z-10"
      style={{
        backgroundImage: `linear-gradient(to right, ${color}, transparent)`,
      }}
    />
  )
}

const getShuffledSong = (() => {
  let shuffledIndices: number[] = []
  let currentIndex = songsStore.state.length

  const shuffleIndices = () => {
    shuffledIndices = Array.from(songsStore.state.keys())
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledIndices[i], shuffledIndices[j]] = [
        shuffledIndices[j],
        shuffledIndices[i],
      ]
    }
    currentIndex = 0
  }

  return (currentSong: number) => {
    if (songsStore.state.length === 1) {
      return songsStore.state[0]
    }

    if (currentIndex >= shuffledIndices.length) {
      shuffleIndices()
    }

    let nextIndex = shuffledIndices[currentIndex++]
    while (nextIndex === currentSong && shuffledIndices.length > 1) {
      if (currentIndex >= shuffledIndices.length) {
        shuffleIndices()
      }
      nextIndex = shuffledIndices[currentIndex++]
    }

    return songsStore.state[nextIndex]
  }
})()
