import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export function getImageMetadata(dataUrl: string): {
	name?: string;
	size?: number;
	format?: string;
	width?: number;
	height?: number;
} {
	if (!dataUrl) return {};
	const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,/);
	const format = match ? match[1] : undefined;
	const size = Math.floor(((dataUrl.length - (dataUrl.indexOf(",") + 1)) * 3) / 4);

	// Try to get width/height from the image
	let width: number | undefined = undefined;
	let height: number | undefined = undefined;
	if (typeof window !== "undefined") {
		try {
			const img = new window.Image();
			img.src = dataUrl;
			// This is synchronous if the image is already loaded, otherwise we can't get it here
			if (img.complete) {
				width = img.naturalWidth;
				height = img.naturalHeight;
			}
		} catch {}
	}
	return { format, size, width, height };
}

export function formatFileSize(size: number | undefined): string {
	if (typeof size !== "number" || isNaN(size)) return "";
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
	return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function dataURLtoUint8Array(dataUrl: string): Uint8Array {
	const arr = dataUrl.split(",");
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return u8arr;
}

export async function handleDownload(dataUrl: string, defaultFileName: string) {
	const filePath = await save({
		defaultPath: defaultFileName,
		filters: [{ name: "Image", extensions: [defaultFileName.split(".").pop()!] }],
	});
	if (filePath) {
		const bytes = dataURLtoUint8Array(dataUrl);
		await writeFile(filePath, bytes);
	}
}

export async function handleDownloadWithToast(dataUrl: string, defaultFileName: string, onDone: (msg: string) => void) {
	const filePath = await save({
		defaultPath: defaultFileName,
		filters: [{ name: "Image", extensions: [defaultFileName.split(".").pop()!] }],
	});
	if (filePath) {
		const bytes = dataURLtoUint8Array(dataUrl);
		await writeFile(filePath, bytes);
		onDone(`Download complete: ${defaultFileName}`);
	}
}
