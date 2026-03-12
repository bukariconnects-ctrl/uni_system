-- Add title column to chatbot_conversations for AI-generated conversation titles
ALTER TABLE chatbot_conversations
  ADD COLUMN IF NOT EXISTS title VARCHAR(200);
