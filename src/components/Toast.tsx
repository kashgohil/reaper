import React, { useCallback, useContext, useEffect, useState } from "react";

interface ToastProps {
	message: string;
	duration?: number;
}

export const ToastContext = React.createContext<{
	toast: ToastProps | null;
	setToast: (toast: ToastProps | null) => void;
	onClose: () => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [toast, setToast] = useState<{ message: string; duration?: number } | null>(null);

	const onClose = useCallback(() => {
		setToast(null);
	}, [setToast]);

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(onClose, toast.duration || 3000);
			return () => clearTimeout(timer);
		}
	}, [onClose, toast]);

	return (
		<ToastContext.Provider value={{ toast, setToast, onClose }}>
			{children}
			{toast && <Toast message={toast.message} />}
		</ToastContext.Provider>
	);
};

const Toast: React.FC<{ message: string }> = ({ message }) => {
	const { onClose } = useContext(ToastContext)!;

	return (
		<div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black text-red-200 px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 font-metal-mania text-lg animate-fade-in">
			<span>{message}</span>
			<button
				onClick={onClose}
				className="ml-4 text-red-500 hover:text-red-300 text-xl font-bold focus:outline-none"
				aria-label="Close notification"
			>
				×
			</button>
		</div>
	);
};

export default Toast;
