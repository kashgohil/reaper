import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { Upload } from "lucide-react";
import React, { useEffect, useState } from "react";

const MergeView: React.FC = () => {
  const [isMerging, setIsMerging] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let unlistenDrop: (() => void) | undefined;
    let unlistenHover: (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenDrop = await listen<string[]>("tauri://file-drop", (event) => {
        console.log("File drop event:", event);
        const droppedFiles = event.payload.filter((f) => f.endsWith(".pdf"));
        console.log("Dropped PDF files:", droppedFiles);
        setFiles((prev) => [...prev, ...droppedFiles]);
        setIsDragging(false);
      });

      unlistenHover = await listen<string[]>("tauri://file-drop-hover", (event) => {
        console.log("Drag hover event:", event);
        setIsDragging(true);
      });

      unlistenCancelled = await listen<void>("tauri://file-drop-cancelled", (event) => {
        console.log("Drag cancelled event:", event);
        setIsDragging(false);
      });
    };

    setupListeners();

    return () => {
      if (unlistenDrop) unlistenDrop();
      if (unlistenHover) unlistenHover();
      if (unlistenCancelled) unlistenCancelled();
    };
  }, []);

  const handleMerge = async () => {
    if (files.length === 0) {
      alert("Please drop at least one PDF file.");
      return;
    }

    setIsMerging(true);
    try {
      const mergedPdfPath = await invoke<string>("merge_pdfs", {
        paths: files,
      });

      const contents = await readFile(mergedPdfPath);
      const suggestedFilename = "merged.pdf";
      const filePath = await save({
        title: "Save Merged PDF",
        defaultPath: suggestedFilename,
        filters: [
          {
            name: "PDF",
            extensions: ["pdf"],
          },
        ],
      });

      if (filePath) {
        await writeFile(filePath, contents);
        alert("PDFs merged and saved successfully!");
        setFiles([]);
      }
    } catch (error) {
      console.error("Failed to merge PDFs:", error);
      alert(`Error merging PDFs: ${error}`);
    } finally {
      setIsMerging(false);
    }
  };

  const removeFile = (file: string) => {
    setFiles(files.filter((f) => f !== file));
  };

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "PDF",
            extensions: ["pdf"],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        console.log("Selected files:", paths);
        setFiles((prev) => [...prev, ...paths]);
      }
    } catch (error) {
      console.error("Failed to select files:", error);
      alert(`Error selecting files: ${error}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-8 rounded-lg bg-black flex-1 items-center justify-center w-full overflow-hidden">
      {files.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          <div
            className={`w-full h-full border border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors border-red-400 gap-4 ${
              isDragging ? " bg-red-200/20" : ""
            }`}
          >
            <Upload size={72} className="text-red-500" />
            <h4 className="text-2xl font-metal-mania tracking-wide text-red-500">
              Drop your PDFs here
            </h4>
            <p className="text-sm text-gray-300">Drag & drop PDF files to merge</p>
            <p className="text-xs text-gray-400">or</p>
            <button
              onClick={handleSelectFiles}
              className="px-6 py-2 rounded-lg font-metal-mania text-lg tracking-wide border-2 transition-colors duration-200 bg-red-500 text-black border-red-500 hover:bg-red-600"
            >
              Click to Select PDFs
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-metal-mania text-red-500">
              {files.length} PDF{files.length > 1 ? "s" : ""} selected
            </h3>
            <button
              onClick={handleSelectFiles}
              className="px-4 py-1 rounded-lg text-sm border transition-colors duration-200 bg-gray-800 text-red-500 border-red-500 hover:bg-gray-700"
            >
              Add More
            </button>
          </div>
          <div className="files-list flex flex-col gap-2 max-h-96 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file}-${index}`}
                className="file-item flex justify-between items-center bg-gray-800 p-3 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-red-500 font-bold">{index + 1}.</span>
                  <span className="text-gray-200">{file.split("/").pop()}</span>
                </div>
                <button
                  onClick={() => removeFile(file)}
                  className="text-red-500 hover:text-red-400 font-bold px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleMerge}
            disabled={isMerging}
            className="px-6 py-3 rounded-lg font-metal-mania text-xl tracking-wide border-b-2 transition-colors duration-200 bg-red-500 text-black border-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMerging ? "Merging..." : "Merge PDFs"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MergeView;
