import { useEffect, useState } from "react";
import ChatBox from "./ChatBox";
import InputForm from "./InputForm";
import TradingParams from "./TradingParams";
import "./Chat.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: string;
  content: string;
}

interface TradingParams {
  sell_coin: string;
  buy_coin: string;
  no_of_sell_coins: string;
  threshold: string;
}

interface ChatProps {
  chatId: string;
  chatName: string;
}

const Chat: React.FC<ChatProps> = ({ chatId, chatName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tradingParams, setTradingParams] = useState<TradingParams>({
    sell_coin: "",
    buy_coin: "",
    no_of_sell_coins: "",
    threshold: ""
  });
  const [needsTradingParams, setNeedsTradingParams] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string>("");

  // Training patterns for improved NLP recognition (first 10 patterns)
  const tradingPatterns = [
    {
      id: 1,
      original_request: "Hi can you create a stop order to protect my tokenA for TokenB i want to sell 15 token A when stop-loss hits 15%",
      sell_currency: "TokenA",
      buy_currency: "TokenB",
      threshold: "15%",
      amount_to_sell: "15"
    },
    {
      id: 2,
      original_request: "protect my usdc and sell them for receiving usdt at 50% loss",
      sell_currency: "USDC",
      buy_currency: "USDT",
      threshold: "50%",
      amount_to_sell: "not specified"
    },
    {
      id: 3,
      original_request: "stop order create 200 usdc sell receive DAI 50 loss % 45",
      sell_currency: "USDC",
      buy_currency: "DAI",
      threshold: "45%",
      amount_to_sell: "200"
    },
    {
      id: 4,
      original_request: "lets create a stop order which protects my Xai for Aave when loss % drops to 12%",
      sell_currency: "XAI",
      buy_currency: "AAVE",
      threshold: "12%",
      amount_to_sell: "not specified"
    },
    {
      id: 5,
      original_request: "sell my eurs to at 40% loss",
      sell_currency: "EURS",
      buy_currency: "not specified",
      threshold: "40%",
      amount_to_sell: "not specified"
    },
    {
      id: 6,
      original_request: "stop order for xavi buy me Pepe instead",
      sell_currency: "XAVI",
      buy_currency: "PEPE",
      threshold: "not specified",
      amount_to_sell: "not specified"
    },
    {
      id: 7,
      original_request: "lets create a stop order sell my usdt to get usdc when loss is 20%",
      sell_currency: "USDT",
      buy_currency: "USDC",
      threshold: "20%",
      amount_to_sell: "not specified"
    },
    {
      id: 8,
      original_request: "can you protect my tokens i want wbtc to be sold for a loss of 20% and buy weth",
      sell_currency: "WBTC",
      buy_currency: "WETH",
      threshold: "20%",
      amount_to_sell: "not specified"
    },
    {
      id: 9,
      original_request: "set up a stop loss for my ETH, sell 100 tokens for USDC when it drops 25%",
      sell_currency: "ETH",
      buy_currency: "USDC",
      threshold: "25%",
      amount_to_sell: "100"
    },
    {
      id: 10,
      original_request: "I need protection on my MATIC holdings, convert to DAI if loss reaches 30%",
      sell_currency: "MATIC",
      buy_currency: "DAI",
      threshold: "30%",
      amount_to_sell: "not specified"
    }
  ];

  useEffect(() => {
    console.log("chatId", chatId);
    const savedMessages = JSON.parse(
      localStorage.getItem(`chat-${chatId}`) || "[]"
    );
    setMessages(savedMessages);
    
    // Reset trading mode for each chat
    setNeedsTradingParams(false);
    
    // Load saved trading parameters
    const savedParams = JSON.parse(
      localStorage.getItem(`params-${chatId}`) || "{}"
    );
    setTradingParams({
      sell_coin: savedParams.sell_coin || "",
      buy_coin: savedParams.buy_coin || "",
      no_of_sell_coins: savedParams.no_of_sell_coins || "",
      threshold: savedParams.threshold || ""
    });
    
    // Check if welcome message was already sent
    const welcomed = localStorage.getItem(`welcomed-${chatId}`);
    if (!welcomed && savedMessages.length === 0) {
      // Send welcome message for new chats
      setTimeout(() => {
        setMessages([{
          role: "system",
          content: "🌟 Welcome to UniSwap Currency! I'm your personal currency exchange assistant. I can help you with real-time exchange rates, market analysis, currency conversions, and much more!\n\n💡 **Want to set up stop orders?** Just mention \"stop order\" and I'll guide you through the process step by step!\n\nHow can I assist you with your currency needs today?"
        }]);
        setHasWelcomed(true);
        localStorage.setItem(`welcomed-${chatId}`, "true");
      }, 500);
    } else {
      setHasWelcomed(true);
    }
  }, [chatId]);

  useEffect(() => {
    console.log("messages", messages);
    localStorage.setItem(`chat-${chatId}`, JSON.stringify(messages));
  }, [messages, chatId]);

  useEffect(() => {
    // Save trading parameters whenever they change
    localStorage.setItem(`params-${chatId}`, JSON.stringify(tradingParams));
  }, [tradingParams, chatId]);

  // Function to check if user is requesting trading setup
  const checkForTradingRequest = (input: string): boolean => {
    const tradingKeywords = [
      'stop order',
      'stop orders',
      'smart stop order',
      'smart stop orders',
      'stop loss',
      'protect my',
      'stop loss of',
      'at a stop loss'
    ];
    
    const lowerInput = input.toLowerCase();
    return tradingKeywords.some(keyword => lowerInput.includes(keyword));
  };

  // Function to generate a beautiful trading setup message using AI
  // Function to extract trading parameters from user input
  const extractTradingParams = (input: string, lastQuestion?: string): Partial<TradingParams> => {
    const extracted: Partial<TradingParams> = {};
    
    // FIRST: Extract threshold from percentage mentions (highest priority)
    const thresholdPatterns = [
      /(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%?\s*threshold/i,
      /threshold.*?(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%?/i,
      /at\s+(?:about\s+)?(\d+(?:\.\d+)?)%\s*loss/i,
      /(\d+(?:\.\d+)?)%\s*loss/i,
      /loss\s+(?:of\s+)?(\d+(?:\.\d+)?)%/i,
      /for\s+(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%/i,
      /at\s+(?:about\s+)?(\d+(?:\.\d+)?)%/i,
      /(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%/i,
      // Pattern for "stop loss of 12%"
      /stop\s+loss\s+(?:of|at)\s+(\d+(?:\.\d+)?)%?/i,
      /at\s+a\s+stop\s+loss\s+of\s+(\d+(?:\.\d+)?)%?/i
    ];
    
    for (const pattern of thresholdPatterns) {
      const match = input.match(pattern);
      if (match) {
        extracted.threshold = match[1];
        console.log("Threshold extracted:", match[1], "from pattern:", pattern.source);
        break;
      }
    }
    
    // SECOND: Try to match against known patterns for improved accuracy (only if we haven't extracted currencies yet)
    const inputLower = input.toLowerCase();
    if (!extracted.sell_coin && !extracted.buy_coin) {
      for (const pattern of tradingPatterns) {
        const patternLower = pattern.original_request.toLowerCase();
        // Calculate similarity score (simple word matching)
        const inputWords = inputLower.split(/\s+/);
        const patternWords = patternLower.split(/\s+/);
        const commonWords = inputWords.filter(word => patternWords.includes(word));
        const similarity = commonWords.length / Math.max(inputWords.length, patternWords.length);
        
        // Increase threshold and add currency validation to prevent false matches
        if (similarity > 0.5) {
          console.log(`Pattern match found (${Math.round(similarity * 100)}%):`, pattern.original_request);
          
          // Additional validation: check if the pattern currencies actually appear in the input
          const inputHasSellCurrency = pattern.sell_currency === "not specified" || 
                                     inputLower.includes(pattern.sell_currency.toLowerCase());
          const inputHasBuyCurrency = pattern.buy_currency === "not specified" || 
                                    inputLower.includes(pattern.buy_currency.toLowerCase());
          
          // Only use pattern if currencies match or are generic
          if (inputHasSellCurrency && inputHasBuyCurrency) {
            if (pattern.sell_currency !== "not specified" && !extracted.sell_coin) {
              extracted.sell_coin = pattern.sell_currency;
            }
            if (pattern.buy_currency !== "not specified" && !extracted.buy_coin) {
              extracted.buy_coin = pattern.buy_currency;
            }
            if (pattern.threshold !== "not specified" && !extracted.threshold) {
              extracted.threshold = pattern.threshold.replace('%', '');
            }
            if (pattern.amount_to_sell !== "not specified" && !extracted.no_of_sell_coins) {
              extracted.no_of_sell_coins = pattern.amount_to_sell;
            }
            break; // Use first matching pattern
          } else {
            console.log("Pattern skipped - currencies don't match input:", 
                       "sell:", pattern.sell_currency, "buy:", pattern.buy_currency);
          }
        }
      }
    } else {
      console.log("Skipping pattern matching - currencies already extracted from direct patterns");
    }
    
    // Normalize currency names and validate known currencies
    const normalizeCurrency = (currency: string): string => {
      // Skip common trading/command words that aren't currencies
      const nonCurrencyWords = ['stop', 'order', 'loss', 'buy', 'sell', 'for', 'and', 'the', 'with', 'from', 'into', 'swap', 'protect'];
      if (nonCurrencyWords.includes(currency.toLowerCase())) {
        console.log("Rejecting non-currency word:", currency);
        return '';
      }
      
      // Create currency mapping from common variations
      const commonVariations: { [key: string]: string } = {
        'usdc': 'USDC',
        'usd coin': 'USDC',
        'usdt': 'USDT', 
        'tether': 'USDT',
        'dai': 'DAI',
        'ethereum': 'ETH',
        'eth': 'ETH',
        'bitcoin': 'BTC',
        'btc': 'BTC',
        'matic': 'MATIC',
        'polygon': 'MATIC',
        'chainlink': 'LINK',
        'link': 'LINK',
        'solana': 'SOL',
        'sol': 'SOL',
        'binance': 'BNB',
        'bnb': 'BNB',
        'cardano': 'ADA',
        'ada': 'ADA',
        'avalanche': 'AVAX',
        'avax': 'AVAX',
        'polkadot': 'DOT',
        'dot': 'DOT',
        'uniswap': 'UNI',
        'uni': 'UNI',
        'algorand': 'ALGO',
        'algo': 'ALGO',
        'cosmos': 'ATOM',
        'atom': 'ATOM',
        'fantom': 'FTM',
        'ftm': 'FTM',
        'near': 'NEAR',
        'sandbox': 'SAND',
        'sand': 'SAND',
        'decentraland': 'MANA',
        'mana': 'MANA',
        'dogecoin': 'DOGE',
        'doge': 'DOGE',
        'litecoin': 'LTC',
        'ltc': 'LTC',
        'cronos': 'CRO',
        'cro': 'CRO',
        'shiba': 'SHIB',
        'shib': 'SHIB',
        'compound': 'COMP',
        'comp': 'COMP',
        'graph': 'GRT',
        'grt': 'GRT',
        'aave': 'AAVE',
        'luna': 'LUNA',
        'internet computer': 'ICP',
        'icp': 'ICP',
        'flow': 'FLOW',
        'theta': 'THETA',
        'enjin': 'ENJ',
        'enj': 'ENJ',
        'vechain': 'VET',
        'vet': 'VET',
        'hedera': 'HBAR',
        'hbar': 'HBAR',
        'wrapped bitcoin': 'WBTC',
        'wbtc': 'WBTC',
        'wrapped ethereum': 'WETH',
        'weth': 'WETH',
        'xai': 'XAI',
        'euros': 'EURS',
        'eurs': 'EURS',
        'xavi': 'XAVI',
        'pepe': 'PEPE',
        'busd': 'BUSD',
        'tokena': 'TokenA',
        'tokenb': 'TokenB'
      };
      
      // Check common variations first
      const normalized = commonVariations[currency.toLowerCase()];
      if (normalized) {
        console.log("Currency normalized:", currency, "->", normalized);
        return normalized;
      }
      
      // If not found in mapping, return uppercase if it looks like a valid currency (3-5 chars)
      const upperCurrency = currency.toUpperCase();
      if (upperCurrency.length >= 3 && upperCurrency.length <= 5 && /^[A-Z]+$/.test(upperCurrency)) {
        console.log("Currency accepted as-is:", upperCurrency);
        return upperCurrency;
      }
      
      console.log("Currency not recognized:", currency);
      return ''; // Return empty for unrecognized currencies
    };
    
    // Context-aware parameter extraction based on last question
    if (lastQuestion) {
      const numberOnly = input.match(/(?:about\s+)?(\d+(?:\.\d+)?)%?$/i);
      if (numberOnly) {
        if (lastQuestion.toLowerCase().includes('threshold') || lastQuestion.toLowerCase().includes('rate')) {
          extracted.threshold = numberOnly[1];
          return extracted;
        } else if (lastQuestion.toLowerCase().includes('how many') || lastQuestion.toLowerCase().includes('amount')) {
          extracted.no_of_sell_coins = numberOnly[1];
          return extracted;
        }
      }
      
      // If it's just a currency name in response to a question
      const currencyOnly = input.match(/^([A-Za-z]{3,})$/);
      if (currencyOnly) {
        console.log("Currency-only input detected:", currencyOnly[1]);
        const currency = normalizeCurrency(currencyOnly[1]);
        console.log("Normalized currency result:", currency);
        console.log("Last question:", lastQuestion);
        if (currency) {
          if (lastQuestion.toLowerCase().includes('selling') || lastQuestion.toLowerCase().includes('sell')) {
            console.log("Setting sell_coin to:", currency);
            extracted.sell_coin = currency;
            return extracted;
          } else if (lastQuestion.toLowerCase().includes('buying') || lastQuestion.toLowerCase().includes('buy')) {
            console.log("Setting buy_coin to:", currency);
            extracted.buy_coin = currency;
            return extracted;
          }
        } else {
          console.log("Currency normalization failed for:", currencyOnly[1]);
        }
      }
    }
    
    // If input is just a number without context, try to determine from missing params
    const numberOnly = input.match(/(?:about\s+)?(\d+(?:\.\d+)?)%?$/i);
    if (numberOnly) {
      // If we're missing threshold, treat as threshold
      if (!tradingParams.threshold) {
        extracted.threshold = numberOnly[1];
        return extracted;
      }
      // If we're missing amount, treat as amount
      if (!tradingParams.no_of_sell_coins) {
        extracted.no_of_sell_coins = numberOnly[1];
        return extracted;
      }
    }
    
    // Extract sell_coin and amount - improved patterns
    const sellPatterns = [
      // Pattern for "make stop order sell 750 ATOM get USDT" - HIGHEST PRIORITY
      /(?:make\s+)?stop\s+order\s+sell\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{3,})\s+get\s+([A-Za-z]{3,})/i,
      // Alternative pattern for "sell 750 ATOM get USDT" without "stop order"
      /sell\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{3,})\s+get\s+([A-Za-z]{3,})/i,
      // Pattern for "auto sell my ICP for USDC at 17% loss" - captures sell and buy currencies
      /auto\s+sell\s+my\s+([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})\s+at\s+\d+%\s+loss/i,
      // Pattern for "make stop order sell 750 ATOM get USDT" - EXACT MATCH for this format
      /(?:make\s+)?stop\s+order\s+sell\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{3,})\s+get\s+([A-Za-z]{3,})/i,
      // Pattern for "swap 1000 ADA for USDC" - captures amount, sell currency, and buy currency
      /swap\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})/i,
      // Pattern for "protect my btc for usdc i want to sell 15" - captures sell and buy currencies, then amount
      /protect\s+my\s+([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})\s+.*?sell\s+(\d+(?:\.\d+)?)(?!\s*%)/i,
      // Pattern for "stop order for xavi buy me Pepe instead"
      /stop\s+order\s+for\s+([A-Za-z]{3,})\s+buy\s+me\s+([A-Za-z]{3,})\s+instead/i,
      // Pattern for "protects my Xai for Aave" - specific for current input
      /protects?\s+my\s+([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})/i,
      // Pattern for "protect my usdc and sell them for receiving usdt" - specific pattern without amount
      /protect\s+my\s+([A-Za-z]{3,})\s+and\s+sell\s+them\s+for\s+receiving\s+([A-Za-z]{3,})/i,
      // Pattern for "sell 50 ETH" - captures both amount and currency (avoid percentages)
      /(?:sell|selling|want\s+to\s+sell|wanna\s+sell)\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})/i,
      // Pattern for "protect my usdc for usdt i want to sell 15 usdc" - specific for your case
      /protect\s+my\s+([A-Za-z]{3,})\s+for\s+[A-Za-z]{3,}.*?sell\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})/i,
      // Pattern for "protect my 50 usdc" - captures both amount and currency (avoid percentages)
      /protect\s+my\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})/i,
      // Pattern for "50 ETH" when context suggests selling (avoid percentages)
      /(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})(?!\s*for)(?:\s+to\s+buy|\s+into)/i,
      // Pattern for "selling ETH", "from ETH" etc.
      /(?:selling|from|exchange|convert)\s+([A-Za-z]{3,})/i,
      /sell\s+([A-Za-z]{3,})/i,
      /want\s+to\s+sell\s+([A-Za-z]{3,})/i,
      /wanna\s+sell\s+([A-Za-z]{3,})/i,
      /i\s+want\s+to\s+sell\s+([A-Za-z]{3,})/i,
      /i\s+am\s+selling\s+([A-Za-z]{3,})/i,
      // Pattern for "protect my USDC" (currency only, no numbers) - must come after amount patterns
      /protect\s+my\s+([A-Za-z]{3,})(?!\s*\d)/i,
      /stop\s+loss\s+(?:for|on|of)\s+([A-Za-z]{3,})/i,
      /stop\s+loss\s+my\s+([A-Za-z]{3,})/i,
      // General "for currency" pattern - moved to end to avoid conflicts
      /for\s+([A-Za-z]{3,})/i
    ];
    
    let swapPatternMatched = false;
    
    for (const pattern of sellPatterns) {
      const match = input.match(pattern);
      if (match) {
        console.log("Sell pattern matched:", pattern.source, "with groups:", match);
        
        // Check if this is a "sell X CURRENCY get CURRENCY" pattern (our new high-priority patterns)
        if (pattern.source.includes('sell') && pattern.source.includes('get') && match.length >= 4) {
          console.log("Processing sell-get pattern - full match:", match);
          const amount = match[1];
          const sellCurrency = normalizeCurrency(match[2]);
          const buyCurrency = normalizeCurrency(match[3]);
          console.log("Extracted from sell-get pattern:", { amount, sellCurrency, buyCurrency });
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
            console.log("Set sell_coin to:", sellCurrency);
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
            console.log("Set buy_coin to:", buyCurrency);
          }
          if (amount) {
            extracted.no_of_sell_coins = amount;
            console.log("Set amount to:", amount);
          }
          swapPatternMatched = true;
          console.log("Sell-get pattern processed, swapPatternMatched set to true");
        } else if (pattern.source.includes('auto') && pattern.source.includes('sell') && pattern.source.includes('my') && pattern.source.includes('for')) {
          // Special case for "auto sell my ICP for USDC at 17% loss"
          console.log("Processing auto sell pattern - full match:", match);
          const sellCurrency = normalizeCurrency(match[1]);
          const buyCurrency = normalizeCurrency(match[2]);
          console.log("Extracted from auto sell pattern:", { sellCurrency, buyCurrency });
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
            console.log("Set sell_coin to:", sellCurrency);
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
            console.log("Set buy_coin to:", buyCurrency);
          }
          swapPatternMatched = true;
          console.log("Auto sell pattern processed, swapPatternMatched set to true");
        } else if (pattern.source.includes('swap') && pattern.source.includes('for')) {
          // Special case for "swap 1000 ADA for USDC"
          console.log("Processing swap pattern - full match:", match);
          const amount = match[1];
          const sellCurrency = normalizeCurrency(match[2]);
          const buyCurrency = normalizeCurrency(match[3]);
          console.log("Extracted from swap:", { amount, sellCurrency, buyCurrency });
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
            console.log("Set sell_coin to:", sellCurrency);
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
            console.log("Set buy_coin to:", buyCurrency);
          }
          if (amount) {
            extracted.no_of_sell_coins = amount;
            console.log("Set amount to:", amount);
          }
          swapPatternMatched = true;
          console.log("Swap pattern processed, swapPatternMatched set to true");
        } else if (pattern.source.includes('protect') && pattern.source.includes('for') && pattern.source.includes('sell') && match.length >= 4) {
          // Special case for "protect my btc for usdc i want to sell 15"
          console.log("Processing protect+sell pattern - full match:", match);
          const sellCurrency = normalizeCurrency(match[1]);
          const buyCurrency = normalizeCurrency(match[2]);
          const amount = match[3];
          console.log("Extracted from protect+sell:", { sellCurrency, buyCurrency, amount });
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
            console.log("Set sell_coin to:", sellCurrency);
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
            console.log("Set buy_coin to:", buyCurrency);
          }
          if (amount) {
            extracted.no_of_sell_coins = amount;
            console.log("Set amount to:", amount);
          }
          swapPatternMatched = true;
          console.log("Protect+sell pattern processed, swapPatternMatched set to true");
        } else if (pattern.source.includes('stop') && pattern.source.includes('order') && pattern.source.includes('buy') && pattern.source.includes('me') && pattern.source.includes('instead')) {
          // Special case for "stop order for xavi buy me Pepe instead"
          const sellCurrency = normalizeCurrency(match[1]);
          const buyCurrency = normalizeCurrency(match[2]);
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
          }
        } else if (pattern.source.includes('protects?\\s+my\\s+([A-Za-z]{3,})\\s+for\\s+([A-Za-z]{3,})')) {
          // Special case for "protects my Xai for Aave"
          const sellCurrency = normalizeCurrency(match[1]);
          const buyCurrency = normalizeCurrency(match[2]);
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
          }
        } else if (pattern.source.includes('protect\\s+my\\s+([A-Za-z]{3,})\\s+and\\s+sell\\s+them\\s+for\\s+receiving\\s+([A-Za-z]{3,})')) {
          // Special case for "protect my usdc and sell them for receiving usdt"
          const sellCurrency = normalizeCurrency(match[1]);
          const buyCurrency = normalizeCurrency(match[2]);
          if (sellCurrency) {
            extracted.sell_coin = sellCurrency;
          }
          if (buyCurrency) {
            extracted.buy_coin = buyCurrency;
          }
        } else if (pattern.source.includes('protect\\s+my\\s+([A-Za-z]{3,})\\s+for\\s+[A-Za-z]{3,}.*?sell\\s+(\\d+')) {
          // Special case for "protect my usdc for usdt i want to sell 15 usdc"
          const normalizedCurrency = normalizeCurrency(match[3] || match[1]);
          if (normalizedCurrency) {
            extracted.sell_coin = normalizedCurrency;
            extracted.no_of_sell_coins = match[2];
          }
        } else if (pattern.source.includes('(\\d+')) {
          // Pattern with amount and currency
          if (match[2]) {
            const normalizedCurrency = normalizeCurrency(match[2]);
            if (normalizedCurrency) {
              extracted.sell_coin = normalizedCurrency;
              extracted.no_of_sell_coins = match[1];
            }
          } else if (match[1]) {
            const normalizedCurrency = normalizeCurrency(match[1]);
            if (normalizedCurrency) {
              extracted.sell_coin = normalizedCurrency;
            }
          }
        } else {
          // Pattern with just currency
          const normalizedCurrency = normalizeCurrency(match[1]);
          if (normalizedCurrency) {
            extracted.sell_coin = normalizedCurrency;
          }
        }
        break;
      }
    }
    
    // Extract amount separately if not captured above
    if (!extracted.no_of_sell_coins) {
      const amountPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:coins?|units?|tokens?)/i,
        /amount.*?(\d+(?:\.\d+)?)/i,
        /quantity.*?(\d+(?:\.\d+)?)/i,
        /^(\d+(?:\.\d+)?)$/
      ];
      
      for (const pattern of amountPatterns) {
        const match = input.match(pattern);
        if (match) {
          extracted.no_of_sell_coins = match[1];
          break;
        }
      }
    }
    
    // Extract buy_coin - multiple patterns (skip if swap pattern already handled both currencies)
    if (!swapPatternMatched) {
      console.log("Processing buy patterns since swapPatternMatched is false");
      const buyPatterns = [
      // Pattern for "buy me Pepe instead"
      /buy\s+me\s+([A-Za-z]{3,})\s+instead/i,
      // Pattern for "protect my usdc for usdt" - specific for your case
      /protect\s+my\s+[A-Za-z]{3,}\s+for\s+([A-Za-z]{3,})/i,
      // Specific patterns for complex phrases - put these first
      /(?:and\s+)?(?:would\s+)?want\s+to\s+receive\s+([A-Za-z]{3,})\s+in\s+its\s+place/i,
      /receive\s+([A-Za-z]{3,})\s+in\s+its\s+place/i,
      /(?:and\s+)?(?:would\s+)?want\s+to\s+receive\s+([A-Za-z]{3,})/i,
      /receive\s+([A-Za-z]{3,})/i,
      // General patterns
      /buy\s+([A-Za-z]{3,})/i,
      /buying\s+([A-Za-z]{3,})/i,
      /to\s+([A-Za-z]{3,})/i,
      /for\s+([A-Za-z]{3,})/i,
      /into\s+([A-Za-z]{3,})/i,
      /get\s+([A-Za-z]{3,})/i,
      /want\s+to\s+buy\s+([A-Za-z]{3,})/i,
      /wanna\s+buy\s+([A-Za-z]{3,})/i,
      // Other "in its place" patterns
      /([A-Za-z]{3,})\s+in\s+its\s+place/i,
      /in\s+its\s+place.*?([A-Za-z]{3,})/i
    ];
    
    for (const pattern of buyPatterns) {
      const match = input.match(pattern);
      if (match) {
        console.log("Buy pattern matched:", pattern.source, "matched:", match[1]);
        const normalizedCurrency = normalizeCurrency(match[1]);
        console.log("Normalized currency:", normalizedCurrency);
        if (normalizedCurrency) {
          extracted.buy_coin = normalizedCurrency;
        }
        break;
      }
    }
    
    } else {
      console.log("Skipping buy pattern extraction since swapPatternMatched is true");
    }
    
    // If input is just a currency name and no sell/buy context, check what we're missing
    const currencyOnlyMatch = input.match(/^([A-Za-z]{3,})$/);
    if (currencyOnlyMatch) {
      const currency = normalizeCurrency(currencyOnlyMatch[1]);
      if (currency) {
        // If we don't have sell_coin, this is probably the sell currency
        if (!tradingParams.sell_coin) {
          extracted.sell_coin = currency;
        } else if (!tradingParams.buy_coin) {
          extracted.buy_coin = currency;
        }
      }
    }
    
    // Extract number of coins - multiple patterns
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:coins?|units?|tokens?)/i,
      /amount\s*(?:of|:)?\s*(\d+(?:\.\d+)?)/i,
      /quantity\s*(?:of|:)?\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s+(?:of\s+)?[A-Za-z]{3,}/i,
      /(\d+(?:\.\d+)?)\s*[A-Za-z]{3,}/i,
      /sell\s+(\d+(?:\.\d+)?)/i,
      /wanna\s+sell\s+(\d+(?:\.\d+)?)/i
    ];
    
    if (!extracted.no_of_sell_coins) {
      for (const pattern of amountPatterns) {
        const match = input.match(pattern);
        if (match) {
          extracted.no_of_sell_coins = match[1];
          break;
        }
      }
    }
    
    // Fallback: try to extract any currency-like words if main patterns didn't work
    if ((!extracted.sell_coin || !extracted.buy_coin) && !swapPatternMatched) {
      const allCurrencyMatches = input.match(/\b[A-Z]{3,5}\b/gi);
      if (allCurrencyMatches) {
        for (const match of allCurrencyMatches) {
          // Skip common non-currency words that might be capitalized
          const skipWords = ['STOP', 'ORDER', 'LOSS', 'BUY', 'SELL', 'FOR', 'AND', 'THE', 'WITH', 'FROM', 'INTO'];
          if (skipWords.includes(match.toUpperCase())) {
            console.log("Skipping non-currency word:", match);
            continue;
          }
          
          const normalized = normalizeCurrency(match);
          if (normalized) {
            if (!extracted.sell_coin) {
              extracted.sell_coin = normalized;
            } else if (!extracted.buy_coin && normalized !== extracted.sell_coin) {
              extracted.buy_coin = normalized;
              break;
            }
          }
        }
      }
    }
    
    // Fallback: extract any numbers if amount wasn't found
    if (!extracted.no_of_sell_coins) {
      // Check if the input suggests no specific amount (using words like "them", "my holdings", etc.)
      const noAmountIndicators = /\b(them|my\s+holdings?|my\s+\w+\s+holdings?|all\s+my)\b/i;
      const hasNoAmountIndicator = noAmountIndicators.test(input);
      
      if (!hasNoAmountIndicator) {
        // Look for standalone numbers that are NOT part of a percentage
        // This regex ensures the number is not preceded or followed by digits that would make it part of a percentage
        const numberMatches = input.match(/\b(\d+(?:\.\d+)?)\b/g);
        if (numberMatches) {
          for (const numStr of numberMatches) {
            // Check if this number is part of a percentage in the original input
            const isPartOfPercentage = input.includes(numStr + '%') || 
                                     input.match(new RegExp('\\d*' + numStr + '\\d*%')) ||
                                     extracted.threshold === numStr;
            
            if (!isPartOfPercentage) {
              extracted.no_of_sell_coins = numStr;
              console.log("Amount extracted:", numStr, "(not part of percentage)");
              break;
            } else {
              console.log("Skipping number", numStr, "as it's part of a percentage");
            }
          }
        }
      } else {
        console.log("No amount extraction attempted - detected unspecified amount indicator:", input.match(noAmountIndicators)?.[0]);
      }
    }
    
    // Fallback: extract any percentage if threshold wasn't found
    if (!extracted.threshold) {
      const percentMatch = input.match(/(\d+(?:\.\d+)?)%/);
      if (percentMatch) {
        extracted.threshold = percentMatch[1];
      }
    }
    
    console.log("Final extracted params:", extracted);
    
    return extracted;
  };

  // Function to check if all required parameters are present
  const getMissingParams = (params: TradingParams): string[] => {
    const missing: string[] = [];
    if (!params.sell_coin) missing.push("sell_coin");
    if (!params.buy_coin) missing.push("buy_coin");
    if (!params.no_of_sell_coins) missing.push("no_of_sell_coins");
    if (!params.threshold) missing.push("threshold");
    return missing;
  };

  // Function to generate missing parameter questions
  const generateMissingParamQuestion = (missing: string[], currentParams: TradingParams): string => {
    // Ask for the first missing parameter only (one by one approach)
    const firstMissing = missing[0];
    
    const questions = {
      sell_coin: "Which currency are you selling?",
      buy_coin: `What currency do you want to buy${currentParams.sell_coin ? ` with your ${currentParams.sell_coin}` : ''}?`,
      no_of_sell_coins: `How many ${currentParams.sell_coin || 'coins'} are you selling?`,
      threshold: `What's your target exchange rate${currentParams.sell_coin && currentParams.buy_coin ? ` for ${currentParams.sell_coin} to ${currentParams.buy_coin}` : ''}?`
    };
    
    return questions[firstMissing as keyof typeof questions] || "Please provide more details.";
  };

  const inference = async () => {
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Format the conversation history for Gemini
      let systemPrompt = `You are UniSwap Currency AI - a friendly and knowledgeable universal currency exchange assistant.

IMPORTANT RULES:
1. When users mention "stop order" or similar, DO NOT ask detailed trading questions
2. Simply guide them through our simple parameter collection process
3. Ask only for: sell currency, buy currency, amount, and threshold percentage
4. Keep responses short and focused
5. Don't ask about exchanges, entry prices, or complex trading details

You can help with:
- Real-time currency exchange rates and market analysis
- International money transfer guidance and cost optimization
- Cryptocurrency and traditional currency conversions
- Economic trends and their impact on exchange rates
- General financial questions and currency information
- Simple stop order setup (sell currency → buy currency at threshold)

ONLY if the user specifically mentions "stop order" or "stop orders", then you should help them set up trading parameters using our simple 4-parameter system.

For stop orders, ONLY ask for these 4 things:
1. What currency are you selling?
2. What currency do you want to buy?
3. How many coins are you selling?
4. What's your threshold percentage?

Do NOT ask about exchanges, entry prices, market prices, or other complex details.`;

      // Only include trading parameters if we're in trading mode OR if parameters are complete
      if (needsTradingParams || getMissingParams(tradingParams).length === 0) {
        systemPrompt += `

CURRENT TRADING PARAMETERS:`;
        
        if (getMissingParams(tradingParams).length === 0) {
          systemPrompt += `
- ✅ Sell Currency: ${tradingParams.sell_coin}
- ✅ Buy Currency: ${tradingParams.buy_coin}  
- ✅ Amount to Sell: ${tradingParams.no_of_sell_coins}
- ✅ Threshold Rate: ${tradingParams.threshold}

NOTE: The user has a COMPLETE stop order ready (${tradingParams.no_of_sell_coins} ${tradingParams.sell_coin} to ${tradingParams.buy_coin} at ${tradingParams.threshold} threshold). If they ask about general topics, you can mention this order and ask if they'd like to proceed with it.`;
        } else {
          systemPrompt += `
- Sell Currency: ${tradingParams.sell_coin || "Not specified"}
- Buy Currency: ${tradingParams.buy_coin || "Not specified"}  
- Amount to Sell: ${tradingParams.no_of_sell_coins || "Not specified"}
- Threshold Rate: ${tradingParams.threshold || "Not specified"}`;
        }
      }

      systemPrompt += `

COMMUNICATION STYLE:
- Be friendly, helpful, and conversational
- Answer questions naturally without being pushy
- For greetings like "hi" or "hello", respond warmly without asking for trading details
- Only mention trading parameters if the user asks about stop orders
- Keep responses focused but friendly, under 500 words
- Exchange rates fluctuate, so mention checking current rates when relevant

Remember: You're a helpful assistant first, trading setup assistant second (only when requested).`;

      // Create conversation history
      let conversationHistory = systemPrompt + "\n\nConversation:\n";
      messages.forEach((msg) => {
        if (msg.role === "user") {
          conversationHistory += `User: ${msg.content}\n`;
        } else if (msg.role === "system") {
          conversationHistory += `${msg.content}\n`;
        }
      });

      const result = await model.generateContent(conversationHistory);
      const response = await result.response;
      const text = response.text();

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "system",
          content: text || `Sorry, I'm having trouble understanding right now.`,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "system",
          content:
            "Some error has occurred. Please check your API key and try again, or verify that the currency markets are accessible.",
        },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === "user" && hasWelcomed) {
      // Get the last message
      const lastMessage = messages[messages.length - 1].content;
      
      // Check if user is asking about their previous order details
      const orderQuestions = [
        'what things did i give',
        'what did i set',
        'what are my parameters',
        'what was my order',
        'my previous order',
        'what did i fill',
        'my stop order'
      ];
      
      const isAskingAboutOrder = orderQuestions.some(q => 
        lastMessage.toLowerCase().includes(q)
      );
      
      if (isAskingAboutOrder && getMissingParams(tradingParams).length === 0) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "system",
            content: `Here are your current stop order details:

📋 **Your Stop Order:**
• Sell Currency: ${tradingParams.sell_coin}
• Buy Currency: ${tradingParams.buy_coin}
• Amount to Sell: ${tradingParams.no_of_sell_coins} ${tradingParams.sell_coin}
• Threshold Rate: ${tradingParams.threshold}

Would you like to proceed with creating this stop order? (Type "yes" to confirm or "no" to cancel)`,
          },
        ]);
        return;
      }
      
      // Check if user is confirming or canceling a completed stop order
      if (!needsTradingParams && getMissingParams(tradingParams).length === 0) {
        const lowerMessage = lastMessage.toLowerCase().trim();
        if (lowerMessage === "yes" || lowerMessage === "y" || lowerMessage === "confirm") {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: "✅ Stop order created successfully! Your order has been set up with the specified parameters. The system will monitor the market and execute when your threshold is reached.",
            },
          ]);
          // Reset parameters for next order
          setTradingParams({
            sell_coin: "",
            buy_coin: "",
            no_of_sell_coins: "",
            threshold: ""
          });
          return;
        } else if (lowerMessage === "no" || lowerMessage === "n" || lowerMessage === "cancel") {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: "❌ Stop order cancelled. No worries! Feel free to set up a new stop order anytime by saying 'stop order'.",
            },
          ]);
          // Reset parameters
          setTradingParams({
            sell_coin: "",
            buy_coin: "",
            no_of_sell_coins: "",
            threshold: ""
          });
          return;
        }
      }
      
      // Check if user is requesting trading setup
      if (checkForTradingRequest(lastMessage) && !needsTradingParams) {
        setNeedsTradingParams(true);
        
        // Extract any parameters from this initial message
        const extracted = extractTradingParams(lastMessage);
        console.log("Initial extracted params:", extracted, "from message:", lastMessage);
        
        let newParams = { ...tradingParams };
        if (Object.keys(extracted).length > 0) {
          // Update trading parameters if any were found
          Object.keys(extracted).forEach(key => {
            if (extracted[key as keyof typeof extracted]) {
              newParams[key as keyof TradingParams] = extracted[key as keyof typeof extracted] || "";
            }
          });
          setTradingParams(newParams);
        }
        
        // Check what's missing after initial extraction
        const missing = getMissingParams(newParams);
        console.log("Missing params after initial extraction:", missing);
        
        if (missing.length > 0) {
          // Generate question for the first missing parameter
          const question = generateMissingParamQuestion(missing, newParams);
          setLastQuestion(question);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: question,
            },
          ]);
        } else {
          // All parameters captured, show confirmation
          const confirmationMessage = `Perfect! Here's your stop order summary:

📋 **Stop Order Details:**
• Sell Currency: ${newParams.sell_coin}
• Buy Currency: ${newParams.buy_coin}
• Amount to Sell: ${newParams.no_of_sell_coins} ${newParams.sell_coin}
• Threshold Rate: ${newParams.threshold}

Would you like me to proceed with creating this stop order? (Type "yes" to confirm or "no" to cancel)`;
          
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: confirmationMessage,
            },
          ]);
          setNeedsTradingParams(false);
        }
        return;
      }
      
      // If we're in trading mode, handle parameter collection
      if (needsTradingParams) {
        // Check if user wants to cancel the trading setup
        const lowerMessage = lastMessage.toLowerCase().trim();
        if (lowerMessage === "cancel" || lowerMessage === "stop" || lowerMessage === "quit" || lowerMessage === "exit") {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: "❌ Stop order setup cancelled. No worries! Feel free to set up a new stop order anytime by saying 'stop order'.",
            },
          ]);
          // Reset all parameters and exit trading mode
          setTradingParams({
            sell_coin: "",
            buy_coin: "",
            no_of_sell_coins: "",
            threshold: ""
          });
          setNeedsTradingParams(false);
          setLastQuestion("");
          return;
        }
        
        const extracted = extractTradingParams(lastMessage, lastQuestion);
        console.log("Extracted params:", extracted, "from message:", lastMessage, "with context:", lastQuestion);
        
        // Update trading parameters if any were found
        let newParams = { ...tradingParams };
        
        // Always update parameters, even if empty object
        Object.keys(extracted).forEach(key => {
          if (extracted[key as keyof typeof extracted]) {
            newParams[key as keyof TradingParams] = extracted[key as keyof typeof extracted] || "";
          }
        });
        
        setTradingParams(newParams);
        console.log("Current trading params after update:", newParams);
          
        // Check if we still need more info
        const missing = getMissingParams(newParams);
        console.log("Missing params:", missing);
        if (missing.length > 0) {
          const question = generateMissingParamQuestion(missing, newParams);
          setLastQuestion(question); // Store the question for context
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: question,
            },
          ]);
        } else {
          // All parameters collected, show confirmation
          const confirmationMessage = `Perfect! Here's your stop order summary:

📋 **Stop Order Details:**
• Sell Currency: ${newParams.sell_coin}
• Buy Currency: ${newParams.buy_coin}
• Amount to Sell: ${newParams.no_of_sell_coins} ${newParams.sell_coin}
• Threshold Rate: ${newParams.threshold}

Would you like me to proceed with creating this stop order? (Type "yes" to confirm or "no" to cancel)`;
          
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              role: "system",
              content: confirmationMessage,
            },
          ]);
          setNeedsTradingParams(false);
        }
        return;
      } else {
        // Normal conversation mode - proceed with AI inference directly
        inference();
      }
    }
  }, [messages, hasWelcomed]);

  const sendMessage = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!userInput.trim()) return;
    let input = userInput;
    setUserInput("");

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: input },
    ]);
  };

  return (
    <div className="chat-container">
      <h2 style={{ marginTop: "5px" }}>{chatName}</h2>
      <TradingParams
        sellCoin={tradingParams.sell_coin}
        buyCoin={tradingParams.buy_coin}
        noOfSellCoins={tradingParams.no_of_sell_coins}
        threshold={tradingParams.threshold}
      />
      <ChatBox messages={messages} loading={loading} />
      <InputForm
        userInput={userInput}
        setUserInput={setUserInput}
        sendMessage={sendMessage}
      />
    </div>
  );
};

export default Chat;
