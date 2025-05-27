import React from "react";
import "./IndicatorControls.css";

// Định nghĩa kiểu dữ liệu cho các chỉ báo kỹ thuật
export interface IndicatorSettings {
  rsi: {
    enabled: boolean;
    period: number;
    overbought: number;
    oversold: number;
  };
  macd: {
    enabled: boolean;
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  sma: {
    enabled: boolean;
    period: number;
  };
  ema: {
    enabled: boolean;
    period: number;
  };
}

// Props cho component IndicatorControls
interface IndicatorControlsProps {
  indicators: IndicatorSettings;
  onIndicatorChange: (indicators: IndicatorSettings) => void;
  isDarkMode: boolean;
}

const IndicatorControls: React.FC<IndicatorControlsProps> = ({
  indicators,
  onIndicatorChange,
}) => {
  // Hàm cập nhật trạng thái chỉ báo
  const updateIndicator = (
    type: keyof IndicatorSettings,
    updates: Partial<IndicatorSettings[keyof IndicatorSettings]>
  ) => {
    const newIndicators = {
      ...indicators,
      [type]: {
        ...indicators[type],
        ...updates,
      },
    };
    onIndicatorChange(newIndicators);
  };

  // Render giao diện điều khiển các chỉ báo kỹ thuật
  return (
    <div className="indicator-controls">
      {/* Điều khiển RSI */}
      <div className="indicator-group">
        <div className="indicator-title">
          <label className="indicator-checkbox">
            <input
              type="checkbox"
              checked={indicators.rsi.enabled}
              onChange={(e) =>
                updateIndicator("rsi", { enabled: e.target.checked })
              }
            />
            <span className="checkmark"></span>
            RSI (Relative Strength Index)
          </label>
        </div>
        {indicators.rsi.enabled && (
          <div className="indicator-settings">
            <div className="setting-row">
              <label>Chu kỳ:</label>
              <input
                type="number"
                min="5"
                max="50"
                value={indicators.rsi.period}
                onChange={(e) =>
                  updateIndicator("rsi", {
                    period: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
            <div className="setting-row">
              <label>Quá mua:</label>
              <input
                type="number"
                min="50"
                max="90"
                value={indicators.rsi.overbought}
                onChange={(e) =>
                  updateIndicator("rsi", {
                    overbought: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
            <div className="setting-row">
              <label>Quá bán:</label>
              <input
                type="number"
                min="10"
                max="50"
                value={indicators.rsi.oversold}
                onChange={(e) =>
                  updateIndicator("rsi", {
                    oversold: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Điều khiển MACD */}
      <div className="indicator-group">
        <div className="indicator-title">
          <label className="indicator-checkbox">
            <input
              type="checkbox"
              checked={indicators.macd.enabled}
              onChange={(e) =>
                updateIndicator("macd", { enabled: e.target.checked })
              }
            />
            <span className="checkmark"></span>
            MACD (Moving Average Convergence Divergence)
          </label>
        </div>
        {indicators.macd.enabled && (
          <div className="indicator-settings">
            <div className="setting-row">
              <label>EMA nhanh:</label>
              <input
                type="number"
                min="5"
                max="30"
                value={indicators.macd.fastPeriod}
                onChange={(e) =>
                  updateIndicator("macd", {
                    fastPeriod: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
            <div className="setting-row">
              <label>EMA chậm:</label>
              <input
                type="number"
                min="20"
                max="50"
                value={indicators.macd.slowPeriod}
                onChange={(e) =>
                  updateIndicator("macd", {
                    slowPeriod: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
            <div className="setting-row">
              <label>Signal:</label>
              <input
                type="number"
                min="5"
                max="20"
                value={indicators.macd.signalPeriod}
                onChange={(e) =>
                  updateIndicator("macd", {
                    signalPeriod: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Điều khiển SMA */}
      <div className="indicator-group">
        <div className="indicator-title">
          <label className="indicator-checkbox">
            <input
              type="checkbox"
              checked={indicators.sma.enabled}
              onChange={(e) =>
                updateIndicator("sma", { enabled: e.target.checked })
              }
            />
            <span className="checkmark"></span>
            SMA (Simple Moving Average)
          </label>
        </div>
        {indicators.sma.enabled && (
          <div className="indicator-settings">
            <div className="setting-row">
              <label>Chu kỳ:</label>
              <input
                type="number"
                min="5"
                max="200"
                value={indicators.sma.period}
                onChange={(e) =>
                  updateIndicator("sma", {
                    period: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Điều khiển EMA */}
      <div className="indicator-group">
        <div className="indicator-title">
          <label className="indicator-checkbox">
            <input
              type="checkbox"
              checked={indicators.ema.enabled}
              onChange={(e) =>
                updateIndicator("ema", { enabled: e.target.checked })
              }
            />
            <span className="checkmark"></span>
            EMA (Exponential Moving Average)
          </label>
        </div>
        {indicators.ema.enabled && (
          <div className="indicator-settings">
            <div className="setting-row">
              <label>Chu kỳ:</label>
              <input
                type="number"
                min="5"
                max="200"
                value={indicators.ema.period}
                onChange={(e) =>
                  updateIndicator("ema", {
                    period: parseInt(e.target.value),
                  })
                }
                className="setting-input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndicatorControls;
