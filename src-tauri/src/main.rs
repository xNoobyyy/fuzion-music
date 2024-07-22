// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
  fs::File,
  io::{BufReader, BufWriter, Write},
};

use reqwest;
use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

#[derive(Serialize, Deserialize, Clone)]
struct DownloadSettings {
  start: u64,
  end: u64,
  title: String,
  thumbnail: String,
  artist: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Song {
  id: String,
  title: String,
  artist: String,
  thumbnail: String,
  file: String,
  duration: u64,
  created_at: u128,
  start: u64,
  end: u64,
}

#[tauri::command]
async fn youtube_download(
  url: String,
  settings: DownloadSettings,
  app: AppHandle,
) -> Result<(), String> {
  let options = VideoOptions {
    quality: VideoQuality::HighestAudio,
    filter: VideoSearchOptions::Audio,
    ..Default::default()
  };

  let video = Video::new_with_options(url.clone(), options).unwrap();

  let video_info = video
    .get_basic_info()
    .await
    .map_err(|err| err.to_string())?
    .video_details;

  let path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.mp3", video.get_video_id()));

  if path.exists() {
    return Ok(());
  }

  video.download(&path).await.map_err(|err| err.to_string())?;

  let thumbnail_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.png", video.get_video_id()));

  let res = reqwest::get(&video_info.thumbnails[0].url)
    .await
    .map_err(|err| err.to_string())?;

  let mut thumbnail_file = File::create(&thumbnail_path).map_err(|err| err.to_string())?;

  let content = res.bytes().await.map_err(|err| err.to_string())?;

  thumbnail_file
    .write_all(&content)
    .map_err(|err| err.to_string())?;

  let songs_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join("songs.json");

  let mut songs = get_songs(app).await.map_err(|err| err.to_string())?;

  let new_song = Song {
    id: video_info.video_id,
    title: settings.title,
    artist: settings.artist,
    thumbnail: thumbnail_path.to_str().unwrap().to_string(),
    file: path.to_str().unwrap().to_string(),
    duration: video_info.length_seconds.parse().unwrap(),
    created_at: std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap()
      .as_millis(),
    start: settings.start,
    end: settings.end,
  };

  let songs_file = File::create(songs_path).map_err(|err| err.to_string())?;
  let writer = BufWriter::new(songs_file);

  songs.push(new_song);

  serde_json::to_writer(writer, &songs).map_err(|err| err.to_string())?;

  Ok(())
}

#[derive(Serialize, Deserialize, Clone)]
struct VideoDetails {
  title: String,
  thumbnail: String,
  duration: u64,
}

#[tauri::command]
async fn youtube_details(url: String) -> Result<VideoDetails, String> {
  let video = Video::new(url).map_err(|err| err.to_string())?;

  let video_info = video
    .get_basic_info()
    .await
    .map_err(|err| err.to_string())?
    .video_details;

  let details = VideoDetails {
    title: video_info.title.clone(),
    thumbnail: video_info.thumbnails[0].url.clone(),
    duration: video_info.length_seconds.parse().unwrap(),
  };

  Ok(details)
}

#[tauri::command]
async fn get_songs(app: AppHandle) -> Result<Vec<Song>, String> {
  let path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join("songs.json");

  if !path.exists() {
    let file = File::create(&path).map_err(|err| err.to_string())?;
    let writer = BufWriter::new(file);
    serde_json::to_writer(writer, &Vec::<Song>::new()).map_err(|err| err.to_string())?;
  }

  let file = File::open(path).map_err(|err| err.to_string())?;
  let reader = BufReader::new(file);
  let songs: Vec<Song> = serde_json::from_reader(reader).map_err(|err| err.to_string())?;

  Ok(songs)
}

#[tauri::command]
async fn edit_song(id: String, settings: DownloadSettings, app: AppHandle) -> Result<(), String> {
  let mut songs = get_songs(app.clone())
    .await
    .map_err(|err| err.to_string())?;

  let index = songs.iter().position(|s| s.id == id).unwrap();

  let old_song = &songs[index];

  let path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.mp3", id));

  let thumbnail_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.png", id));

  if old_song.thumbnail != settings.thumbnail {
    let res = reqwest::get(settings.thumbnail.clone())
      .await
      .map_err(|err| err.to_string())?;

    let mut thumbnail_file = File::create(&thumbnail_path).map_err(|err| err.to_string())?;

    let content = res.bytes().await.map_err(|err| err.to_string())?;

    thumbnail_file
      .write_all(&content)
      .map_err(|err| err.to_string())?;
  }

  let new_song = Song {
    id,
    title: settings.title,
    artist: settings.artist,
    thumbnail: thumbnail_path.to_str().unwrap().to_string(),
    file: path.to_str().unwrap().to_string(),
    duration: old_song.duration.clone(),
    created_at: old_song.created_at.clone(),
    start: settings.start,
    end: settings.end,
  };

  songs[index] = new_song;

  let songs_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join("songs.json");

  let songs_file = File::create(songs_path).map_err(|err| err.to_string())?;
  let writer = BufWriter::new(songs_file);

  serde_json::to_writer(writer, &songs).map_err(|err| err.to_string())?;

  Ok(())
}

#[tauri::command]
async fn delete_song(id: String, app: AppHandle) -> Result<(), String> {
  let mut songs = get_songs(app.clone())
    .await
    .map_err(|err| err.to_string())?;

  let index = songs.iter().position(|s| s.id == id).unwrap();

  let path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.mp3", id));

  let thumbnail_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join(format!("{}.png", id));

  fs::remove_file(path).map_err(|err| err.to_string())?;
  fs::remove_file(thumbnail_path).map_err(|err| err.to_string())?;

  songs.remove(index);

  let songs_path = app
    .path_resolver()
    .app_local_data_dir()
    .unwrap()
    .join("songs.json");

  let songs_file = File::create(songs_path).map_err(|err| err.to_string())?;
  let writer = BufWriter::new(songs_file);

  serde_json::to_writer(writer, &songs).map_err(|err| err.to_string())?;

  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      youtube_download,
      youtube_details,
      get_songs,
      edit_song,
      delete_song
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
