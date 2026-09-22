import type { Candle } from '@/types';

const BASE_PRICE = 65000;
const VOLATILITY = 0.0025;
const DRIFT = 0.0001;

export class PriceSimulator {
  private candles: Candle[] = [];
  private currentPrice: number = BASE_PRICE;
  private lastTime: number;

  constructor(count = 150) {
    this.lastTime = Math.floor(Date.now() / 1000);
    this.currentPrice = BASE_PRICE;
    for (let i = count; i > 0; i--) {
      const time = this.lastTime - i * 60;
      this.candles.push(this.generateCandle(time, this.currentPrice));
    }
    this.currentPrice = this.candles[this.candles.length - 1].close;
  }

  private generateCandle(time: number, prevClose: number): Candle {
    let price = prevClose;
    const open = price;
    let high = open;
    let low = open;
    const ticks = 12;
    let volume = 0;
    for (let t = 0; t < ticks; t++) {
      const shock = (Math.random() - 0.5) * 2 * VOLATILITY * price;
      const trend = DRIFT * price;
      price = price + shock + trend;
      high = Math.max(high, price);
      low = Math.min(low, price);
      volume += Math.random() * 50 + 10;
    }
    return { time, open, high, low, close: price, volume };
  }

  tick(): Candle[] {
    const time = Math.floor(Date.now() / 1000);
    if (time > this.lastTime) {
      this.lastTime = time;
      const candle = this.generateCandle(time, this.currentPrice);
      this.candles.push(candle);
      if (this.candles.length > 200) this.candles.shift();
      this.currentPrice = candle.close;
    } else {
      // Update the current (latest) candle with intra-minute movement
      const last = this.candles[this.candles.length - 1];
      const shock = (Math.random() - 0.5) * 2 * VOLATILITY * this.currentPrice;
      this.currentPrice = this.currentPrice + shock;
      last.close = this.currentPrice;
      last.high = Math.max(last.high, this.currentPrice);
      last.low = Math.min(last.low, this.currentPrice);
      last.volume += Math.random() * 5;
    }
    return [...this.candles];
  }

  getCandles(): Candle[] {
    return [...this.candles];
  }

  getPrice(): number {
    return this.currentPrice;
  }
}
