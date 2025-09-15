import React from 'react';
import { DownloadIcon, CloseIcon } from './icons';

interface InstallBannerProps {
    onInstall: () => void;
    onDismiss: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ onInstall, onDismiss }) => {
    return (
        <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 bg-indigo-600 text-white p-4 rounded-lg shadow-2xl z-50 flex items-center justify-between max-w-md animate-fade-in-up">
            <style>{`
                @keyframes fade-in-up {
                    0% {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s ease-out forwards;
                }
            `}</style>
            <div className="flex items-center">
                <DownloadIcon className="w-10 h-10 mr-4 text-indigo-200" />
                <div>
                    <h4 className="font-bold text-lg">Instalar App</h4>
                    <p className="text-sm text-indigo-100">Acceso rápido y sin conexión.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={onInstall}
                    className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-md active:bg-indigo-100 transition-colors duration-200 text-sm"
                >
                    Instalar
                </button>
                <button 
                    onClick={onDismiss}
                    className="text-indigo-200 active:bg-indigo-500 p-2 rounded-full transition-colors"
                    aria-label="Descartar"
                >
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default InstallBanner;
