export type IPriceChartData = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
};

export type IPrediction = {
  address: `0x${string}`;
  price: number;
  predictAt: number;
};

export type IPrice = [number, number];
export interface IPriceCandle {
  /** timestamp in milliseconds */
  x: number;
  /** open price */
  o: number;
  /** high price */
  h: number;
  /** low price */
  l: number;
  /** close price */
  c: number;
}
