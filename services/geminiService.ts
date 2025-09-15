
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Recipe, Filters } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to convert file to base64
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const identifyIngredientsFromImage = async (imageFile: File): Promise<string[]> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = `
    Analiza esta imagen de una nevera, despensa o ingredientes sueltos. 
    Tu única tarea es listar los ingredientes comestibles que veas.
    - Responde SÓLO con una lista de ingredientes en español, separados por comas.
    - No incluyas cantidades, descripciones, categorías ni frases introductorias.
    - Ignora objetos no comestibles, recipientes, marcas y texto.
    - Sé preciso. Si no estás seguro de un ingrediente, es mejor no incluirlo.
    Ejemplo de respuesta correcta: 'tomates, cebolla, pimiento verde, huevos, leche, pollo cocido'.
    Ejemplo de respuesta incorrecta: 'He encontrado los siguientes ingredientes: Tomates, una cebolla...'.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
    });
    
    const text = response.text.trim();
    if (!text) return [];

    return text.split(',').map(ingredient => ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1)).filter(Boolean);
  } catch (error) {
    console.error("Error identifying ingredients:", error);
    throw new Error("No se pudieron identificar los ingredientes. Inténtalo con otra imagen.");
  }
};

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      description: "Array de 3 objetos de receta.",
      items: {
        type: Type.OBJECT,
        properties: {
          nombreReceta: { type: Type.STRING, description: "Nombre creativo y apetitoso para la receta." },
          descripcion: { type: Type.STRING, description: "Descripción corta (1-2 frases) que haga la receta atractiva." },
          ingredientesUsados: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de ingredientes de la lista proporcionada que se usan en esta receta." },
          ingredientesFaltantes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de ingredientes esenciales para la receta que NO estaban en la lista proporcionada." },
          pasos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Instrucciones de preparación, claras y numeradas." },
          dificultad: { type: Type.STRING, description: "Nivel de dificultad: 'Fácil', 'Media', o 'Difícil'." },
          tiempoPreparacion: { type: Type.STRING, description: "Tiempo total estimado de preparación y cocción (ej: '25 min')." },
          etiquetasDieteticas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Etiquetas dietéticas relevantes (ej: 'Vegano', 'Sin Gluten')." },
          propiedadesIngredientes: {
            type: Type.ARRAY,
            description: "Lista de propiedades o datos curiosos de cada ingrediente principal utilizado en la receta.",
            items: {
                type: Type.OBJECT,
                properties: {
                    ingrediente: { type: Type.STRING, description: "Nombre del ingrediente que coincide con uno de los 'ingredientesUsados'." },
                    propiedad: { type: Type.STRING, description: "Descripción breve y útil (dato nutricional, curioso o culinario) del ingrediente." }
                },
                required: ["ingrediente", "propiedad"]
            }
          }
        },
        required: ["nombreReceta", "descripcion", "ingredientesUsados", "ingredientesFaltantes", "pasos", "dificultad", "tiempoPreparacion", "etiquetasDieteticas", "propiedadesIngredientes"]
      }
    }
  }
};

export const generateRecipesFromIngredients = async (ingredients: string[], filters: Filters): Promise<Recipe[]> => {
  const prompt = `
    Eres un chef experto en crear recetas deliciosas y creativas con sobras.
    Ingredientes disponibles: ${ingredients.join(', ')}.

    Preferencias del usuario:
    - Tipo de comida: ${filters.tipoComida}. Si es 'Cualquiera', siéntete libre de proponer lo que mejor encaje.
    - Restricciones dietéticas: ${filters.restricciones.length > 0 ? filters.restricciones.join(', ') : 'Ninguna'}.
    - Tiempo máximo de preparación: ${filters.tiempo}. Si es 'Cualquiera', no hay límite.

    Tu tarea es generar 3 recetas variadas y excelentes que usen principalmente los ingredientes disponibles.
    - Prioriza el uso de los ingredientes listados.
    - Solo añade ingredientes faltantes si son absolutamente esenciales (como aceite, sal, especias básicas o un componente clave).
    - Asegúrate de que las recetas se ajustan a TODAS las preferencias del usuario.
    - Para cada receta, incluye una sección 'propiedadesIngredientes'. Para cada ingrediente principal que uses de la lista, añade un dato curioso, propiedad nutricional o consejo culinario breve y útil.
    - Proporciona los resultados en formato JSON estructurado según el schema.
  `;
  
  try {
     const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        },
    });

    const jsonResponse = JSON.parse(response.text);
    const recipesWithIds = (jsonResponse.recipes as Omit<Recipe, 'id'>[]).map(recipe => ({
        ...recipe,
        id: `${recipe.nombreReceta.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 9)}`
    }));
    return recipesWithIds;
  } catch (error) {
    console.error("Error generating recipes:", error);
    throw new Error("No se pudieron generar las recetas. Intenta ajustar los ingredientes o filtros.");
  }
};