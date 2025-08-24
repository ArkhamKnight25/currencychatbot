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
    
    // Normalize currency names and validate known currencies
    const normalizeCurrency = (currency: string): string => {
      const currencyMap: { [key: string]: string } = {
        'bitcoin': 'BTC',
        'btc': 'BTC',
        'ethereum': 'ETH',
        'eth': 'ETH',
        'litecoin': 'LTC',
        'ltc': 'LTC',
        'ripple': 'XRP',
        'xrp': 'XRP',
        'cardano': 'ADA',
        'ada': 'ADA',
        'polkadot': 'DOT',
        'dot': 'DOT',
        'chainlink': 'LINK',
        'link': 'LINK',
        'solana': 'SOL',
        'sol': 'SOL',
        'dogecoin': 'DOGE',
        'doge': 'DOGE',
        'usdc': 'USDC',
        'usd coin': 'USDC',
        'usdt': 'USDT',
        'tether': 'USDT',
        'dollar': 'USD',
        'dollars': 'USD',
        'usd': 'USD',
        'euro': 'EUR',
        'euros': 'EUR',
        'eur': 'EUR',
        'pound': 'GBP',
        'pounds': 'GBP',
        'gbp': 'GBP',
        'yen': 'JPY',
        'jpy': 'JPY'
      };
      
      const normalized = currencyMap[currency.toLowerCase()];
      if (normalized) {
        return normalized;
      }
      
      // Only return uppercase if it's likely a known currency (3-4 chars)
      if (currency.length >= 3 && currency.length <= 4 && /^[A-Za-z]+$/.test(currency)) {
        return currency.toUpperCase();
      }
      
      return ''; // Return empty for invalid currencies
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
        const currency = normalizeCurrency(currencyOnly[1]);
        if (currency) {
          if (lastQuestion.toLowerCase().includes('selling') || lastQuestion.toLowerCase().includes('sell')) {
            extracted.sell_coin = currency;
            return extracted;
          } else if (lastQuestion.toLowerCase().includes('buying') || lastQuestion.toLowerCase().includes('buy')) {
            extracted.buy_coin = currency;
            return extracted;
          }
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
    
    // Extract threshold from percentage mentions - improved patterns
    const thresholdPatterns = [
      /(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%?\s*threshold/i,
      /threshold.*?(?:about\s+)?(?:a\s+)?(\d+(?:\.\d+)?)%?/i,
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
        break;
      }
    }
    
    // Extract sell_coin and amount - improved patterns
    const sellPatterns = [
      // Pattern for "sell 50 ETH" - captures both amount and currency
      /(?:sell|selling|want\s+to\s+sell|wanna\s+sell)\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{3,})/i,
      // Pattern for "protect my 50 usdc" - captures both amount and currency
      /protect\s+my\s+(\d+(?:\.\d+)?)\s*([A-Za-z]{3,})/i,
      // Pattern for "50 ETH" when context suggests selling
      /(\d+(?:\.\d+)?)\s*([A-Za-z]{3,})(?:\s+to\s+buy|\s+for|\s+into)/i,
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
      /stop\s+loss\s+my\s+([A-Za-z]{3,})/i
    ];
    
    for (const pattern of sellPatterns) {
      const match = input.match(pattern);
      if (match) {
        if (pattern.source.includes('(\\d+')) {
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
    
    // Extract buy_coin - multiple patterns
    const buyPatterns = [
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

You can help with:
- Real-time currency exchange rates and market analysis
- International money transfer guidance and cost optimization
- Cryptocurrency and traditional currency conversions
- Economic trends and their impact on exchange rates
- General financial questions and currency information
- Casual conversation about finance and markets

IMPORTANT: You are a helpful assistant that can discuss ANY topic, not just trading parameters. Be conversational and friendly.

ONLY if the user specifically mentions "stop order" or "stop orders", then you should help them set up trading parameters. Otherwise, just have normal helpful conversations.`;

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
