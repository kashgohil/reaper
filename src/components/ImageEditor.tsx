import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const TABS = ["Crop", "Resize", "Convert"] as const;
type Tab = (typeof TABS)[number];

function getImageMetadata(dataUrl: string): { name?: string; size?: number; format?: string } {
	// This is a placeholder. In a real app, you would get the file name/size from the upload or drag event.
	// Here, we can only infer format from the data URL and estimate size from base64 length.
	if (!dataUrl) return {};
	const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,/);
	const format = match ? match[1] : undefined;
	const size = Math.floor(((dataUrl.length - (dataUrl.indexOf(",") + 1)) * 3) / 4); // rough estimate
	return { format, size };
}

const ImageEditor: React.FC = () => {
	const [image, setImage] = useState<string | null>(null);
	const [crop, setCrop] = useState<Crop>();
	const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
	const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
	const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
	const [width, setWidth] = useState<number>(0);
	const [height, setHeight] = useState<number>(0);
	const [targetFormat, setTargetFormat] = useState<string>("png");
	const [isDragging, setIsDragging] = useState(false);
	const [activeTab, setActiveTab] = useState<Tab>("Crop");
	const [fileName, setFileName] = useState<string | undefined>(undefined);
	const [zoom, setZoom] = useState<number>(1);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [panMode, setPanMode] = useState(false); // false = crop mode, true = pan mode
	const panStart = useRef<{ x: number; y: number } | null>(null);
	const mouseStart = useRef<{ x: number; y: number } | null>(null);
	const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const animationFrameRef = useRef<number | null>(null);

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
			const file = e.target.files[0];
			setFileName(file.name);
			const reader = new FileReader();
			reader.onload = (event) => {
				setImage(event.target?.result as string);
				setCroppedImageUrl(null);
				setResizedImageUrl(null);
				setConvertedImageUrl(null);
			};
			reader.readAsDataURL(file);
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

	function handlePanStart(e: React.MouseEvent | React.TouchEvent) {
		if (zoom === 1) return;
		setIsPanning(true);
		if ("touches" in e) {
			panStart.current = { ...pan };
			mouseStart.current = {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY,
			};
		} else {
			panStart.current = { ...pan };
			mouseStart.current = {
				x: e.clientX,
				y: e.clientY,
			};
		}
		panRef.current = { ...pan };
	}
	function handlePanMove(e: React.MouseEvent | React.TouchEvent) {
		if (!isPanning || zoom === 1) return;
		let clientX, clientY;
		if ("touches" in e) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			clientX = e.clientX;
			clientY = e.clientY;
		}
		const dx = clientX - (mouseStart.current?.x || 0);
		const dy = clientY - (mouseStart.current?.y || 0);
		const newPan = {
			x: (panStart.current?.x || 0) + dx,
			y: (panStart.current?.y || 0) + dy,
		};
		panRef.current = newPan;
		if (!animationFrameRef.current) {
			animationFrameRef.current = requestAnimationFrame(() => {
				setPan(panRef.current);
				animationFrameRef.current = null;
			});
		}
	}
	function handlePanEnd() {
		setIsPanning(false);
		setPan(panRef.current); // Ensure final position is set
	}
	useEffect(() => {
		if (!isPanning) return;
		const handleMouseUp = () => setIsPanning(false);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("touchend", handleMouseUp);
		return () => {
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("touchend", handleMouseUp);
		};
	}, [isPanning]);
	useEffect(() => {
		if (zoom === 1) setPan({ x: 0, y: 0 });
	}, [zoom, image]);

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

	function downloadButton(url: string, filename: string) {
		return (
			<a
				href={url}
				download={filename}
				className="inline-block px-4 py-2 bg-red-500 text-black rounded-lg font-metal-mania tracking-wide hover:bg-red-400 transition-colors duration-200"
			>
				Download
			</a>
		);
	}

	function clearButton() {
		return (
			<button
				onClick={() => {
					setImage(null);
					setCroppedImageUrl(null);
					setResizedImageUrl(null);
					setConvertedImageUrl(null);
					setFileName(undefined);
					setCrop(undefined);
					setZoom(1);
					setPan({ x: 0, y: 0 });
					setIsPanning(false);
					setPanMode(false);
					setWidth(0);
					setHeight(0);
					setTargetFormat("png");
				}}
				className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
			>
				Clear
			</button>
		);
	}

	function fileMetadataView() {
		if (!image) return null;
		const { format, size } = getImageMetadata(image);
		return (
			<div
				className="w-full flex flex-col items-center justify-between gap-6 px-2 text-base text-red-400 font-metal-mania"
				style={{ fontSize: "1.25rem" }}
			>
				<div className="flex flex-col gap-2">
					{fileName && (
						<span>
							Name: <span className="text-red-200">{fileName}</span>
						</span>
					)}
					{size && (
						<span>
							Size: <span className="text-red-200">{(size / 1024).toFixed(1)} KB</span>
						</span>
					)}
					{format && (
						<span>
							Format: <span className="text-red-200">{format.replace("image/", "").toUpperCase()}</span>
						</span>
					)}
				</div>
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

	function cropView() {
		return (
			<>
				<div className="flex items-center h-full w-full flex-1 overflow-hidden justify-center gap-4">
					<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
						<div className="h-full border border-red-500 rounded-lg p-2">
							<ReactCrop
								crop={crop}
								onChange={panMode ? () => {} : (c, _) => setCrop(c)}
								style={{
									border: "none",
									background: "transparent",
								}}
								ruleOfThirds
								disabled={panMode}
								className="h-full w-full [&>div]:h-full"
							>
								<img
									src={image!}
									onLoad={onImageLoad}
									style={{
										height: "100%",
										objectFit: "contain",
										display: "block",
										margin: "0 auto",
										transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
										transition: isPanning ? "none" : "transform 0.2s",
										cursor: zoom > 1 && panMode ? (isPanning ? "grabbing" : "grab") : "default",
										userSelect: "none",
										pointerEvents: panMode ? "auto" : "none",
									}}
									draggable
									alt="Crop source"
									onMouseDown={panMode ? handlePanStart : undefined}
									onMouseMove={panMode ? handlePanMove : undefined}
									onMouseUp={panMode ? handlePanEnd : undefined}
									onTouchStart={panMode ? handlePanStart : undefined}
									onTouchMove={panMode ? handlePanMove : undefined}
									onTouchEnd={panMode ? handlePanEnd : undefined}
								/>
							</ReactCrop>
						</div>
					</div>
					<div className="flex flex-col items-center w-1/3 gap-4">
						{fileMetadataView()}
						<div className="flex flex-col items-center w-full gap-2">
							<div className="flex flex-row items-center gap-2">
								<button
									onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
									className="px-3 py-1 rounded bg-red-500 text-black font-metal-mania text-lg hover:bg-red-400 transition-colors"
									aria-label="Zoom out"
								>
									-
								</button>
								<span className="text-red-200 font-metal-mania text-lg w-16 text-center">{zoom.toFixed(2)}x</span>
								<button
									onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
									className="px-3 py-1 rounded bg-red-500 text-black font-metal-mania text-lg hover:bg-red-400 transition-colors"
									aria-label="Zoom in"
								>
									+
								</button>
							</div>
						</div>
						<button
							onClick={() => setPanMode((m) => !m)}
							className={`p-1.5 text-xl px-4 rounded-lg font-metal-mania tracking-wide w-full max-w-xs transition-colors duration-200 border-2 ${
								panMode
									? "bg-red-500 text-black border-red-500 hover:bg-red-400"
									: "bg-black text-red-400 border-red-500 hover:bg-red-900/40"
							}`}
						>
							{panMode ? "Switch to Crop Mode" : "Switch to Pan Mode"}
						</button>
						{!panMode && (
							<button
								onClick={handleCrop}
								className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
							>
								Crop
							</button>
						)}
						{clearButton()}
					</div>
				</div>
				{croppedImageUrl && (
					<div className="flex flex-col items-center">
						<h2 className="font-metal-mania text-lg text-red-500">Cropped Image</h2>
						<img
							alt="Crop"
							src={croppedImageUrl}
							className="rounded-lg max-w-xs border border-red-500 bg-black p-2"
							style={{
								maxWidth: "100%",
								maxHeight: "100%",
								objectFit: "contain",
							}}
						/>
						{downloadButton(croppedImageUrl, "cropped-image.png")}
					</div>
				)}
			</>
		);
	}

	function resizeView() {
		return (
			<>
				<div className="flex flex-1 items-center overflow-hidden gap-4 h-full w-full">
					<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
						<div className="h-full border border-red-500 rounded-lg p-2">
							<img
								src={image!}
								style={{
									height: "100%",
									objectFit: "contain",
									display: "block",
								}}
							/>
						</div>
					</div>
					<div className="flex flex-col items-center gap-4 w-1/3">
						{fileMetadataView()}
						<input
							type="number"
							min={1}
							value={width}
							onChange={(e) => setWidth(Number(e.target.value))}
							placeholder="Width"
							className="w-24 px-2 py-1 rounded bg-black border border-red-500 text-red-500 font-metal-mania text-lg focus:outline-none focus:border-red-400"
						/>
						<input
							type="number"
							min={1}
							value={height}
							onChange={(e) => setHeight(Number(e.target.value))}
							placeholder="Height"
							className="w-24 px-2 py-1 rounded bg-black border border-red-500 text-red-500 font-metal-mania text-lg focus:outline-none focus:border-red-400"
						/>
						<button
							onClick={handleResize}
							className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
						>
							Resize
						</button>
						{clearButton()}
					</div>
				</div>
				{resizedImageUrl && (
					<div className="flex flex-col items-center">
						<h2 className="font-metal-mania text-lg text-red-500">Resized Image</h2>
						<img
							alt="Resize"
							src={resizedImageUrl}
							className="rounded-lg max-w-xs border border-red-500 bg-black p-2"
							style={{
								maxWidth: "100%",
								maxHeight: "100%",
								objectFit: "contain",
							}}
						/>
						{downloadButton(resizedImageUrl, "resized-image.png")}
					</div>
				)}
			</>
		);
	}

	function convertView() {
		return (
			<div className="flex flex-col items-center w-full h-full">
				<div className="rounded-lg w-full max-w-lg flex flex-col items-center flex-1 justify-center">
					<div className="border border-red-500 bg-black rounded-lg p-2 flex items-center justify-center w-full">
						<img
							src={image!}
							className="rounded-lg"
							style={{
								width: "100%",
								height: "100%",
								maxWidth: "100%",
								maxHeight: "100%",
								objectFit: "contain",
								display: "block",
								margin: "0 auto",
							}}
						/>
					</div>
					<div className="flex space-x-2">
						<select
							value={targetFormat}
							onChange={(e) => setTargetFormat(e.target.value)}
							className="p-1.5 text-xl px-4 rounded-lg bg-black border border-red-500 text-red-500 font-metal-mania tracking-wide focus:outline-none focus:border-red-400"
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
							className="px-4 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-black font-metal-mania text-lg tracking-wide transition-colors duration-200"
						>
							Convert
						</button>
					</div>
				</div>
				{convertedImageUrl && (
					<div className="flex flex-col items-center">
						<h2 className="font-metal-mania text-lg text-red-500">Converted Image</h2>
						<img
							alt="Converted"
							src={convertedImageUrl}
							className="rounded-lg max-w-xs border border-red-500 bg-black p-2"
							style={{
								maxWidth: "100%",
								maxHeight: "100%",
								objectFit: "contain",
							}}
						/>
						{downloadButton(convertedImageUrl, `converted-image.${targetFormat}`)}
					</div>
				)}
			</div>
		);
	}

	function editorView() {
		if (!image) return null;
		return (
			<div className="w-full flex flex-col items-center h-full gap-4">
				{tabBar()}
				<div className="w-full bg-black rounded-b-lg flex-1 overflow-hidden flex flex-col justify-center items-center">
					{activeTab === "Crop" && cropView()}
					{activeTab === "Resize" && resizeView()}
					{activeTab === "Convert" && convertView()}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 p-8 rounded-lg bg-black flex-1 items-center justify-center w-full overflow-hidden">
			{dropzone()}
			{editorView()}
		</div>
	);
};

export default ImageEditor;
