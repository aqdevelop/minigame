export interface RacingCar {
  id: string;
  name: string;
  nameKo: string;
  speed: number;        // Base speed multiplier (1.0 = normal)
  handling: number;     // Lane change speed
  color: string;
  price: number;        // Cost in coins
}

export const RACING_CARS: RacingCar[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameKo: '기본차',
    speed: 1.0,
    handling: 1.0,
    color: '#00aaff',
    price: 0,
  },
  {
    id: 'sport',
    name: 'Sport',
    nameKo: '스포츠카',
    speed: 1.2,
    handling: 1.1,
    color: '#ff4444',
    price: 500,
  },
  {
    id: 'muscle',
    name: 'Muscle',
    nameKo: '머슬카',
    speed: 1.4,
    handling: 1.0,
    color: '#ffaa00',
    price: 1500,
  },
  {
    id: 'turbo',
    name: 'Turbo',
    nameKo: '터보',
    speed: 1.6,
    handling: 1.2,
    color: '#00ff00',
    price: 3000,
  },
  {
    id: 'super',
    name: 'Super',
    nameKo: '슈퍼카',
    speed: 1.8,
    handling: 1.3,
    color: '#ff00ff',
    price: 6000,
  },
  {
    id: 'hyper',
    name: 'Hyper',
    nameKo: '하이퍼카',
    speed: 2.0,
    handling: 1.4,
    color: '#ffff00',
    price: 10000,
  },
  {
    id: 'legend',
    name: 'Legend',
    nameKo: '레전드',
    speed: 2.3,
    handling: 1.5,
    color: '#FFD700',
    price: 20000,
  },
];

export const COIN_PER_SCORE = 1; // 1 coin per 1 score
