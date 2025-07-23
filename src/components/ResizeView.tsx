import { invoke } from "@tauri-apps/api/core";
import React, { useContext, useState } from "react";
import { formatFileSize, getImageMetadata, handleDownloadWithToast } from "../utils";
import { ToastContext } from "./Toast";

interface ResizeViewProps {
	image: string;
	fileName?: string;
	clear: () => void;
}

const ResizeView: React.FC<ResizeViewProps> = ({ image, fileName, clear }) => {
	const [width, setWidth] = useState<number>(0);
	const [height, setHeight] = useState<number>(0);
	const [isResizing, setIsResizing] = useState<boolean>(false);
	const [resizedImageUrl, setResizedImageUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const { setToast } = useContext(ToastContext)!;

	const handleResize = async () => {
		if (image && width > 0 && height > 0) {
			try {
				setIsResizing(true);

				const resizedImage = await invoke("resize_image", {
					imageData: image,
					width: width,
					height: height,
				});

				setTimeout(() => {
					setResizedImageUrl(resizedImage as string);
					setIsResizing(false);
				}, 5000);
			} catch (error: any) {
				setError(error);
				setIsResizing(false);
			}
		}
	};

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
				disabled={isResizing}
				onClick={() => {
					setResizedImageUrl(null);
					setWidth(0);
					setHeight(0);
					clear();
				}}
				className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
			>
				Clear
			</button>
		);
	}

	if (resizedImageUrl) {
		const imgMeta = image ? getImageMetadata(image) : {};
		const ext = imgMeta.format ? imgMeta.format.split("/")[1] : "png";
		return (
			<div className="w-full flex-1 overflow-hidden flex items-center gap-4">
				<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
					<div className="h-full border border-red-500 rounded-lg p-2">
						<img
							alt="Resized"
							src={resizedImageUrl}
							style={{ height: "100%", objectFit: "contain", display: "block" }}
						/>
					</div>
				</div>
				<div className="flex flex-col items-center text-center gap-4 w-1/3">
					<h2 className="font-metal-mania text-2xl text-red-500">Resized Image</h2>
					{fileMetadataView(resizedImageUrl)}
					{downloadButton(resizedImageUrl, `${fileName?.split(".")[0] || "image"}-${width}x${height}.${ext}`)}
					{clearButton()}
					{error && <p className="text-red-500 font-metal-mania">{error}</p>}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center overflow-hidden gap-4 h-full w-full">
			<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
				<div className="h-full border border-red-500 rounded-lg p-2 relative overflow-clip">
					{isResizing && (
						<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10">
							<div className="loader" />
						</div>
					)}
					<img
						src={image}
						style={{ height: "100%", objectFit: "contain", display: "block" }}
					/>
				</div>
			</div>
			<div className="flex flex-col items-center text-center gap-4 w-1/3">
				{fileMetadataView()}
				<input
					type="number"
					min={1}
					disabled={isResizing}
					value={width}
					onChange={(e) => setWidth(Number(e.target.value))}
					placeholder="Width"
					className="w-24 px-2 py-1 rounded bg-black border border-red-500 text-red-500 font-metal-mania text-lg focus:outline-none focus:border-red-400"
				/>
				<input
					type="number"
					min={1}
					disabled={isResizing}
					value={height}
					onChange={(e) => setHeight(Number(e.target.value))}
					placeholder="Height"
					className="w-24 px-2 py-1 rounded bg-black border border-red-500 text-red-500 font-metal-mania text-lg focus:outline-none focus:border-red-400"
				/>
				<button
					disabled={isResizing}
					onClick={handleResize}
					className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
				>
					Resize
				</button>
				{clearButton()}
				{error && <p className="text-red-500 font-metal-mania">{error}</p>}
			</div>
		</div>
	);
};

export default ResizeView;
