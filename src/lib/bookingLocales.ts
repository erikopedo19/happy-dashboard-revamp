import {
  bg,
  de,
  el,
  enUS,
  es,
  fr,
  it,
  nl,
  pl,
  ro,
  sq,
  type Locale,
} from "date-fns/locale";

export const BOOKING_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "el", label: "Ελληνικά" },
  { value: "es", label: "Español" },
  { value: "nl", label: "Nederlands" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "bg", label: "Български" },
  { value: "ro", label: "Română" },
  { value: "sq", label: "Shqip" },
] as const;

export type BookingLocale = (typeof BOOKING_LANGUAGES)[number]["value"];

const dateLocales: Record<BookingLocale, Locale> = {
  en: enUS,
  el,
  es,
  nl,
  pl,
  de,
  fr,
  it,
  bg,
  ro,
  sq,
};

export const isBookingLocale = (value: string | null | undefined): value is BookingLocale =>
  BOOKING_LANGUAGES.some((language) => language.value === value);

export const getBookingDateLocale = (locale: BookingLocale): Locale => dateLocales[locale];
