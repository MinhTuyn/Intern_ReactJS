import {
  type CandlestickData,
  type LineData,
  type HistogramData,
} from "lightweight-charts";

// Định nghĩa kiểu dữ liệu cho dữ liệu các chỉ báo
export interface IndicatorData {
  rsi?: LineData[];
  macd?: {
    macd: LineData[];
    signal: LineData[];
    histogram: HistogramData[];
  };
  sma?: LineData[];
  ema?: LineData[];
}

// Hàm tính toán chỉ báo RSI
export const calculateRSI = (
  data: CandlestickData[],
  period: number = 14
): LineData[] => {
  if (data.length < period + 1) return [];

  const gains: number[] = [];
  const losses: number[] = [];

  // Tính toán thay đổi giá từng phiên
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Tính trung bình ban đầu
  let avgGain =
    gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  const rsiData: LineData[] = [];

  // Tính RSI cho từng điểm dữ liệu
  for (let i = period; i < data.length; i++) {
    if (avgLoss === 0) {
      rsiData.push({
        time: data[i].time,
        value: 100,
      });
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      rsiData.push({
        time: data[i].time,
        value: rsi,
      });
    }

    // Cập nhật trung bình cho lần lặp tiếp theo (theo công thức Wilder)
    if (i < data.length - 1) {
      const currentGain = gains[i];
      const currentLoss = losses[i];
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }
  }

  return rsiData;
};

// Hàm tính toán chỉ báo EMA
export const calculateEMA = (
  data: CandlestickData[],
  period: number
): LineData[] => {
  if (data.length < period) return [];

  const emaData: LineData[] = [];
  const multiplier = 2 / (period + 1);

  // Giá trị EMA đầu tiên là SMA của chu kỳ đầu
  let ema =
    data.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) /
    period;

  emaData.push({
    time: data[period - 1].time,
    value: ema,
  });

  // Tính EMA cho các phiên tiếp theo
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    emaData.push({
      time: data[i].time,
      value: ema,
    });
  }

  return emaData;
};

// Hàm tính toán chỉ báo SMA
export const calculateSMA = (
  data: CandlestickData[],
  period: number
): LineData[] => {
  if (data.length < period) return [];

  const smaData: LineData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const sum = data
      .slice(i - period + 1, i + 1)
      .reduce((acc, candle) => acc + candle.close, 0);
    const average = sum / period;

    smaData.push({
      time: data[i].time,
      value: average,
    });
  }

  return smaData;
};

// Hàm tính toán chỉ báo MACD
export const calculateMACD = (
  data: CandlestickData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: LineData[];
  signal: LineData[];
  histogram: HistogramData[];
} => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  if (fastEMA.length === 0 || slowEMA.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Tính đường MACD
  const macdLine: LineData[] = [];
  const startIndex = Math.max(0, slowPeriod - fastPeriod);

  for (let i = startIndex; i < fastEMA.length; i++) {
    const slowIndex = i - startIndex;
    if (slowIndex < slowEMA.length) {
      macdLine.push({
        time: fastEMA[i].time,
        value: fastEMA[i].value - slowEMA[slowIndex].value,
      });
    }
  }

  // Tính đường Signal (EMA của MACD)
  const signalLine = calculateEMAFromLineData(macdLine, signalPeriod);

  // Tính Histogram
  const histogram: HistogramData[] = [];
  const signalStartIndex = signalPeriod - 1;

  for (let i = signalStartIndex; i < macdLine.length; i++) {
    const signalIndex = i - signalStartIndex;
    if (signalIndex < signalLine.length) {
      const histValue = macdLine[i].value - signalLine[signalIndex].value;
      histogram.push({
        time: macdLine[i].time,
        value: histValue,
        color:
          histValue >= 0 ? "rgba(38, 166, 154, 0.7)" : "rgba(239, 83, 80, 0.7)",
      });
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  };
};

// Hàm phụ tính EMA từ mảng LineData (dùng cho MACD Signal)
const calculateEMAFromLineData = (
  data: LineData[],
  period: number
): LineData[] => {
  if (data.length < period) return [];

  const emaData: LineData[] = [];
  const multiplier = 2 / (period + 1);

  // Giá trị EMA đầu tiên là SMA của chu kỳ đầu
  let ema =
    data.slice(0, period).reduce((sum, point) => sum + point.value, 0) / period;

  emaData.push({
    time: data[period - 1].time,
    value: ema,
  });

  // Tính EMA cho các phiên tiếp theo
  for (let i = period; i < data.length; i++) {
    ema = (data[i].value - ema) * multiplier + ema;
    emaData.push({
      time: data[i].time,
      value: ema,
    });
  }

  return emaData;
};

// Hàm tổng hợp tính toán tất cả các chỉ báo dựa trên settings
export const calculateAllIndicators = (
  data: CandlestickData[],
  settings: {
    rsi: { enabled: boolean; period: number };
    macd: {
      enabled: boolean;
      fastPeriod: number;
      slowPeriod: number;
      signalPeriod: number;
    };
    sma: { enabled: boolean; period: number };
    ema: { enabled: boolean; period: number };
  }
): IndicatorData => {
  const indicators: IndicatorData = {};

  if (settings.rsi.enabled) {
    indicators.rsi = calculateRSI(data, settings.rsi.period);
  }

  if (settings.macd.enabled) {
    indicators.macd = calculateMACD(
      data,
      settings.macd.fastPeriod,
      settings.macd.slowPeriod,
      settings.macd.signalPeriod
    );
  }

  if (settings.sma.enabled) {
    indicators.sma = calculateSMA(data, settings.sma.period);
  }

  if (settings.ema.enabled) {
    indicators.ema = calculateEMA(data, settings.ema.period);
  }

  return indicators;
};
