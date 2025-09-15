import React, { useRef, useEffect, useCallback } from 'react';
import { BackIcon } from './icons';

interface CameraViewProps {
    stream: MediaStream;
    onCapture: (file: File) => void;
    onBack: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ stream, onCapture, onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && stream) {
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            // Explicitly play the video to ensure it starts.
            // Modern browsers often have strict autoplay policies.
            video.play().catch(error => console.error("Error attempting to play video:", error));
        }
    }, [stream]);

    const handleCapture = useCallback(() => {
        if (videoRef.current && stream) {
            const canvas = document.createElement('canvas');
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], 'ingredient-capture.jpg', { type: 'image/jpeg' });
                        onCapture(file);
                    }
                }, 'image/jpeg', 0.95);
            }
        }
    }, [stream, onCapture]);

    return (
        <div className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center fade-in">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
            
            <div className="absolute top-6 left-6 z-50">
                <button onClick={onBack} className="bg-black bg-opacity-50 text-white rounded-full p-3 active:bg-opacity-75 transition-transform duration-200 active:scale-95">
                    <BackIcon className="w-6 h-6 icon-shadow"/>
                </button>
            </div>

            <div className="absolute bottom-10 left-0 right-0 flex justify-center z-50">
                <button 
                    onClick={handleCapture} 
                    aria-label="Tomar foto"
                    className="w-20 h-20 rounded-full bg-blue-500 border-4 border-white shadow-lg transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-400"
                ></button>
            </div>
        </div>
    );
};

export default CameraView;