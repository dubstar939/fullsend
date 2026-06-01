/**
 * Object Pool System for Performance Optimization
 * Manages reusable objects to minimize garbage collection
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    initialSize: number = 10,
    maxSize: number = 100,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.active.size + this.pool.length < this.maxSize) {
      obj = this.createFn();
    } else {
      // Reuse oldest inactive object if at capacity
      throw new Error('Object pool exhausted');
    }

    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.active.has(obj)) {
      this.active.delete(obj);

      if (this.resetFn) {
        this.resetFn(obj);
      }

      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    }
  }

  releaseAll(): void {
    this.active.forEach((obj) => this.release(obj));
  }

  getActiveCount(): number {
    return this.active.size;
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  getTotalObjects(): number {
    return this.active.size + this.pool.length;
  }
}

/**
 * Traffic Car Pool - Specialized for traffic vehicles
 */
export interface PooledTrafficCar {
  id: string;
  mesh: any; // THREE.Group
  speed: number;
  lane: number;
  zPosition: number;
  vehicleClass: string;
  isActive: boolean;
}

export function createTrafficCarPool(createMesh: (vehicleClass: string) => any) {
  const pool = new ObjectPool<PooledTrafficCar>(
    () => ({
      id: '',
      mesh: null,
      speed: 0,
      lane: 0,
      zPosition: 0,
      vehicleClass: 'SEDAN',
      isActive: false,
    }),
    20,
    50,
    (car) => {
      car.isActive = false;
      car.id = '';
      car.speed = 0;
      car.lane = 0;
      car.zPosition = 0;
    }
  );

  return {
    acquire: (vehicleClass: string, lane: number, zPosition: number, speed: number): PooledTrafficCar => {
      const car = pool.acquire();
      car.vehicleClass = vehicleClass;
      car.lane = lane;
      car.zPosition = zPosition;
      car.speed = speed;
      car.isActive = true;
      car.mesh = createMesh(vehicleClass);
      car.id = `traffic_${Date.now()}_${Math.random()}`;
      return car;
    },
    release: (car: PooledTrafficCar) => {
      if (car.mesh) {
        pool.release(car);
      }
    },
    getPool: () => pool,
  };
}
