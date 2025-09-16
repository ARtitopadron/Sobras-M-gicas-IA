
import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { AppStep, Recipe, Filters } from './types';
import { DIETARY_RESTRICTIONS, MEAL_TYPES, COOKING_TIMES } from './constants';
import { identifyIngredientsFromImage, generateRecipesFromIngredients } from './services/geminiService';
import { UploadIcon, BackIcon, TrashIcon, PlusIcon, CameraIcon, BookmarkIcon } from './components/icons';
import RecipeCard from './components/RecipeCard';
import CameraView from './components/CameraView';
import InstallBanner from './components/InstallBanner';

// Interfaz para el evento BeforeInstallPromptEvent para mayor seguridad de tipos
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}


const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.Welcome);
    const [showCamera, setShowCamera] = useState<boolean>(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [favorites, setFavorites] = useState<Recipe[]>([]);
    const [filters, setFilters] = useState<Filters>({
        tipoComida: 'Cualquiera',
        restricciones: [],
        tiempo: 'Cualquiera',
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [newIngredient, setNewIngredient] = useState('');
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);


    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load favorites from localStorage on initial load
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('sobrasMagicas-favorites');
            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
            }
        } catch (err) {
            console.error("Could not load favorites from localStorage", err);
        }
    }, []);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('sobrasMagicas-favorites', JSON.stringify(favorites));
        } catch (err)            {
            console.error("Could not save favorites to localStorage", err);
        }
    }, [favorites]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPromptEvent(event as BeforeInstallPromptEvent);
            setShowInstallBanner(true); // Vuelve a mostrar el banner si el evento se dispara de nuevo
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPromptEvent) {
            return;
        }
        setShowInstallBanner(false); // Ocultar nuestro banner personalizado
        installPromptEvent.prompt(); // Mostrar el diálogo de instalación del navegador
        installPromptEvent.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setInstallPromptEvent(null); // El evento ya no se puede usar
        });
    };

    const handleDismissInstallBanner = () => {
        setShowInstallBanner(false);
    };

    const processImageFile = async (file: File) => {
        if (file) {
            setError(null);
            setIsLoading(true);
            setStep(AppStep.Generating);
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));

            try {
                const identified = await identifyIngredientsFromImage(file);
                if (identified.length === 0) {
                   setError("No se reconocieron ingredientes. Prueba con una foto más clara o añádelos manually.");
                   setIngredients([]);
                } else {
                   setIngredients(identified);
                }
                setStep(AppStep.ConfirmIngredients);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
                setStep(AppStep.Welcome);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleRequestCameraPermission = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment'
                }
            });
            setCameraStream(stream);
            setShowCamera(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("No se pudo acceder a la cámara. Asegúrate de haber dado permiso y que tu navegador sea compatible.");
        }
    };

    const handleCaptureAndProcess = (file: File) => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setShowCamera(false);
        processImageFile(file);
    };

    const handleCloseCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setShowCamera(false);
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };
    
    const handleFilterChange = <T extends keyof Filters,>(filterType: T, value: Filters[T]) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const toggleRestriction = (restriction: string) => {
        handleFilterChange('restricciones', filters.restricciones.includes(restriction)
            ? filters.restricciones.filter(r => r !== restriction)
            : [...filters.restricciones, restriction]);
    };

    const handleGenerateRecipes = async () => {
        if (ingredients.length === 0) {
            setError("Añade al menos un ingrediente para generar recetas.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setStep(AppStep.Generating);
        try {
            const generatedRecipes = await generateRecipesFromIngredients(ingredients, filters);
            setRecipes(generatedRecipes);
            setStep(AppStep.Results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
            setStep(AppStep.ConfirmIngredients);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddIngredient = () => {
        if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
            setIngredients([...ingredients, newIngredient.trim()]);
            setNewIngredient('');
        }
    };

    const handleRemoveIngredient = (ingredientToRemove: string) => {
        setIngredients(ingredients.filter(ing => ing !== ingredientToRemove));
    };

    const resetApp = () => {
        setStep(AppStep.Welcome);
        setImageFile(null);
        setImageUrl('');
        setIngredients([]);
        setRecipes([]);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const backToConfirm = () => {
        setStep(AppStep.ConfirmIngredients);
        setRecipes([]);
        setError(null);
    }

    const isFavorite = (recipeId: string): boolean => {
        return favorites.some(fav => fav.id === recipeId);
    };

    const toggleFavorite = (recipe: Recipe) => {
        setFavorites(prev => {
            if (isFavorite(recipe.id)) {
                return prev.filter(fav => fav.id !== recipe.id);
            } else {
                return [...prev, recipe];
            }
        });
    };

    const goToFavorites = () => {
        setStep(AppStep.Favorites);
    };

    const renderHeader = () => (
      <header className="py-6 px-4 sm:px-6 lg:px-8 bg-white shadow-md w-full sticky top-0 z-10">
          <div className="flex items-center justify-center gap-4 max-w-7xl mx-auto">
              <div className="flex items-center cursor-pointer" onClick={resetApp} role="button" aria-label="Ir a la página de inicio">
                  <h1 className="text-3xl font-bold text-gray-800 font-display">Sobras Mágicas IA</h1>
              </div>
              <button onClick={goToFavorites} className="relative p-2 text-indigo-600 active:text-indigo-800 transition-colors" title="Ver favoritos" aria-label="Ver recetas favoritas">
                    <BookmarkIcon className="w-7 h-7 icon-shadow"/>
                    {favorites.length > 0 && (
                        <span className="absolute top-0 right-0 block h-5 w-5 text-center leading-5 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white">
                            {favorites.length}
                        </span>
                    )}
              </button>
          </div>
      </header>
    );

    const renderWelcomeScreen = () => (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 sm:p-8 fade-in">
            <div className="max-w-3xl bg-white p-8 rounded-2xl shadow-xl">
                <h2 className="text-4xl sm:text-5xl font-bold font-display text-gray-800 mb-4 text-shadow">Transforma tus sobras en obras maestras</h2>
                <p className="max-w-2xl mx-auto text-lg text-gray-700 mb-12">¿No sabes qué cocinar? Sube una foto de los ingredientes que tienes, o usa tu cámara, y deja que la magia de la IA cree deliciosas recetas para ti.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex sm:w-auto items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg active:bg-indigo-700 transition-transform duration-200 active:scale-95">
                        <UploadIcon className="w-6 h-6 icon-shadow" />
                        Subir foto 
                    </button>
                     <button onClick={handleRequestCameraPermission} className="flex sm:w-auto items-center justify-center gap-3 border-2 border-cyan-500 text-cyan-500 font-bold py-[14px] px-8 rounded-xl shadow-lg active:bg-cyan-50 transition-transform duration-200 active:scale-95 bg-white">
                        <CameraIcon className="w-6 h-6 icon-shadow" />
                        Tomar foto
                    </button>
                </div>
                {error && <p className="text-red-500 mt-6 font-semibold">{error}</p>}
            </div>
        </div>
    );
    
    const renderConfirmIngredientsScreen = () => (
        <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-2xl font-bold font-display mb-4 text-gray-800">Tu Foto</h3>
                    <img src={imageUrl} alt="Ingredientes" className="rounded-2xl shadow-lg w-full object-cover aspect-square"/>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h3 className="text-2xl font-bold font-display text-gray-800 mb-4">Ingredientes Identificados</h3>
                    <p className="text-sm text-gray-600 mb-4">Hemos encontrado esto. ¡Añade o quita ingredientes para que la receta sea perfecta!</p>
                     <div className="bg-gray-50 p-4 rounded-xl shadow-sm mb-4">
                        <div className="flex flex-wrap gap-2">
                           {ingredients.map(ing => (
                                <div key={ing} className="flex items-center bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 text-sm font-medium">
                                    <span>{ing}</span>
                                    <button onClick={() => handleRemoveIngredient(ing)} className="ml-2 text-indigo-500 active:text-indigo-800">
                                        <TrashIcon className="w-4 h-4 icon-shadow" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex mt-4 gap-2">
                            <input
                                type="text"
                                value={newIngredient}
                                onChange={(e) => setNewIngredient(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
                                placeholder="Añadir ingrediente..."
                                className="flex-grow p-2 border bg-white border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button onClick={handleAddIngredient} className="bg-indigo-600 text-white p-2 rounded-lg active:bg-indigo-700 transition-colors">
                                <PlusIcon className="w-6 h-6 icon-shadow" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-6 mt-6">
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">Tipo de comida</h4>
                            <select value={filters.tipoComida} onChange={e => handleFilterChange('tipoComida', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                                {MEAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">Restricciones dietéticas</h4>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_RESTRICTIONS.map(r => (
                                    <button key={r.id} onClick={() => toggleRestriction(r.name)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.restricciones.includes(r.name) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 active:bg-gray-300'}`}>
                                        {r.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-gray-700">Tiempo de preparación</h4>
                             <select value={filters.tiempo} onChange={e => handleFilterChange('tiempo', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white">
                                {COOKING_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={handleGenerateRecipes} className="mt-8 w-full bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg active:bg-indigo-700 transition-transform duration-200 active:scale-95">
                        ¡Generar Recetas!
                    </button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </div>
            </div>
        </div>
    );

    const renderGeneratingScreen = () => (
        <div className="flex flex-col items-center justify-center p-8 flex-grow fade-in">
             <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-24 w-24 mb-6 animate-spin mx-auto" style={{borderTopColor: '#4f46e5'}}></div>
                <h2 className="text-3xl font-bold font-display text-gray-800 mb-2">Buscando inspiración...</h2>
                <p className="text-gray-600">Nuestra IA está mezclando tus ingredientes para crear algo mágico.</p>
            </div>
        </div>
    );

    const renderResultsScreen = () => (
        <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 fade-in">
            <div className="mb-8">
                {/* Mobile Header: Button on top, Title centered below. */}
                <div className="sm:hidden">
                    <button onClick={backToConfirm} className="flex items-center gap-2 text-indigo-600 active:text-indigo-800 font-semibold transition-colors mb-4 bg-white p-2 rounded-lg">
                        <BackIcon className="w-5 h-5 icon-shadow"/>
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-4xl font-bold font-display text-gray-800 text-center text-shadow bg-white py-2 rounded-lg">¡Aquí tienes tus recetas!</h2>
                </div>

                {/* Desktop Header: Title centered, Back button positioned absolutely on the left. */}
                <div className="hidden sm:flex relative items-center justify-center">
                     <button onClick={backToConfirm} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-indigo-600 active:text-indigo-800 font-semibold transition-colors bg-white p-3 rounded-lg">
                        <BackIcon className="w-5 h-5 icon-shadow"/>
                        <span>Atrás</span>
                     </button>
                    <h2 className="text-4xl font-bold font-display text-gray-800 text-center text-shadow bg-white py-3 px-8 rounded-lg">¡Aquí tienes tus recetas!</h2>
                </div>
            </div>
            {error && <p className="text-red-500 mb-4 text-center font-semibold bg-white p-3 rounded-lg">{error}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {recipes.map((recipe) => (
                    <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        isFavorite={isFavorite(recipe.id)}
                        onToggleFavorite={() => toggleFavorite(recipe)}
                    />
                ))}
            </div>
        </div>
    );

    const renderFavoritesScreen = () => (
        <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 fade-in">
             <div className="mb-8 text-center bg-white py-3 px-8 rounded-lg">
                <h2 className="text-4xl font-bold font-display text-gray-800 text-shadow">Tus Recetas Favoritas</h2>
             </div>
             {favorites.length === 0 ? (
                <div className="text-center py-16 bg-white p-8 rounded-2xl shadow-lg">
                    <BookmarkIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-700">Tu lista de favoritos está vacía</h3>
                    <p className="text-gray-500 mt-2">Usa el icono del corazón ❤️ en una receta para guardarla aquí.</p>
                    <button onClick={resetApp} className="mt-6 bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg active:bg-indigo-700 transition-transform duration-200 active:scale-95">
                        Buscar recetas
                    </button>
                </div>
             ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {favorites.map((recipe) => (
                        <RecipeCard 
                            key={recipe.id} 
                            recipe={recipe}
                            isFavorite={isFavorite(recipe.id)}
                            onToggleFavorite={() => toggleFavorite(recipe)}
                        />
                    ))}
                </div>
             )}
        </div>
    );

    const renderContent = () => {
        if (isLoading || step === AppStep.Generating) {
            return renderGeneratingScreen();
        }
        switch (step) {
            case AppStep.Welcome:
                return renderWelcomeScreen();
            case AppStep.ConfirmIngredients:
                return renderConfirmIngredientsScreen();
            case AppStep.Results:
                return renderResultsScreen();
            case AppStep.Favorites:
                return renderFavoritesScreen();
            default:
                return renderWelcomeScreen();
        }
    };
    
    const renderFooter = () => (
        <footer className="text-center py-6 mt-12 text-gray-800 text-sm w-full bg-gray-100">
             <div className="font-semibold">
                <p>
                    Desarrollado con{' '}
                    <a 
                        href="https://www.linkedin.com/in/jorgealvaropadron/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 active:text-indigo-800 transition-colors"
                    >
                        Jorge Tito Padrón
                    </a> 
                    {' y '}
                    <a 
                        href="https://gemini.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 active:text-indigo-800 transition-colors"
                    >
                        Google Gemini
                    </a>.
                </p>
            </div>
        </footer>
    );

    return (
        <div className="min-h-screen flex flex-col items-center">
            {renderHeader()}
            <main className="w-full flex-grow flex flex-col">
                {renderContent()}
            </main>
            {renderFooter()}
            {showCamera && cameraStream && <CameraView stream={cameraStream} onCapture={handleCaptureAndProcess} onBack={handleCloseCamera} />}
            {installPromptEvent && showInstallBanner && (
                <InstallBanner onInstall={handleInstallClick} onDismiss={handleDismissInstallBanner} />
            )}
        </div>
    );
};

export default App;
