import { Store } from "@tanstack/react-store"

export type Song = {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration: number
  file: string
  created_at: number
  start: number
  end: number
}

export type VideoDetails = {
  title: string
  thumbnail: string
  duration: number
}

export type VideoSettings = {
  start: number
  end: number
  title: string
  thumbnail: string
  artist: string
}

export type StoreType = {
  search: string
  playing?: Song
  paused: boolean
  volume: number
  currentTime?: number
  loop: "none" | "one" | "all"
  shuffle: boolean
  darkMode: boolean
}

export const store = new Store<StoreType>({
  search: "",
  paused: false,
  volume: 50,
  loop: "none",
  shuffle: false,
  darkMode: true,
})

export const songsStore = new Store<Song[]>([])
