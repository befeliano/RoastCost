export type Clock = () => Date;
export const systemClock: Clock = () => new Date();
export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
export { todayTr } from '@roastcost/shared';
