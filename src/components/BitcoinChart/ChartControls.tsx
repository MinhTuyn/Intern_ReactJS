import React from "react";

// Định nghĩa kiểu dữ liệu cho thông tin giá
interface PriceInfo {
  currentPrice: string | null;
  oneMinAgoPrice: string | null;
  priceChangePercent: string | null;
  lastFetched: Date | null;
  error: string | null;
}

// Props cho component ChartControls
interface ChartControlsProps {
  symbol: string;
  selectedTimeFrame: string;
  isDarkMode: boolean;
  isRealTimeEnabled: boolean;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  lastUpdateTime: Date | null;
  priceInfo: PriceInfo | null;
  setSelectedTimeFrame: (timeFrame: string) => void;
  setIsDarkMode: (isDark: boolean) => void;
  toggleRealTimeStreaming: () => void;
  fetchPriceDetails: () => void;
}

// Các khung thời gian có thể chọn
const AVAILABLE_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"];

const ChartControls: React.FC<ChartControlsProps> = ({
  symbol,
  selectedTimeFrame,
  isDarkMode,
  isRealTimeEnabled,
  connectionStatus,
  lastUpdateTime,
  priceInfo,
  setSelectedTimeFrame,
  setIsDarkMode,
  toggleRealTimeStreaming,
  fetchPriceDetails,
}) => {
  // Xử lý khi đổi khung thời gian
  const handleTimeFrameChange = (newTimeFrame: string) => {
    setSelectedTimeFrame(newTimeFrame);
  };

  // Chuyển đổi theme sáng/tối
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Lấy màu trạng thái kết nối WebSocket
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "#26a69a";
      case "connecting":
        return "#ffa726";
      case "error":
        return "#ef5350";
      default:
        return "#757575";
    }
  };

  // Lấy text trạng thái kết nối WebSocket
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Đã kết nối";
      case "connecting":
        return "Đang kết nối...";
      case "error":
        return "Lỗi kết nối";
      default:
        return "Chưa kết nối";
    }
  };

  // Render giao diện controls
  return (
    <>
      <div className="chart-header">
        <div className="header-left">
          <div className="bitcoin-icon">₿</div>
          <h1 className="chart-title">
            {symbol}{" "}
            <span className="timeframe-display">({selectedTimeFrame})</span>
          </h1>
        </div>
        <div className="header-right">
          <div className="realtime-controls">
            <button
              className={`realtime-toggle ${isRealTimeEnabled ? "active" : ""}`}
              onClick={toggleRealTimeStreaming}
              title={
                isRealTimeEnabled
                  ? "Tắt streaming thời gian thực"
                  : "Bật streaming thời gian thực"
              }
            >
              <span className="realtime-icon">
                {isRealTimeEnabled ? "📡" : "⏸️"}
              </span>
              <span className="realtime-text">
                {isRealTimeEnabled ? "Live" : "Static"}
              </span>
            </button>
            {isRealTimeEnabled && (
              <div className="connection-status">
                <div
                  className="status-indicator"
                  style={{ backgroundColor: getConnectionStatusColor() }}
                ></div>
                <span className="status-text">{getConnectionStatusText()}</span>
              </div>
            )}
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={
              isDarkMode ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"
            }
          >
            <span className={`theme-icon ${isDarkMode ? "dark" : "light"}`}>
              {isDarkMode ? "🌙" : "☀️"}
            </span>
          </button>
        </div>
      </div>

      {/* Hiển thị trạng thái live và thời gian cập nhật gần nhất */}
      {isRealTimeEnabled && lastUpdateTime && (
        <div className="realtime-info">
          <span className="update-indicator">🔴 LIVE: </span>
          <span className="last-update">
            {lastUpdateTime.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Chọn khung thời gian */}
      <div className="timeframe-selector">
        {AVAILABLE_TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            className={`timeframe-button ${
              selectedTimeFrame === tf ? "active" : ""
            }`}
            onClick={() => handleTimeFrameChange(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Hiển thị thông tin giá */}
      <div className="price-info-section">
        <button onClick={fetchPriceDetails} className="price-fetch-button">
          📊 Lấy giá hiện tại
        </button>
        {priceInfo && priceInfo.lastFetched && (
          <>
            {priceInfo.error && (
              <div className="price-error">{priceInfo.error}</div>
            )}
            {!priceInfo.error && (
              <div className="price-details">
                <div className="price-item">
                  <div className="price-label">Giá hiện tại</div>
                  <div className="price-value">
                    ${priceInfo.currentPrice || "N/A"}
                  </div>
                </div>
                <div className="price-item">
                  <div className="price-label">Thay đổi 24h</div>
                  <div
                    className={`price-change ${
                      parseFloat(priceInfo.priceChangePercent || "0") > 0
                        ? "positive"
                        : parseFloat(priceInfo.priceChangePercent || "0") < 0
                        ? "negative"
                        : "neutral"
                    }`}
                  >
                    {parseFloat(priceInfo.priceChangePercent || "0") > 0
                      ? "↗"
                      : parseFloat(priceInfo.priceChangePercent || "0") < 0
                      ? "↘"
                      : "→"}
                    {priceInfo.priceChangePercent || "0"}%
                  </div>
                </div>
                <div className="price-item">
                  <div className="price-label">Giá 1 phút trước</div>
                  <div className="price-value">
                    ${priceInfo.oneMinAgoPrice || "N/A"}
                  </div>
                </div>
              </div>
            )}
            <div className="last-fetched-time">
              Cập nhật lúc: {priceInfo.lastFetched.toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChartControls;
