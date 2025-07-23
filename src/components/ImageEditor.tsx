import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ConvertView from "./ConvertView";
import CropView from "./CropView";
import ResizeView from "./ResizeView";
import { ToastProvider } from "./Toast";

const TABS = ["Crop", "Resize", "Convert"] as const;
type Tab = (typeof TABS)[number];

const ImageEditor: React.FC = () => {
	const [image, setImage] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [activeTab, setActiveTab] = useState<Tab>("Crop");
	const [fileName, setFileName] = useState<string | undefined>(undefined);
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
				filePath = event.payload.path || event.payload.paths?.[0] || event.payload.file || event.payload.files?.[0];
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

			setFileName(filePath.split("/").pop());

			try {
				console.log("Reading file:", filePath);
				const imageDataUrl = await invoke<string>("read_image_file", {
					path: filePath,
				});
				console.log("Image loaded successfully");
				setImage(imageDataUrl);
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
			const file = e.target.files[0];
			setFileName(file.name);
			const reader = new FileReader();
			reader.onload = (event) => {
				setImage(event.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDivClick = () => {
		inputRef.current?.click();
	};

	const clear = () => {
		setImage(null);
	};

	function dropzone() {
		if (image) return null;
		return (
			<div
				onClick={handleDivClick}
				className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors border-red-400 gap-4 ${
					isDragging ? " bg-red-200/20" : ""
				}`}
			>
				<Upload
					size={72}
					className="text-red-500"
				/>
				<h4 className="text-2xl font-metal-mania tracking-wide text-red-500">Drop your image here</h4>
				<p className="text-sm">Drag & drop an image here, or click to select a file</p>
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

	function tabBar() {
		return (
			<div className="flex space-x-2">
				{TABS.map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`px-6 py-2 rounded-t-lg font-metal-mania text-xl tracking-wide border-b-2 transition-colors duration-200
						${
							activeTab === tab
								? "bg-red-500 text-black border-red-500"
								: "bg-black text-red-500 border-transparent hover:bg-red-900/40"
						}`}
						style={{ outline: "none" }}
					>
						{tab}
					</button>
				))}
			</div>
		);
	}

	function view() {
		if (!image) return null;

		switch (activeTab) {
			case "Convert":
				return (
					<ConvertView
						image={image}
						clear={clear}
						fileName={fileName}
					/>
				);
			case "Crop":
				return (
					<CropView
						image={image}
						clear={clear}
						fileName={fileName}
					/>
				);
			case "Resize":
				return (
					<ResizeView
						image={image}
						clear={clear}
						fileName={fileName}
					/>
				);
		}
	}

	function editorView() {
		if (!image) return null;
		return (
			<div className="w-full flex flex-col items-center h-full gap-4">
				{tabBar()}
				<div className="w-full bg-black rounded-b-lg flex-1 overflow-hidden flex flex-col justify-center items-center">
					{view()}
				</div>
			</div>
		);
	}

	return (
		<ToastProvider>
			<div className="flex flex-col gap-4 p-8 rounded-lg bg-black flex-1 items-center justify-center w-full overflow-hidden">
				{dropzone()}
				{editorView()}
			</div>
		</ToastProvider>
	);
};

export default ImageEditor;
