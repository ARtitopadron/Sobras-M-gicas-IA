
export interface Recipe {
  id: string;
  nombreReceta: string;
  descripcion: string;
  ingredientesUsados: string[];
  ingredientesFaltantes: string[];
  pasos: string[];
  dificultad: 'Fácil' | 'Media' | 'Difícil';
  tiempoPreparacion: string;
  etiquetasDieteticas: string[];
  propiedadesIngredientes: {
    ingrediente: string;
    propiedad: string;
  }[];
}

export interface Filters {
  tipoComida: string;
  restricciones: string[];
  tiempo: string;
}

export enum AppStep {
  Welcome,
  ConfirmIngredients,
  Generating,
  Results,
  Favorites,
}