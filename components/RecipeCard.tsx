
import React, { useRef } from 'react'; 
import { Recipe } from '../types';
import { TimeIcon, BarChartIcon, ShoppingCartIcon, VeganIcon, GlutenFreeIcon, SparklesIcon, PrintIcon, DownloadIcon, HeartIcon, ShareIcon } from './icons';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const getDietaryIcon = (tag: string) => {
    const lowerCaseTag = tag.toLowerCase();
    if (lowerCaseTag.includes('vegano')) return <VeganIcon className="w-5 h-5 text-green-500 icon-shadow" />;
    if (lowerCaseTag.includes('sin gluten')) return <GlutenFreeIcon className="w-5 h-5 text-orange-500 icon-shadow" />;
    return null;
};

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, isFavorite, onToggleFavorite }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handlePurchaseClick = () => {
        const query = recipe.ingredientesFaltantes.join(' ');
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=shop`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleSave = () => {
        const {
            nombreReceta,
            descripcion,
            tiempoPreparacion,
            dificultad,
            etiquetasDieteticas,
            ingredientesUsados,
            ingredientesFaltantes,
            pasos,
            propiedadesIngredientes
        } = recipe;

        const recipeContent = `
# ${nombreReceta}

## Descripción
${descripcion}

## Información General
- **Tiempo de Preparación:** ${tiempoPreparacion}
- **Dificultad:** ${dificultad}
- **Etiquetas Dietéticas:** ${etiquetasDieteticas.join(', ') || 'Ninguna'}

---

## Ingredientes que ya tienes
${ingredientesUsados.map(ing => `- ${ing}`).join('\n')}

${ingredientesFaltantes.length > 0 ? `
## Ingredientes que necesitarás
${ingredientesFaltantes.map(ing => `- ${ing}`).join('\n')}
` : ''}

---

## Pasos de preparación
${pasos.map((step, index) => `${index + 1}. ${step}`).join('\n')}

---

## Sabías que...
${propiedadesIngredientes.map(prop => `- **${prop.ingrediente}:** ${prop.propiedad}`).join('\n')}
        `;

        const blob = new Blob([recipeContent.trim()], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nombreReceta.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const cardElement = cardRef.current;
        if (!cardElement) return;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const printDocument = iframe.contentWindow!.document;

        printDocument.open();
        printDocument.write('<!DOCTYPE html><html lang="es"><head><title>Imprimir Receta</title></head><body></body></html>');
        printDocument.close();

        printDocument.addEventListener("DOMContentLoaded", () => {
            document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
                printDocument.head.appendChild(node.cloneNode(true));
            });

            const printStyles = printDocument.createElement('style');
            printStyles.textContent = `
                body {
                    margin: 1.5rem;
                    background-color: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                .no-print { display: none !important; }
                div[class*="shadow-"] { 
                    box-shadow: none !important; 
                    border: 1px solid #e5e7eb;
                }
            `;
            printDocument.head.appendChild(printStyles);

            const cardClone = cardElement.cloneNode(true) as HTMLElement;
            printDocument.body.appendChild(cardClone);

            printDocument.fonts.ready.then(() => {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
            }).catch(() => {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
            });

            iframe.contentWindow!.addEventListener('afterprint', () => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            });
        });
    };
    
    const handleShare = async () => {
        const shareData = {
            title: recipe.nombreReceta,
            text: `Echa un vistazo a esta receta de Sobras Mágicas IA: ${recipe.nombreReceta}\n\n${recipe.descripcion}`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.log('Web Share API cancelado por el usuario.');
            }
        } else {
            const fallbackText = `Receta: ${recipe.nombreReceta}\n\nDescripción: ${recipe.descripcion}\n\nEncuentra más en Sobras Mágicas IA!`;
            try {
                await navigator.clipboard.writeText(fallbackText);
                alert('¡Receta copiada al portapapeles!');
            } catch (err) {
                console.error('Fallo al copiar texto: ', err);
                alert('Error: No se pudo copiar la receta.');
            }
        }
    };

    return (
        <div ref={cardRef} className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
            <div className="p-6 flex-grow relative">
                <button 
                    onClick={onToggleFavorite}
                    title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                    aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                    className="absolute top-4 right-4 p-2 text-red-500 bg-white/70 backdrop-blur-sm rounded-full shadow-md transition-transform duration-200 active:scale-90"
                >
                    <HeartIcon className="w-6 h-6 icon-shadow" filled={isFavorite} />
                </button>

                <h3 className="font-display text-2xl font-bold text-gray-800 mb-2 pr-8">{recipe.nombreReceta}</h3>
                <p className="text-gray-600 mb-4 text-sm">{recipe.descripcion}</p>

                <div className="flex flex-wrap gap-4 text-sm mb-6 text-gray-700">
                    <div className="flex items-center gap-2">
                        <TimeIcon className="w-5 h-5 text-indigo-500 icon-shadow" />
                        <span>{recipe.tiempoPreparacion}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChartIcon className="w-5 h-5 text-indigo-500 icon-shadow" />
                        <span>{recipe.dificultad}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Ingredientes que ya tienes:</h4>
                        <div className="flex flex-wrap gap-2">
                            {recipe.ingredientesUsados.map((ing, index) => (
                                <span key={index} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">{ing}</span>
                            ))}
                        </div>
                    </div>

                    {recipe.ingredientesFaltantes.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Necesitarás:</h4>
                            <div className="flex flex-wrap gap-2">
                                {recipe.ingredientesFaltantes.map((ing, index) => (
                                    <span key={index} className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">{ing}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 mb-2">Preparación:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                        {recipe.pasos.map((step, index) => <li key={index}>{step}</li>)}
                    </ol>
                </div>
                
                {recipe.propiedadesIngredientes && recipe.propiedadesIngredientes.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="font-display text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <SparklesIcon className="w-6 h-6 text-indigo-500 icon-shadow" />
                            Sabías que...
                        </h4>
                        <ul className="space-y-2 text-gray-600 text-sm list-disc list-inside">
                            {recipe.propiedadesIngredientes.map((prop, index) => (
                                <li key={index}>
                                    <span className="font-semibold">{prop.ingrediente}:</span> {prop.propiedad}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <div className="p-6 bg-gray-50 flex justify-between items-center no-print">
                <div className="flex items-center gap-2">
                    {recipe.etiquetasDieteticas.map((tag, i) => {
                         const Icon = getDietaryIcon(tag);
                         return Icon ? <div key={i} title={tag}>{Icon}</div> : null;
                    })}
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleShare}
                        title="Compartir Receta"
                        aria-label="Compartir Receta"
                        className="p-3 text-gray-600 bg-gray-100 rounded-full shadow-md transition-transform duration-200 active:scale-95">
                        <ShareIcon className="w-7 h-7 icon-shadow" />
                    </button>
                    <button 
                        onClick={handlePrint}
                        title="Imprimir Receta"
                        aria-label="Imprimir Receta"
                        className="p-3 text-gray-600 bg-gray-100 rounded-full shadow-md transition-transform duration-200 active:scale-95">
                        <PrintIcon className="w-7 h-7 icon-shadow" />
                    </button>
                    <button 
                        onClick={handleSave}
                        title="Guardar como .txt"
                        aria-label="Guardar Receta"
                        className="p-3 text-gray-600 bg-gray-100 rounded-full shadow-md transition-transform duration-200 active:scale-95">
                        <DownloadIcon className="w-7 h-7 icon-shadow" />
                    </button>
                    {recipe.ingredientesFaltantes.length > 0 && (
                        <button 
                            onClick={handlePurchaseClick}
                            className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg active:bg-indigo-700 transition-colors duration-300 text-sm">
                            <ShoppingCartIcon className="w-5 h-5 icon-shadow" />
                            Comprar faltantes
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;
