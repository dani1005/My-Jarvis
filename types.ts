export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface HeadTransform {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface HandGesture {
  isPinching: boolean;
  pinchDistance: number;
  position: Point;
  isTwoHands: boolean;
  separation: number;
}

export enum SystemStatus {
  INITIALIZING = 'INITIALIZING',
  SCANNING = 'SCANNING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export interface Metrics {
  cpu: number;
  power: number;
  network: number;
}
