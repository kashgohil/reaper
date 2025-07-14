import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Upload, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(
    null,
  );
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [targetFormat, setTargetFormat] = useState<string>("png");
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    console.log("Setting up Tauri event listeners...");

    const unlisten = listen<any>("tauri://drag-drop", async (event) => {
      console.log("File dropped:", event.payload);
      console.log("Payload type:", typeof event.payload);
      console.log("Payload is array:", Array.isArray(event.payload));
      console.log("Payload length:", event.payload?.length);
      console.log("Full event object:", event);
      console.log("Event keys:", Object.keys(event));
      setIsDragging(false);

      // Try different ways to extract the file path
      let filePath: string | undefined;

      if (Array.isArray(event.payload)) {
        filePath = event.payload[0];
        console.log("Extracted from array:", filePath);
      } else if (typeof event.payload === "string") {
        filePath = event.payload;
        console.log("Payload is string:", filePath);
      } else if (event.payload && typeof event.payload === "object") {
        // Try common property names
        filePath =
          event.payload.path ||
          event.payload.paths?.[0] ||
          event.payload.file ||
          event.payload.files?.[0];
        console.log("Extracted from object:", filePath);
        console.log("Available properties:", Object.keys(event.payload));
      } else {
        console.log("Payload is neither array, string, nor object");
      }

      console.log("Final extracted file path:", filePath);
      console.log("File path type:", typeof filePath);

      if (!filePath) {
        console.error("No file path provided");
        console.error("Debug - payload:", event.payload);
        console.error("Debug - payload type:", typeof event.payload);
        return;
      }

      try {
        console.log("Reading file:", filePath);
        const imageDataUrl = await invoke<string>("read_image_file", {
          path: filePath,
        });
        console.log("Image loaded successfully");
        setImage(imageDataUrl);
        setCroppedImageUrl(null);
        setResizedImageUrl(null);
        setConvertedImageUrl(null);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    });

    const unlistenDragEnter = listen<string>("tauri://drag-enter", () => {
      console.log("Drag enter detected");
      setIsDragging(true);
    });

    const unlistenDragLeave = listen<string>("tauri://drag-leave", () => {
      console.log("Drag leave detected");
      setIsDragging(false);
    });

    const unlistenDragOver = listen<string>("tauri://drag-over", () => {
      console.log("Drag over detected");
    });

    return () => {
      console.log("Cleaning up event listeners...");
      unlisten.then((f) => f());
      unlistenDragEnter.then((f) => f());
      unlistenDragLeave.then((f) => f());
      unlistenDragOver.then((f) => f());
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setCroppedImageUrl(null);
        setResizedImageUrl(null);
        setConvertedImageUrl(null);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
  };

  const handleCrop = async () => {
    if (imgRef.current && crop?.width && crop?.height) {
      const croppedImage = await invoke("crop_image", {
        imageData: image,
        x: Math.round(crop.x),
        y: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height),
      });
      setCroppedImageUrl(croppedImage as string);
    }
  };

  const handleResize = async () => {
    if (image && width > 0 && height > 0) {
      const resizedImage = await invoke("resize_image", {
        imageData: image,
        width: width,
        height: height,
      });
      setResizedImageUrl(resizedImage as string);
    }
  };

  const handleConvert = async () => {
    if (image) {
      const convertedImage = await invoke("convert_image", {
        imageData: image,
        targetFormat: targetFormat,
      });
      setConvertedImageUrl(convertedImage as string);
    }
  };

  const handleDivClick = () => {
    inputRef.current?.click();
  };

  function dropzone() {
    if (image) return null;
    return (
      <div
        onClick={handleDivClick}
        className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors border-red-400 ${
          isDragging ? " bg-red-200/20" : ""
        }`}
      >
        <Upload size={72} className="text-red-500" />
        <h4 className="mt-4 text-2xl font-metal-mania tracking-wide text-red-500">
          Drop your image here
        </h4>
        <p className="mt-4 text-sm">
          Drag & drop an image here, or click to select a file
        </p>
        <input
          hidden
          id="upload"
          type="file"
          ref={inputRef}
          accept="image/*,.ico,.icns,.tiff,.tga"
          className="text-center"
          onChange={handleImageChange}
        />
      </div>
    );
  }

  function preview() {
    if (!image) return null;
    return (
      <div className="rounded-lg w-1/2">
        <div className="relative">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            className="p-2 bg-red-200/25 rounded-lg"
          >
            <img src={image} onLoad={onImageLoad} />
          </ReactCrop>
          <button
            className="rounded-full bg-red-500 p-1 text-black absolute top-0 right-0 translate-x-1/2 -translate-y-1/2"
            onClick={() => setImage("")}
          >
            <X size={12} />
          </button>
        </div>

        <div className="flex items-center justify-center space-x-2 mt-4">
          <button
            onClick={handleCrop}
            className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide"
          >
            Crop
          </button>
          <button
            onClick={handleResize}
            className="p-1.5 px-4 text-xl rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide"
          >
            Resize
          </button>
          <select
            onChange={(e) => setTargetFormat(e.target.value)}
            className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide !shadow-none"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="gif">GIF</option>
            <option value="bmp">BMP</option>
            <option value="webp">WEBP</option>
            <option value="ico">ICO</option>
            <option value="tiff">TIFF</option>
            <option value="tga">TGA</option>
          </select>
          <button
            onClick={handleConvert}
            className="p-1.5 px-4 text-xl rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide"
          >
            Convert
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-8 rounded-lg bg-black flex-1 items-center justify-center">
      {dropzone()}
      {preview()}
      {croppedImageUrl && (
        <div>
          <h2>Cropped Image</h2>
          <img alt="Crop" src={croppedImageUrl} />
        </div>
      )}
      {resizedImageUrl && (
        <div>
          <h2>Resized Image</h2>
          <img alt="Resize" src={resizedImageUrl} />
        </div>
      )}
      {convertedImageUrl && (
        <div>
          <h2>Converted Image</h2>
          <img alt="Converted" src={convertedImageUrl} />
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
