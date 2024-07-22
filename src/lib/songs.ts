import { useQuery } from "@tanstack/react-query"
import { invoke } from "@tauri-apps/api"
import { Song } from "~/lib/store"

export const useSongs = () =>
  useQuery({
    queryKey: ["songs"],
    queryFn: () => invoke<Song[]>("get_songs"),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
