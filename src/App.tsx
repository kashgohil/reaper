import React, { useState } from "react";
import "./App.css";
import reaperImage from "./assets/reaper.png";
import ImageEditor from "./components/ImageEditor";
import MergeView from "./components/MergeView";
import { ToastProvider } from "./components/Toast";

const VIEWS = ["Image Editor", "PDF Merger"] as const;
type View = (typeof VIEWS)[number];

const App: React.FC = () => {
	const [activeView, setActiveView] = useState<View>("Image Editor");

	const renderView = () => {
		switch (activeView) {
			case "Image Editor":
				return <ImageEditor />;
			case "PDF Merger":
				return <MergeView />;
		}
	};

	return (
		<div className="bg-red-500/90 h-screen flex flex-col p-2">
			<div className="flex items-center justify-center">
				<div className="flex items-center gap-4">
					<img
						src={reaperImage}
						className="h-25 w-25"
						alt="Reaper Logo"
					/>
					<div className="flex flex-col">
						<h1 className="text-4xl tracking-wide font-metal-mania text-black">
							Reaper
						</h1>
						<h3 className="text-lg text-gray-200 font-metal-mania">
							Slice & Dice
						</h3>
					</div>
				</div>
			</div>
			<div className="flex justify-center gap-4 my-4">
				{VIEWS.map((view) => (
					<button
						key={view}
						onClick={() => setActiveView(view)}
						className={`px-6 py-2 rounded-lg font-metal-mania text-xl tracking-wide border-b-2 transition-colors duration-200 ${
							activeView === view
								? "bg-black text-red-500 border-red-500"
								: "bg-red-500 text-black border-transparent hover:bg-red-900/40"
						}`}
					>
						{view}
					</button>
				))}
			</div>
			<div className="flex-1 flex">
				<ToastProvider>{renderView()}</ToastProvider>
			</div>
		</div>
	);
};

export default App;
