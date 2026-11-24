import { describe, it, expect } from 'vitest';

describe('SmartBiz AI Analytics & Calculations', () => {
  it('calculates gross margin percentage correctly', () => {
    const revenue = 10000;
    const cogs = 6500;
    const grossProfit = revenue - cogs;
    const marginPct = (grossProfit / revenue) * 100;

    expect(grossProfit).toBe(3500);
    expect(marginPct).toBe(35);
  });

  it('calculates net operating profit after expenses', () => {
    const grossProfit = 3500;
    const expenses = 1200;
    const netProfit = grossProfit - expenses;

    expect(netProfit).toBe(2300);
  });

  it('handles zero revenue safely without division by zero', () => {
    const revenue = 0;
    const cogs = 0;
    const grossProfit = revenue - cogs;
    const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    expect(marginPct).toBe(0);
  });
});
