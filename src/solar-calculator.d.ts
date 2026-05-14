declare module 'solar-calculator' {
  export function century(date: Date): number;
  export function declination(t: number): number;
  export function equationOfTime(t: number): number;
  export function apparentLongitude(t: number): number;
  export function meanAnomaly(t: number): number;
  export function meanLongitude(t: number): number;
  export function obliquityOfEcliptic(t: number): number;
  export function orbitEccentricity(t: number): number;
  export function equationOfCenter(t: number): number;
  export function trueLongitude(t: number): number;
  export function noon(date: Date, longitude: number): number;
  export function rise(date: Date, latitude: number, longitude: number): number;
  export function set(date: Date, latitude: number, longitude: number): number;
  export function riseHourAngle(t: number, latitude: number): number;
  export function hours(t: number): number;
}
