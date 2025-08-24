# Trading Parameters Usage Guide

## How to Use the Improved Trading Parameters Feature

The UniSwap Currency application now intelligently processes each user response and only asks for missing parameters. It also recognizes common currency names like "bitcoin" and converts them to standard symbols.

### Key Improvements ✨

1. **Smart Currency Recognition**: "bitcoin" → "BTC", "ethereum" → "ETH", etc.
2. **Incremental Parameter Collection**: Only asks for what's still missing
3. **Contextual Questions**: Questions reference already provided parameters

## Example Conversation Flow

### Scenario 1: Incremental Collection
```
User: "I want to sell bitcoin"
Bot: "What currency do you want to buy with your BTC?"

User: "USD"
Bot: "How many BTC are you selling?"

User: "5"  
Bot: "What's your target exchange rate for BTC to USD?"

User: "50000"
Bot: [Proceeds with full analysis]
```

### Scenario 2: Complete Request
```
User: "Sell 10 ethereum for USD at 3000"
Bot: [Immediately provides analysis with all parameters]
```

### Scenario 3: Partial Information
```
User: "Convert 100 coins to USDC"
Bot: "I need a few more details:
- Which currency are you selling?
- What's your target exchange rate?"
```

## Supported Currency Names

### Cryptocurrencies
- bitcoin → BTC
- ethereum → ETH  
- litecoin → LTC
- ripple → XRP
- cardano → ADA
- polkadot → DOT
- chainlink → LINK
- solana → SOL
- dogecoin → DOGE

### Fiat Currencies  
- dollar/dollars → USD
- euro/euros → EUR
- pound/pounds → GBP
- yen → JPY

## Advanced Patterns

### Sell Currency Detection
- "sell bitcoin", "selling BTC", "wanna sell ethereum"
- "from USD", "exchange bitcoin", "convert ETH"

### Buy Currency Detection
- "buy USD", "to ethereum", "for BTC"
- "into USDC", "get SOL", "want to buy bitcoin"

### Amount Detection
- "100 coins", "5.5 tokens", "amount 50"
- "quantity 25", "10 BTC", "sell 100 ethereum"

### Threshold Detection
- "threshold 50000", "when rate reaches 3000"
- "target price 100", "limit 200", "at 1.5"

## Intelligent Flow

The system now:
1. **Extracts** any parameters from your message
2. **Updates** the trading parameters display
3. **Asks only** for remaining missing parameters
4. **Provides contextual** questions based on what you've already shared
5. **Proceeds** with AI analysis once all parameters are collected

This creates a much more natural conversation flow! 🎯
