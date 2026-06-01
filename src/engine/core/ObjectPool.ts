/**
 * Object Pool - Reusable object management for zero GC pressure
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
