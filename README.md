# Talwinder - Grapevine Idea Sponsorship Bot

Talwinder is an AI-powered WhatsApp chatbot designed for Grapevine's internal use. It helps employees pitch ideas, evaluates them against the company charter, and matches them with the right sponsors.

## Features

- **Idea Evaluation**: Analyzes ideas for alignment with Grapevine's principals.
- **Sponsorship Matching**: Suggests the best sponsor within the company for any given idea.
- **Motivating Bro Personality**: Supportive and encouraging feedback, even for ideas that aren't a fit.
- **Internal Dashboard Ready**: Tracks user-level stats like idea count, frequency, and quality rating.
- **WhatsApp Native**: Built on the Meta Cloud API for seamless internal communication.

## Tech Stack

- **Node.js** & **Express.js**
- **Google Gemini 1.5 Pro** (AI Engine)
- **PostgreSQL** (Database)
- **Sequelize ORM**
- **Meta Cloud API** (WhatsApp)

## Quick Start

1.  **Clone the repo**.
2.  **Install dependencies**: `npm install`
3.  **Setup Environment**: Copy `.env.example` to `.env` and fill in your keys.
4.  **Migrate Database**: `npm run db:migrate`
5.  **Start the bot**: `npm run dev`

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).
