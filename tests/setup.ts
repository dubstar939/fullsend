import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock WebGL/WebGPU contexts for testing
const mockCanvas = {
  getContext: () => null,
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock canvas element creation
const originalCreateElement = document.createElement.bind(document);
document.createElement = ((tagName: string) => {
  const element = originalCreateElement(tagName);
  if (tagName.toLowerCase() === 'canvas') {
    Object.assign(element, mockCanvas);
  }
  return element;
}) as typeof document.createElement;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
