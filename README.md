# Assembly Code Editor with AI Integration

An intelligent assembly code editor built with React and powered by Google's Gemini AI. This editor provides real-time code suggestions, automatic commenting, and logical error detection for various assembly architectures including 8051, ARM, and x86.

## Features

- Real-time code editing with syntax highlighting
- Architecture selection (8051, ARM, x86)
- Line numbers and modern editor features
- AI-powered code suggestions
- Automatic code commenting
- Logical error detection and correction suggestions
- Modern and intuitive user interface

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Gemini API key (Get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the URL shown in the terminal

## Usage

1. When you first open the application, you'll be prompted to enter your Gemini API key
2. Select your target architecture from the dropdown menu
3. Start writing assembly code in the editor
4. The editor will automatically:
   - Generate comments for your code
   - Provide suggestions for the next lines
   - Detect logical errors in your code
5. Use the "Get Suggestion" button to receive AI-powered code suggestions
6. Use the "Check Errors" button to analyze your code for logical errors
7. Accept or reject suggestions using the notification buttons

## Technologies Used

- React
- TypeScript
- Monaco Editor
- Material-UI
- Google Gemini AI
- Vite

## Note

Make sure to keep your Gemini API key secure and never commit it to version control.
