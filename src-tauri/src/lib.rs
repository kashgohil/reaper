use base64::{engine::general_purpose, Engine as _};
use image::{imageops::FilterType, ImageFormat};
use std::fs;
use std::io::Cursor;
use tauri_plugin_dialog::init as dialog_init;
use tauri_plugin_fs::init as fs_init;

fn get_image_format(mime_type: &str) -> Option<ImageFormat> {
    match mime_type {
        "image/png" => Some(ImageFormat::Png),
        "image/jpeg" => Some(ImageFormat::Jpeg),
        "image/gif" => Some(ImageFormat::Gif),
        "image/bmp" => Some(ImageFormat::Bmp),
        "image/webp" => Some(ImageFormat::WebP),
        "image/vnd.microsoft.icon" | "image/x-icon" => Some(ImageFormat::Ico),
        "image/tiff" => Some(ImageFormat::Tiff),
        "image/x-tga" => Some(ImageFormat::Tga),
        _ => None,
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn crop_image(image_data: &str, x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    let parts: Vec<&str> = image_data.split(';').collect();
    let mime_type = parts[0].split(':').nth(1).unwrap_or("image/png");
    let base64_data = image_data.split(',').nth(1).unwrap_or("");

    let decoded_data = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;
    let mut img = image::load_from_memory(&decoded_data).map_err(|e| e.to_string())?;

    let cropped_img = img.crop(x, y, width, height);

    let mut buffer = Cursor::new(Vec::new());
    let format = get_image_format(mime_type).unwrap_or(ImageFormat::Png);
    cropped_img
        .write_to(&mut buffer, format)
        .map_err(|e| e.to_string())?;
    let base64_result = general_purpose::STANDARD.encode(buffer.get_ref());

    Ok(format!("data:{};base64,{}", mime_type, base64_result))
}

#[tauri::command]
fn resize_image(image_data: &str, width: u32, height: u32) -> Result<String, String> {
    let parts: Vec<&str> = image_data.split(';').collect();
    let mime_type = parts[0].split(':').nth(1).unwrap_or("image/png");
    let base64_data = image_data.split(',').nth(1).unwrap_or("");

    let decoded_data = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&decoded_data).map_err(|e| e.to_string())?;

    let resized_img = img.resize_exact(width, height, FilterType::Lanczos3);

    let mut buffer = Cursor::new(Vec::new());
    let format = get_image_format(mime_type).unwrap_or(ImageFormat::Png);
    resized_img
        .write_to(&mut buffer, format)
        .map_err(|e| e.to_string())?;
    let base64_result = general_purpose::STANDARD.encode(buffer.get_ref());

    Ok(format!("data:{};base64,{}", mime_type, base64_result))
}

#[tauri::command]
fn convert_image(image_data: &str, target_format: &str) -> Result<String, String> {
    // Validate input is a data URL
    if !image_data.starts_with("data:") || !image_data.contains(",") {
        return Err("Input is not a valid data URL (expected 'data:<mime>;base64,<data>')".to_string());
    }
    let base64_data = image_data.split(',').nth(1).unwrap_or("");
    if base64_data.is_empty() {
        return Err("No base64 data found in the input data URL.".to_string());
    }
    let decoded_data = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64 image data: {}", e))?;
    let img = image::load_from_memory(&decoded_data)
        .map_err(|e| format!("Failed to decode image from memory: {}", e))?;

    let mut buffer = Cursor::new(Vec::new());
    let (format, mime_type_str) = match target_format {
        "png" => (ImageFormat::Png, "image/png"),
        "jpeg" => (ImageFormat::Jpeg, "image/jpeg"),
        "gif" => (ImageFormat::Gif, "image/gif"),
        "bmp" => (ImageFormat::Bmp, "image/bmp"),
        "webp" => (ImageFormat::WebP, "image/webp"),
        "ico" => (ImageFormat::Ico, "image/vnd.microsoft.icon"),
        "tiff" => (ImageFormat::Tiff, "image/tiff"),
        "tga" => (ImageFormat::Tga, "image/x-tga"),
        _ => {
            return Err(format!(
                "Unsupported image format: '{}'. Supported formats: png, jpeg, gif, bmp, webp, ico, tiff, tga.",
                target_format
            ));
        }
    };

    img.write_to(&mut buffer, format)
        .map_err(|e| format!("Failed to write image in target format '{}': {}", target_format, e))?;
    let base64_result = general_purpose::STANDARD.encode(buffer.get_ref());

    Ok(format!("data:{};base64,{}", mime_type_str, base64_result))
}

#[tauri::command]
fn read_image_file(path: &str) -> Result<String, String> {
    println!("read_image_file called with path: '{}'", path);
    println!("Path type: {:?}", std::any::type_name::<&str>());

    // Check if file exists
    if !std::path::Path::new(path).exists() {
        let error_msg = format!("File does not exist: {}", path);
        println!("ERROR: {}", error_msg);
        return Err(error_msg);
    }

    println!("File exists, attempting to read...");

    let file_data = fs::read(path).map_err(|e| {
        let error_msg = format!("Failed to read file '{}': {}", path, e);
        println!("ERROR: {}", error_msg);
        error_msg
    })?;

    println!("File read successfully, size: {} bytes", file_data.len());

    let base64_data = general_purpose::STANDARD.encode(&file_data);
    println!("Base64 encoding complete, length: {}", base64_data.len());

    let mime_type = mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string();
    println!("Detected MIME type: {}", mime_type);

    let result = format!("data:{};base64,{}", mime_type, base64_data);
    println!("Final data URL length: {}", result.len());
    println!(
        "Data URL prefix: {}",
        &result[..std::cmp::min(50, result.len())]
    );

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(dialog_init())
        .plugin(fs_init())
        .invoke_handler(tauri::generate_handler![
            greet,
            crop_image,
            resize_image,
            read_image_file,
            convert_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
