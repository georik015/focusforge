import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface City {
  id: string;
  name: string;
  region?: string;
}

export const CITIES: City[] = [
  { id: 'msc', name: 'Москва', region: 'Московская область' },
  { id: 'spb', name: 'Санкт-Петербург', region: 'Ленинградская область' },
  { id: 'nsk', name: 'Новосибирск', region: 'Новосибирская область' },
  { id: 'ekb', name: 'Екатеринбург', region: 'Свердловская область' },
  { id: 'kzn', name: 'Казань', region: 'Республика Татарстан' },
  { id: 'nny', name: 'Нижний Новгород', region: 'Нижегородская область' },
  { id: 'chb', name: 'Челябинск', region: 'Челябинская область' },
  { id: 'smr', name: 'Самара', region: 'Самарская область' },
  { id: 'rnd', name: 'Ростов-на-Дону', region: 'Ростовская область' },
  { id: 'ufa', name: 'Уфа', region: 'Республика Башкортостан' },
  { id: 'krs', name: 'Краснодар', region: 'Краснодарский край' },
  { id: 'prm', name: 'Пермь', region: 'Пермский край' },
  { id: 'vgd', name: 'Волгоград', region: 'Волгоградская область' },
  { id: 'vrn', name: 'Воронеж', region: 'Воронежская область' },
];

interface CityStore {
  city: City;
  showModal: boolean;
  setCity: (city: City) => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useCityStore = create<CityStore>()(
  persist(
    (set) => ({
      city: CITIES[0],
      showModal: false,
      setCity: (city) => set({ city, showModal: false }),
      openModal: () => set({ showModal: true }),
      closeModal: () => set({ showModal: false }),
    }),
    { name: 'vanguard-city' }
  )
);
