import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactCrop, { Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { formatFileSize, getImageMetadata, handleDownloadWithToast } from "../utils";
import { ToastContext } from "./Toast";

interface CropViewProps {
	image: string;
	fileName?: string;
	clear: () => void;
}

const CropView: React.FC<CropViewProps> = ({ image, fileName, clear }) => {
	const [crop, setCrop] = useState<Crop>();
	const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
	const [zoom, setZoom] = useState<number>(1);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [panMode, setPanMode] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isCropping, setIsCropping] = useState(false);

	const { setToast } = useContext(ToastContext)!;

	const imgRef = useRef<HTMLImageElement | null>(null);
	const panStart = useRef<{ x: number; y: number } | null>(null);
	const mouseStart = useRef<{ x: number; y: number } | null>(null);
	const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const animationFrameRef = useRef<number | null>(null);
	const debounceTimeoutRef = useRef<number | null>(null);

	const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
		imgRef.current = e.currentTarget;
	};

	const debouncedSetCrop = useCallback((newCrop: Crop) => {
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}
		debounceTimeoutRef.current = window.setTimeout(() => {
			setCrop(newCrop);
		}, 100);
	}, []);

	const handleCrop = async () => {
		if (imgRef.current && crop?.width && crop?.height) {
			try {
				setIsCropping(true);
				const croppedImage = await invoke("crop_image", {
					imageData: image,
					x: Math.round(crop.x),
					y: Math.round(crop.y),
					width: Math.round(crop.width),
					height: Math.round(crop.height),
				});
				setCroppedImageUrl(croppedImage as string);
			} catch (error: any) {
				setError(error);
			} finally {
				setIsCropping(false);
			}
		}
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
		animationFrameRef.current = requestAnimationFrame(() => {
			setPan(panRef.current);
		});
	}
	function handlePanEnd() {
		setIsPanning(false);
		setPan(panRef.current);
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

	function fileMetadataView(imageUrl?: string) {
		if (!imageUrl && !image) return null;
		const { format, size, width, height } = getImageMetadata(imageUrl || image!);
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
					{size !== undefined && (
						<span>
							Size: <span className="text-red-200">{formatFileSize(size)}</span>
						</span>
					)}
					{format && (
						<span>
							Format: <span className="text-red-200">{format.replace("image/", "").toUpperCase()}</span>
						</span>
					)}
					{width && height && (
						<span>
							Dimensions:{" "}
							<span className="text-red-200">
								{width} × {height}
							</span>
						</span>
					)}
				</div>
			</div>
		);
	}

	function downloadButton(url: string, filename: string) {
		return (
			<button
				onClick={() => handleDownloadWithToast(url, filename, (msg) => setToast({ message: msg, duration: 3000 }))}
				className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
			>
				Download
			</button>
		);
	}

	function clearButton() {
		return (
			<button
				onClick={() => {
					setCrop(undefined);
					setCroppedImageUrl(null);
					setZoom(1);
					setPan({ x: 0, y: 0 });
					setIsPanning(false);
					setPanMode(false);
					clear();
				}}
				className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
			>
				Clear
			</button>
		);
	}

	if (croppedImageUrl) {
		const imgMeta = image ? getImageMetadata(image) : {};
		const ext = imgMeta.format ? imgMeta.format.split("/")[1] : "png";
		return (
			<div className="w-full flex-1 overflow-hidden flex items-center gap-4">
				<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
					<div className="h-full border border-red-500 rounded-lg p-2">
						<img
							alt="Cropped"
							src={croppedImageUrl}
							style={{ height: "100%", objectFit: "contain", display: "block" }}
						/>
					</div>
				</div>
				<div className="flex flex-col items-center text-center gap-4 w-1/3">
					<h2 className="font-metal-mania text-2xl text-red-500">Cropped Image</h2>
					{fileMetadataView(croppedImageUrl)}
					{downloadButton(croppedImageUrl, `${fileName?.split(".")[0] || "image"}-cropped.${ext}`)}
					{clearButton()}
					{error && <p className="text-red-500 font-metal-mania">{error}</p>}
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center h-full w-full flex-1 overflow-hidden justify-center gap-4">
			<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
				<div className="h-full border border-red-500 rounded-lg p-2 relative overflow-clip">
					{isCropping && (
						<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10">
							<div className="loader" />
						</div>
					)}
					<ReactCrop
						crop={crop}
						onChange={panMode ? () => {} : (c, _) => debouncedSetCrop(c)}
						style={{ border: "none", background: "transparent" }}
						ruleOfThirds
						disabled={panMode || isCropping}
						className="h-full w-full [&>div]:h-full"
					>
						<img
							src={image}
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
			<div className="flex flex-col items-center text-center w-1/3 gap-4">
				{fileMetadataView()}
				<div className="flex flex-col items-center w-full gap-2">
					<div className="flex flex-row items-center gap-2">
						<button
							onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
							className="px-3 py-1 rounded bg-red-500 text-black font-metal-mania text-lg hover:bg-red-400 transition-colors"
							aria-label="Zoom out"
							disabled={isCropping}
						>
							-
						</button>
						<span className="text-red-200 font-metal-mania text-lg w-16 text-center">{zoom.toFixed(2)}x</span>
						<button
							onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
							className="px-3 py-1 rounded bg-red-500 text-black font-metal-mania text-lg hover:bg-red-400 transition-colors"
							aria-label="Zoom in"
							disabled={isCropping}
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
					disabled={isCropping}
				>
					{panMode ? "Switch to Crop Mode" : "Switch to Pan Mode"}
				</button>
				{!panMode && (
					<button
						onClick={handleCrop}
						className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
						disabled={isCropping}
					>
						Crop
					</button>
				)}
				{clearButton()}
				{error && <p className="text-red-500 font-metal-mania">{error}</p>}
			</div>
		</div>
	);
};

export default CropView;
