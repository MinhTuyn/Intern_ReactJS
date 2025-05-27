import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
  LineStyle,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import axios from "axios";
import {
  getCandles,
  type ICandleStick,
  getLiveCandleWebSocketUrl,
} from "../../api/binance";
import ChartControls from "./ChartControls";
import "./BitcoinChart.css";
import IndicatorControls, {
  type IndicatorSettings,
} from "../IndicatorControls/IndicatorControls";
import { calculateAllIndicators } from "../IndicatorControls/indicatorUtils";

// Định nghĩa các kiểu dữ liệu props và dữ liệu API
interface BitcoinChartProps {
  symbol?: string;
  defaultTimeFrame?: string;
  initialCandleLimit?: number;
}

// Kiểu dữ liệu cho dữ liệu nến từ WebSocket Binance
interface BinanceWebSocketKlineData {
  e: string;
  E: number;
  s: string;
  k: {
    t: number;
    T: number;
    s: string;
    i: string;
    f: number;
    L: number;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    x: boolean;
    q: string;
    V: string;
    Q: string;
    B: string;
  };
}

// Kiểu dữ liệu cho dữ liệu giá từ CoinMarketCap
interface CMCQuoteUSD {
  price: number;
  volume_24h: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  market_cap: number;
  last_updated: string;
}

interface CMCCoinData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: CMCQuoteUSD;
  };
}

interface CMCResponse {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
  };
  data: {
    [key: string]: CMCCoinData;
  };
}

// Thông tin giá hiển thị
interface PriceInfo {
  currentPrice: string | null;
  oneMinAgoPrice: string | null;
  priceChangePercent: string | null;
  lastFetched: Date | null;
  error: string | null;
}

// Lưu trữ các series chỉ báo trên biểu đồ
interface IndicatorSeries {
  rsi?: ISeriesApi<"Line">;
  macdMain?: ISeriesApi<"Line">;
  macdSignal?: ISeriesApi<"Line">;
  macdHistogram?: ISeriesApi<"Histogram">;
  sma?: ISeriesApi<"Line">;
  ema?: ISeriesApi<"Line">;
}

// Lấy API key từ biến môi trường
const COINMARKETCAP_API_KEY = import.meta.env.VITE_COINMARKETCAP_API_KEY;

const BitcoinChart: React.FC<BitcoinChartProps> = ({
  symbol = "BTCUSDT",
  defaultTimeFrame = "1h",
  initialCandleLimit = 500,
}) => {
  // Các ref và state chính
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // State quản lý giao diện và dữ liệu
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(defaultTimeFrame);
  const [isLoading, setIsLoading] = useState(true);
  const [allCandlestickData, setAllCandlestickData] = useState<
    CandlestickData[]
  >([]);
  const [allVolumeData, setAllVolumeData] = useState<HistogramData[]>([]);
  const [oldestCandleTimestamp, setOldestCandleTimestamp] = useState<
    number | null
  >(null);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const [hasMoreHistoricalData, setHasMoreHistoricalData] = useState(true);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Tuỳ chọn theme cho biểu đồ
  const lightThemeOptions = {
    layout: {
      background: { type: ColorType.Solid, color: "#FFFFFF" },
      textColor: "#191919",
    },
    grid: {
      vertLines: { color: "#E0E0E0", style: LineStyle.Solid },
      horzLines: { color: "#E0E0E0", style: LineStyle.Solid },
    },
    timeScale: {
      borderColor: "#D1D4DC",
    },
    rightPriceScale: {
      borderColor: "#D1D4DC",
    },
  };

  const darkThemeOptions = {
    layout: {
      background: { type: ColorType.Solid, color: "#101010" },
      textColor: "#D9D9D9",
    },
    grid: {
      vertLines: { color: "#334158", style: LineStyle.Solid },
      horzLines: { color: "#334158", style: LineStyle.Solid },
    },
    timeScale: {
      borderColor: "#334158",
    },
    rightPriceScale: {
      borderColor: "#334158",
    },
  };

  // State cho các chỉ báo kỹ thuật
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    rsi: {
      enabled: false,
      period: 14,
      overbought: 70,
      oversold: 30,
    },
    macd: {
      enabled: false,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    sma: {
      enabled: false,
      period: 20,
    },
    ema: {
      enabled: false,
      period: 20,
    },
  });

  // const [indicatorData, setIndicatorData] = useState<IndicatorData>({}); // Removed as it's not read
  const [indicatorSeries, setIndicatorSeries] = useState<IndicatorSeries>({});

  // Xử lý khi thay đổi chỉ báo kỹ thuật
  const handleIndicatorChange = useCallback(
    (newIndicators: IndicatorSettings) => {
      setIndicators(newIndicators);
    },
    []
  );

  // Cập nhật dữ liệu chỉ báo kỹ thuật trên biểu đồ
  const updateIndicators = useCallback(() => {
    if (allCandlestickData.length === 0 || !chartRef.current) return;

    // Tính toán dữ liệu chỉ báo
    const newIndicatorData = calculateAllIndicators(
      allCandlestickData,
      indicators
    );
    // setIndicatorData(newIndicatorData); // Removed as indicatorData state is not used

    // Xoá các series chỉ báo cũ trước khi thêm mới
    Object.values(indicatorSeries).forEach((series) => {
      if (series && chartRef.current) {
        try {
          chartRef.current.removeSeries(series);
        } catch (error) {
          console.warn("Lỗi khi xoá series chỉ báo:", error);
        }
      }
    });

    const newSeries: IndicatorSeries = {};

    // Cập nhật scale cho các chỉ báo
    const hasRSI = indicators.rsi.enabled;
    // const hasMACD = indicators.macd.enabled; // Removed as it's not read

    chartRef.current.priceScale("right").applyOptions({
      scaleMargins: {
        top: 0.08,
        bottom: 0.25,
      },
    });

    // Thêm series RSI nếu bật
    if (indicators.rsi.enabled && newIndicatorData.rsi) {
      const rsiSeries = chartRef.current.addLineSeries({
        color: "#9C27B0",
        lineWidth: 2,
        priceScaleId: "rsi_scale",
        title: "RSI",
      });
      rsiSeries.setData(newIndicatorData.rsi);
      newSeries.rsi = rsiSeries;

      chartRef.current.priceScale("rsi_scale").applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: false,
        mode: 1,
      });
    }

    // Thêm series MACD nếu bật
    if (indicators.macd.enabled && newIndicatorData.macd) {
      const macdMainSeries = chartRef.current.addLineSeries({
        color: "#2196F3",
        lineWidth: 2,
        priceScaleId: "macd_scale",
        title: "MACD",
      });
      macdMainSeries.setData(newIndicatorData.macd.macd);
      newSeries.macdMain = macdMainSeries;

      const macdSignalSeries = chartRef.current.addLineSeries({
        color: "#FF9800",
        lineWidth: 2,
        priceScaleId: "macd_scale",
        title: "Signal",
      });
      macdSignalSeries.setData(newIndicatorData.macd.signal);
      newSeries.macdSignal = macdSignalSeries;

      const macdHistogramSeries = chartRef.current.addHistogramSeries({
        priceScaleId: "macd_scale",
        title: "MACD Histogram",
      });
      macdHistogramSeries.setData(newIndicatorData.macd.histogram);
      newSeries.macdHistogram = macdHistogramSeries;

      chartRef.current.priceScale("macd_scale").applyOptions({
        scaleMargins: {
          top: hasRSI ? 0.5 : 0.35,
          bottom: 0.05,
        },
        autoScale: true,
      });
    }

    // Thêm SMA nếu bật
    if (indicators.sma.enabled && newIndicatorData.sma) {
      const smaSeries = chartRef.current.addLineSeries({
        color: "#4CAF50",
        lineWidth: 2,
        title: `SMA(${indicators.sma.period})`,
      });
      smaSeries.setData(newIndicatorData.sma);
      newSeries.sma = smaSeries;
    }

    // Thêm EMA nếu bật
    if (indicators.ema.enabled && newIndicatorData.ema) {
      const emaSeries = chartRef.current.addLineSeries({
        color: "#FF5722",
        lineWidth: 2,
        title: `EMA(${indicators.ema.period})`,
      });
      emaSeries.setData(newIndicatorData.ema);
      newSeries.ema = emaSeries;
    }

    setIndicatorSeries(newSeries);
  }, [allCandlestickData, indicators]);

  // Áp dụng theme cho biểu đồ
  const applyTheme = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions(
        isDarkMode ? darkThemeOptions : lightThemeOptions
      );
      candlestickSeriesRef.current?.applyOptions({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderUpColor: "#26a69a",
        borderDownColor: "#ef5350",
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
      chartRef.current.priceScale("right").applyOptions({
        scaleMargins: {
          top: 0.08,
          bottom: 0.25,
        },
      });
    }
  }, [isDarkMode, indicators]);

  // Khởi tạo WebSocket để nhận dữ liệu real-time
  const initWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    setConnectionStatus("connecting");
    const wsUrl = getLiveCandleWebSocketUrl(selectedTimeFrame, symbol);
    console.log(`Connecting to WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data: BinanceWebSocketKlineData = JSON.parse(event.data);
        if (data.e === "kline" && data.k) {
          const klineData = data.k;
          // Tạo dữ liệu nến mới từ dữ liệu WebSocket
          const newCandleData: CandlestickData = {
            time: (klineData.t / 1000) as UTCTimestamp,
            open: parseFloat(klineData.o),
            high: parseFloat(klineData.h),
            low: parseFloat(klineData.l),
            close: parseFloat(klineData.c),
          };

          const newVolumeData: HistogramData = {
            time: (klineData.t / 1000) as UTCTimestamp,
            value: parseFloat(klineData.v),
            color:
              parseFloat(klineData.c) > parseFloat(klineData.o)
                ? "rgba(38, 166, 154, 0.7)"
                : "rgba(239, 83, 80, 0.7)",
          };

          // Cập nhật dữ liệu nến và volume
          setAllCandlestickData((prevData) => {
            const existingIndex = prevData.findIndex(
              (candle) => candle.time === newCandleData.time
            );
            if (existingIndex >= 0) {
              const updatedData = [...prevData];
              updatedData[existingIndex] = newCandleData;
              return updatedData;
            } else {
              return [...prevData, newCandleData];
            }
          });

          setAllVolumeData((prevData) => {
            const existingIndex = prevData.findIndex(
              (volume) => volume.time === newVolumeData.time
            );
            if (existingIndex >= 0) {
              const updatedData = [...prevData];
              updatedData[existingIndex] = newVolumeData;
              return updatedData;
            } else {
              return [...prevData, newVolumeData];
            }
          });

          setLastUpdateTime(new Date());

          // Cập nhật trực tiếp lên biểu đồ nếu có
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.update(newCandleData);
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.update(newVolumeData);
          }

          console.log(
            `Real-time update: ${symbol} - Price: ${
              newCandleData.close
            } at ${new Date(klineData.t).toLocaleTimeString()}`
          );
        }
      } catch (error) {
        console.error("Lỗi khi parse dữ liệu WebSocket:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("error");
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setConnectionStatus("disconnected");
      if (isRealTimeEnabled && event.code !== 1000) {
        setTimeout(() => {
          if (isRealTimeEnabled) {
            console.log("Attempting to reconnect WebSocket...");
            initWebSocket();
          }
        }, 5000);
      }
    };
  }, [selectedTimeFrame, symbol, isRealTimeEnabled]);

  // Bật/tắt chế độ streaming real-time
  const toggleRealTimeStreaming = useCallback(() => {
    if (isRealTimeEnabled) {
      if (websocketRef.current) {
        websocketRef.current.close(1000, "User disabled real-time streaming");
        websocketRef.current = null;
      }
      setIsRealTimeEnabled(false);
      setConnectionStatus("disconnected");
      console.log("Real-time streaming disabled");
    } else {
      setIsRealTimeEnabled(true);
      initWebSocket();
      console.log("Real-time streaming enabled");
    }
  }, [isRealTimeEnabled, initWebSocket]);

  // Tự động khởi tạo WebSocket khi bật real-time hoặc đổi timeframe/symbol
  useEffect(() => {
    if (isRealTimeEnabled) {
      initWebSocket();
    }
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [selectedTimeFrame, symbol, initWebSocket, isRealTimeEnabled]);

  // Tải thêm dữ liệu lịch sử khi kéo về quá khứ
  const loadMoreHistoricalData = useCallback(async () => {
    if (
      !oldestCandleTimestamp ||
      isFetchingOlder ||
      !chartRef.current ||
      !hasMoreHistoricalData
    ) {
      return;
    }

    setIsFetchingOlder(true);
    try {
      const newRawData = await getCandles(
        selectedTimeFrame,
        symbol,
        initialCandleLimit,
        oldestCandleTimestamp
      );

      if (newRawData && newRawData.length > 0) {
        const newFormattedCandles: CandlestickData[] = newRawData.map((d) => ({
          time: (d.openTime / 1000) as UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        const newFormattedVolumes: HistogramData[] = newRawData.map((d) => ({
          time: (d.openTime / 1000) as UTCTimestamp,
          value: d.volume,
          color:
            d.close > d.open
              ? "rgba(38, 166, 154, 0.7)"
              : "rgba(239, 83, 80, 0.7)",
        }));

        setAllCandlestickData((prevData) => [
          ...newFormattedCandles,
          ...prevData,
        ]);
        setAllVolumeData((prevData) => [...newFormattedVolumes, ...prevData]);
        setOldestCandleTimestamp(newRawData[0].openTime);
        setHasMoreHistoricalData(true);
      } else {
        setHasMoreHistoricalData(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải thêm dữ liệu lịch sử:", error);
    } finally {
      setIsFetchingOlder(false);
    }
  }, [
    oldestCandleTimestamp,
    isFetchingOlder,
    hasMoreHistoricalData,
    selectedTimeFrame,
    symbol,
    initialCandleLimit,
  ]);

  // Khởi tạo biểu đồ và tải dữ liệu lần đầu
  useEffect(() => {
    if (!chartContainerRef.current) return;

    setAllCandlestickData([]);
    setAllVolumeData([]);
    setOldestCandleTimestamp(null);
    setIsFetchingOlder(false);
    setHasMoreHistoricalData(true);
    setIsLoading(true);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
    chartRef.current = chart;

    candlestickSeriesRef.current = chart.addCandlestickSeries({});
    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume_scale",
    });

    applyTheme();
    chart.priceScale("right").applyOptions({
      scaleMargins: {
        top: 0.08,
        bottom: 0.25,
      },
    });
    chart.priceScale("volume_scale").applyOptions({
      scaleMargins: {
        top: 0.9,
        bottom: 0,
      },
    });

    // Hàm tải dữ liệu nến từ API
    const fetchData = async () => {
      try {
        const candleDataFromApi = await getCandles(
          selectedTimeFrame,
          symbol,
          initialCandleLimit
        );
        if (candleDataFromApi && candleDataFromApi.length > 0) {
          const formattedCandles: CandlestickData[] = candleDataFromApi.map(
            (d: ICandleStick) => ({
              time: (d.openTime / 1000) as UTCTimestamp,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            })
          );

          const formattedVolumes: HistogramData[] = candleDataFromApi.map(
            (d: ICandleStick) => ({
              time: (d.openTime / 1000) as UTCTimestamp,
              value: d.volume,
              color:
                d.close > d.open
                  ? "rgba(38, 166, 154, 0.7)"
                  : "rgba(239, 83, 80, 0.7)",
            })
          );

          setAllCandlestickData(formattedCandles);
          setAllVolumeData(formattedVolumes);
          setOldestCandleTimestamp(candleDataFromApi[0].openTime);
          setHasMoreHistoricalData(true);
        } else {
          setAllCandlestickData([]);
          setAllVolumeData([]);
          setOldestCandleTimestamp(null);
          setHasMoreHistoricalData(false);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu biểu đồ:", error);
        setAllCandlestickData([]);
        setAllVolumeData([]);
        setOldestCandleTimestamp(null);
        setHasMoreHistoricalData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Xử lý resize cửa sổ
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);

    // Tải thêm dữ liệu khi kéo về quá khứ
    const timeScale = chart.timeScale();
    const onVisibleLogicalRangeChanged = () => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (logicalRange && logicalRange.from < 5) {
        loadMoreHistoricalData();
      }
    };
    timeScale.subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);

    return () => {
      window.removeEventListener("resize", handleResize);
      timeScale.unsubscribeVisibleLogicalRangeChange(
        onVisibleLogicalRangeChanged
      );

      // Cleanup indicator series
      Object.values(indicatorSeries).forEach((series) => {
        if (series && chartRef.current) {
          try {
            chartRef.current.removeSeries(series);
          } catch (error) {
            console.warn("Lỗi khi xoá series chỉ báo khi cleanup:", error);
          }
        }
      });

      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      setIndicatorSeries({});
    };
  }, [symbol, selectedTimeFrame, initialCandleLimit, applyTheme]);

  // Áp dụng lại theme khi đổi chế độ sáng/tối
  useEffect(() => {
    applyTheme();
  }, [isDarkMode, applyTheme]);

  // Cập nhật dữ liệu nến lên biểu đồ
  useEffect(() => {
    if (candlestickSeriesRef.current && allCandlestickData.length > 0) {
      candlestickSeriesRef.current.setData(allCandlestickData);
    }
  }, [allCandlestickData]);

  // Cập nhật dữ liệu volume lên biểu đồ
  useEffect(() => {
    if (volumeSeriesRef.current && allVolumeData.length > 0) {
      volumeSeriesRef.current.setData(allVolumeData);
    }
  }, [allVolumeData]);

  // Cập nhật chỉ báo khi dữ liệu hoặc cấu hình thay đổi
  useEffect(() => {
    updateIndicators();
  }, [indicators, allCandlestickData]);

  // Lấy thông tin giá hiện tại, giá 1 phút trước và % thay đổi 24h
  const fetchPriceDetails = async () => {
    setPriceInfo({
      currentPrice: null,
      oneMinAgoPrice: null,
      priceChangePercent: null,
      lastFetched: null,
      error: "Đang tải...",
    });

    if (!COINMARKETCAP_API_KEY) {
      console.error(
        "CoinMarketCap API Key is not defined. Please set VITE_COINMARKETCAP_API_KEY in your .env file."
      );
      setPriceInfo({
        currentPrice: null,
        oneMinAgoPrice: null,
        priceChangePercent: null,
        lastFetched: new Date(),
        error: "Lỗi cấu hình: API Key không tồn tại.",
      });
      return;
    }

    try {
      let currentPrice: number | null = null;
      let priceChangePercent24h: number | null = null;
      let oneMinAgoPrice: number | null = null;

      // Ưu tiên lấy giá từ CoinMarketCap
      try {
        const cmcSymbol = getCMCSymbol(symbol);
        console.log(`Fetching CMC data for symbol: ${cmcSymbol}`);

        const cmcResponse = await axios.get<CMCResponse>(
          `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
          {
            params: {
              symbol: cmcSymbol,
              convert: "USD",
            },
            headers: {
              "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
              Accept: "application/json",
              "Accept-Encoding": "deflate, gzip",
            },
            timeout: 10000,
          }
        );

        if (cmcResponse.data.status.error_code !== 0) {
          throw new Error(
            `CMC API Error: ${cmcResponse.data.status.error_message}`
          );
        }

        const coinData = cmcResponse.data.data[cmcSymbol];
        if (coinData && coinData.quote && coinData.quote.USD) {
          currentPrice = coinData.quote.USD.price;
          priceChangePercent24h = coinData.quote.USD.percent_change_24h;
          console.log(
            `CMC - Price: $${currentPrice}, Change 24h: ${priceChangePercent24h}%`
          );
        }
      } catch (cmcError) {
        console.error("CMC API failed:", cmcError);
      }

      // Lấy giá 1 phút trước và tính % thay đổi 24h từ Binance nếu cần
      try {
        const binanceSymbol = symbol.endsWith("USDT")
          ? symbol
          : `${symbol}USDT`;

        const recentCandles = await getCandles("1m", binanceSymbol, 2);

        if (recentCandles && recentCandles.length >= 2) {
          const latestCandle = recentCandles[recentCandles.length - 1];
          const previousCandle = recentCandles[recentCandles.length - 2];

          oneMinAgoPrice = previousCandle.close;

          if (!currentPrice) {
            currentPrice = latestCandle.close;
          }

          console.log(
            `Binance - Current: $${latestCandle.close}, 1min ago: $${previousCandle.close}`
          );
        }

        // Nếu chưa có % thay đổi 24h, tự tính từ dữ liệu Binance
        if (priceChangePercent24h === null && currentPrice) {
          try {
            const candles24hAgo = await getCandles("1m", binanceSymbol, 1440);

            if (candles24hAgo && candles24hAgo.length > 0) {
              const price24hAgo = candles24hAgo[0].close;
              priceChangePercent24h =
                ((currentPrice - price24hAgo) / price24hAgo) * 100;
              console.log(
                `Calculated 24h change: ${priceChangePercent24h.toFixed(
                  2
                )}% (from $${price24hAgo} to $${currentPrice})`
              );
            }
          } catch (error) {
            console.error("Lỗi khi tính % thay đổi 24h từ Binance:", error);
          }
        }
      } catch (binanceError) {
        console.error("Binance API failed:", binanceError);
      }

      // Cập nhật state hiển thị giá
      if (currentPrice !== null) {
        setPriceInfo({
          currentPrice: currentPrice.toFixed(2),
          oneMinAgoPrice: oneMinAgoPrice ? oneMinAgoPrice.toFixed(2) : null,
          priceChangePercent: priceChangePercent24h
            ? priceChangePercent24h.toFixed(2)
            : null,
          lastFetched: new Date(),
          error: null,
        });
      } else {
        setPriceInfo({
          currentPrice: null,
          oneMinAgoPrice: null,
          priceChangePercent: null,
          lastFetched: new Date(),
          error: "Không thể lấy dữ liệu giá từ cả hai nguồn",
        });
      }
    } catch (error) {
      console.error("Lỗi không xác định khi lấy giá:", error);
      setPriceInfo({
        currentPrice: null,
        oneMinAgoPrice: null,
        priceChangePercent: null,
        lastFetched: new Date(),
        error: "Lỗi không xác định khi lấy giá",
      });
    }
  };

  // Hàm chuyển đổi symbol sang ký hiệu CMC
  const getCMCSymbol = (tradingSymbol: string): string => {
    const symbolMap: { [key: string]: string } = {
      BTCUSDT: "BTC",
      ETHUSDT: "ETH",
      ADAUSDT: "ADA",
      DOTUSDT: "DOT",
      LINKUSDT: "LINK",
    };
    return symbolMap[tradingSymbol] || tradingSymbol.replace("USDT", "");
  };

  // Render giao diện chính
  return (
    <div className={`chart-container ${isDarkMode ? "dark" : "light"}`}>
      <ChartControls
        symbol={symbol}
        selectedTimeFrame={selectedTimeFrame}
        isDarkMode={isDarkMode}
        isRealTimeEnabled={isRealTimeEnabled}
        connectionStatus={connectionStatus}
        lastUpdateTime={lastUpdateTime}
        priceInfo={priceInfo}
        setSelectedTimeFrame={setSelectedTimeFrame}
        setIsDarkMode={setIsDarkMode}
        toggleRealTimeStreaming={toggleRealTimeStreaming}
        fetchPriceDetails={fetchPriceDetails}
      />

      <IndicatorControls
        indicators={indicators}
        onIndicatorChange={handleIndicatorChange}
        isDarkMode={isDarkMode}
      />
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span className="loading-text">Đang tải dữ liệu biểu đồ...</span>
        </div>
      )}
      <div ref={chartContainerRef} className="chart-wrapper">
        {/* Biểu đồ sẽ được render ở đây */}
      </div>
    </div>
  );
};

export default BitcoinChart;
