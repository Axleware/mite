// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Make sure app data is there
      let data_path = app.path_resolver().app_data_dir().expect("Could not access app data directory");
      if let Ok(false) = data_path.try_exists() {
        std::fs::create_dir(data_path.clone()).expect("Could not create app data directory");
      }
      
      // We also need the subscriptions list
      let feeds_path = data_path.clone().join("feeds.json");
      if let Ok(false) = feeds_path.try_exists() {
        std::fs::write(feeds_path.clone(), "[]").expect("Could not write feeds file");
      }

      // The config file
      let config_file_path = data_path.clone().join("config.json");
      if let Ok(false) = config_file_path.try_exists() {
        std::fs::write(config_file_path.clone(), "{}").expect("Could not write config file");
      }

      // And we also need the XML store
      let contents_path = data_path.clone().join("contents/");
      if let Ok(false) = contents_path.try_exists() {
        std::fs::create_dir(contents_path.clone()).expect("Could not create contents path");
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("Error while running tauri application");
  }
