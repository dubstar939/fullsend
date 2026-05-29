export const GAME_CONFIG = {
  LANE_WIDTH: 4,
  LANE_COUNT: 4,
  ROAD_LENGTH: 1000,
  INITIAL_SPEED: 0.5,
  MAX_SPEED: 2.0,
  ACCELERATION: 0.005,
  BRAKE_FORCE: 0.01,
  TRAFFIC_DENSITY: 0.05,
  SPAWN_INTERVAL: 1500,
  CHECKPOINT_DISTANCE: 200,
};

export interface CarStats {
  speed: number;
  handling: number;
  acceleration: number;
  price: number;
  color: string;
  unlocked: boolean;
}

export const INITIAL_CARS: CarStats[] = [
  { speed: 0.5, handling: 0.1, acceleration: 0.005, price: 0, color: '#facc15', unlocked: true },
  { speed: 0.6, handling: 0.12, acceleration: 0.006, price: 500, color: '#ef4444', unlocked: false },
  { speed: 0.7, handling: 0.15, acceleration: 0.008, price: 2000, color: '#3b82f6', unlocked: false },
  { speed: 0.9, handling: 0.2, acceleration: 0.01, price: 10000, color: '#10b981', unlocked: false },
];
