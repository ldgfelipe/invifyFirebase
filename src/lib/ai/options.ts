// ============================================================================
// OPCIONES DEL WIZARD IA - Definiciones estables (ids) y metadatos.
// Los textos visibles viven en el diccionario i18n (clave por id) para
// permitir Español/Inglés sin duplicar lógica.
// ============================================================================
import type { TemplateCategory } from "../types";

export interface CategoryOption {
  id: string; // id del option del wizard
  category: TemplateCategory; // categoría final guardada en DB
  key: string; // clave de traducción en t.aiwiz.categories
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "boda", category: "boda", key: "boda" },
  { id: "cumpleanos", category: "cumpleanos", key: "cumpleanos" },
  { id: "xv", category: "cumpleanos", key: "xv" },
  { id: "babyshower", category: "babyshower", key: "babyshower" },
  { id: "bautizo", category: "bautizo", key: "bautizo" },
  { id: "corporativo", category: "corporativo", key: "corporativo" },
];

export interface AtmosphereOption {
  id: string;
  nameKey: string; // t.aiwiz.atmosphere[<nameKey>]
  descKey: string; // t.aiwiz.atmosphere[<descKey>]
  palette: {
    background: string;
    primary: string;
    textColor: string;
    fontFamily: "serif" | "sans";
  };
}

export const ATMOSPHERE_OPTIONS: AtmosphereOption[] = [
  {
    id: "elegant",
    nameKey: "elegant",
    descKey: "elegantDesc",
    palette: { background: "#101014", primary: "#C5A059", textColor: "#F5F0E6", fontFamily: "serif" },
  },
  {
    id: "natural",
    nameKey: "natural",
    descKey: "naturalDesc",
    palette: { background: "#F4FAF2", primary: "#4A6B5A", textColor: "#20301F", fontFamily: "serif" },
  },
  {
    id: "minimal",
    nameKey: "minimal",
    descKey: "minimalDesc",
    palette: { background: "#FFFFFF", primary: "#111111", textColor: "#111111", fontFamily: "sans" },
  },
  {
    id: "playful",
    nameKey: "playful",
    descKey: "playfulDesc",
    palette: { background: "#FFF4EC", primary: "#E8633C", textColor: "#3A251D", fontFamily: "sans" },
  },
];

export interface FeatureOption {
  id: string;
  key: string; // t.aiwiz.features[<key>]
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  { id: "location", key: "location" },
  { id: "giftTable", key: "giftTable" },
  { id: "dresscode", key: "dresscode" },
  { id: "itinerary", key: "itinerary" },
  { id: "rsvp", key: "rsvp" },
];

export interface ImageStyleOption {
  id: string;
  key: string; // t.aiwiz.imageStyles[<key>]
}

export const IMAGE_STYLE_OPTIONS: ImageStyleOption[] = [
  { id: "flowers", key: "flowers" },
  { id: "party", key: "party" },
  { id: "abstract", key: "abstract" },
];

export interface WizardAnswers {
  category: string; // id de CATEGORY_OPTIONS
  names: string;
  date: string; // YYYY-MM-DD
  atmosphere: string; // id de ATMOSPHERE_OPTIONS
  features: string[]; // ids de FEATURE_OPTIONS
  imageStyle: string; // id de IMAGE_STYLE_OPTIONS
}

export const DEFAULT_ANSWERS: WizardAnswers = {
  category: "boda",
  names: "",
  date: "",
  atmosphere: "natural",
  features: ["rsvp"],
  imageStyle: "flowers",
};