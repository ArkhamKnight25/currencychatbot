import React from 'react';
import './TradingParams.css';

interface TradingParamsProps {
  sellCoin: string;
  buyCoin: string;
  noOfSellCoins: string;
  threshold: string;
}

const TradingParams: React.FC<TradingParamsProps> = ({
  sellCoin,
  buyCoin,
  noOfSellCoins,
  threshold,
}) => {
  return (
    <div className="trading-params">
      <h3>Trading Parameters</h3>
      <div className="params-grid">
        <div className="param-item">
          <label>Sell Currency:</label>
          <span className={sellCoin ? 'filled' : 'empty'}>
            {sellCoin || 'Not set'}
          </span>
        </div>
        <div className="param-item">
          <label>Buy Currency:</label>
          <span className={buyCoin ? 'filled' : 'empty'}>
            {buyCoin || 'Not set'}
          </span>
        </div>
        <div className="param-item">
          <label>Amount to Sell:</label>
          <span className={noOfSellCoins ? 'filled' : 'empty'}>
            {noOfSellCoins || 'Not set'}
          </span>
        </div>
        <div className="param-item">
          <label>Threshold Rate:</label>
          <span className={threshold ? 'filled' : 'empty'}>
            {threshold || 'Not set'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingParams;
