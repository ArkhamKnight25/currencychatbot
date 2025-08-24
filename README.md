# UniSwap Currency - Universal Currency Exchange Assistant

A React + TypeScript + Vite application that provides AI-powered currency exchange assistance and real-time exchange rates using Google's Gemini API.

## Features

- Interactive chat interface for currency queries
- Real-time exchange rate information
- Multiple chat sessions with history
- Local storage for chat persistence
- Professional currency exchange assistant responses
- Universal currency support
- Responsive design

## Setup

1. **Clone the repository and install dependencies:**

   ```bash
   npm install
   ```

2. **Get a Gemini API key:**

   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy your API key

3. **Configure environment variables:**

   - Copy `.env.example` to `.env`
   - Replace `your_gemini_api_key_here` with your actual Gemini API key:

   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## API Integration

This application uses Google's Gemini 1.5 Flash model for generating currency exchange assistance. The AI is specifically prompted to:

- Provide accurate currency exchange information
- Offer real-time exchange rate insights
- Support all major world currencies
- Provide financial market analysis
- Maintain a professional and knowledgeable tone

## Development

### Tech Stack

- React 18
- TypeScript
- Vite
- Google Generative AI
- CSS Modules

### Project Structure

```
src/
├── components/
│   ├── Chat.tsx          # Main chat interface
│   ├── ChatBox.tsx       # Message display component
│   ├── ChatHistory.tsx   # Chat sessions sidebar
│   ├── InputForm.tsx     # Message input form
│   └── NavBar.tsx        # Navigation bar
├── App.tsx               # Main application component
└── main.tsx             # Application entry point
```

## Disclaimer

This application is for informational purposes only and should not replace professional financial advice. Currency exchange rates are subject to market fluctuations and actual rates may vary.
