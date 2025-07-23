import { invoke } from "@tauri-apps/api/core";
import React, { useContext, useState } from "react";
import { formatFileSize, getImageMetadata, handleDownloadWithToast } from "../utils";
import { ToastContext } from "./Toast";

interface ConvertViewProps {
	image: string;
	fileName?: string;
	clear: () => void;
}

const ConvertView: React.FC<ConvertViewProps> = ({ image, fileName, clear }) => {
	const [targetFormat, setTargetFormat] = useState<string>("png");
	const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isConverting, setIsConverting] = useState(false);

	const { setToast } = useContext(ToastContext)!;

	const handleConvert = async () => {
		if (image) {
			try {
				setIsConverting(true);
				const convertedImage = await invoke("convert_image", {
					imageData: image,
					targetFormat: targetFormat,
				});
				setConvertedImageUrl(convertedImage as string);
			} catch (error: any) {
				setError(error);
			} finally {
				setIsConverting(false);
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

	function downloadButton(url: string, filename: string, format?: string) {
		let finalFileName = filename;
		if (format) {
			finalFileName = `${fileName}.${format}`;
		}
		return (
			<button
				onClick={() => handleDownloadWithToast(url, finalFileName, (msg) => setToast({ message: msg, duration: 3000 }))}
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
					setConvertedImageUrl(null);
					setTargetFormat("png");
					clear();
				}}
				className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
			>
				Clear
			</button>
		);
	}

	if (convertedImageUrl) {
		return (
			<div className="w-full flex-1 overflow-hidden flex items-center gap-4">
				<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
					<div className="h-full border border-red-500 rounded-lg p-2 relative">
						<img
							alt="Converted"
							src={convertedImageUrl}
							style={{ height: "100%", objectFit: "contain", display: "block" }}
						/>
					</div>
				</div>
				<div className="flex flex-col items-center text-center gap-4 w-1/3">
					<h2 className="font-metal-mania text-2xl text-red-500">Converted Image</h2>
					{fileMetadataView(convertedImageUrl)}
					{downloadButton(convertedImageUrl, fileName?.split(".")[0] || "converted-image", targetFormat)}
					{clearButton()}
					{error && <p className="text-red-500 font-metal-mania">{error}</p>}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full flex items-center flex-1 justify-center overflow-hidden gap-4">
			<div className="flex-1 overflow-hidden h-full flex items-center justify-center">
				<div className="h-full border border-red-500 rounded-lg p-2 relative">
					{isConverting && (
						<div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10">
							<div className="loader" />
						</div>
					)}
					<img
						src={image}
						className="rounded-lg"
						style={{ height: "100%", objectFit: "contain", display: "block" }}
					/>
				</div>
			</div>
			<div className="flex flex-col items-center text-center gap-4 w-1/3">
				{fileMetadataView()}
				<select
					value={targetFormat}
					onChange={(e) => setTargetFormat(e.target.value)}
					className="p-1.5 text-xl px-4 rounded-lg bg-black border border-red-500 text-red-500 font-metal-mania tracking-wide focus:outline-none focus:border-red-400 w-fit max-w-xs"
					disabled={isConverting}
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
					className="p-1.5 text-xl px-4 rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 text-black font-metal-mania tracking-wide w-full max-w-xs"
					disabled={isConverting}
				>
					Convert
				</button>
				{clearButton()}
				{error && <p className="text-red-500 font-metal-mania">{error}</p>}
			</div>
		</div>
	);
};

export default ConvertView;
