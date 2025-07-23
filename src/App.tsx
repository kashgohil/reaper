import React from "react";
import "./App.css";
import reaperImage from "./assets/reaper.png";
import ImageEditor from "./components/ImageEditor";

const App: React.FC = () => {
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
						<h1 className="text-4xl tracking-wide font-metal-mania text-black">Reaper</h1>
						<h3 className="text-lg text-gray-200 font-metal-mania">Slice & Dice</h3>
					</div>
				</div>
			</div>
			<ImageEditor />
		</div>
	);
};

export default App;
