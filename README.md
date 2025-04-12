# Wordpress AI Auto Publisher

This repository automates the process of generating and posting trending blog articles to WordPress. It leverages the OpenAI API for content generation and can optionally generate images using the RunWare API when the FLUX_API_KEY is provided.

## Features
- Fetch trending article information based on the current month and year.
- Generate a full blog post based on trending topics using OpenAI's GPT model.
- Optionally generate an image using the RunWare API (requires FLUX_API_KEY).
- Upload the generated image and post content to a WordPress site.
- Modular architecture for scalability and ease of maintenance.

## Project Structure
- `index.js`: Main entry point that schedules and handles the posting job.
- `services/openaiService.js`: Handles OpenAI integration to fetch trending articles and generate blog posts.
- `services/imageService.js`: Handles image generation via RunWare API.
- `services/wordpressService.js`: Handles WordPress integration for uploading images and posting content.
- `.env`: Environment file that contains sensitive configuration settings.

## Setup
1. Clone the repository:
   ```
   git clone <repository_url>
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key       # Get your API key at https://platform.openai.com/account/api-keys
   FLUX_API_KEY=your_runware_api_key        # If you want to use the image generation feature, register for an API key at https://runware.ai
   WP_USER=your_wordpress_username
   WP_PASSWORD=your_wordpress_app_password  # Create an "application password" in the WordPress dashboard or use a standard password (not recommended)
   WP_URL=https://your-wordpress-site.com
   POST_LANGUAGE=en                         # Set 'id' for Indonesian or 'en' for English
   ALLOWED_SLUGS=ai,tech,animanga,game       # List of allowed slugs for posts
   TOPIC=your_topic                         # Optional: specific topic for trending news search
   SCHEDULE=0 9 * * *, 0 13 * * *, 0 18 * * * # Cron schedule for posting, ex: runs at 9 AM, 1 PM, and 6 PM every day
   ```
4. Run the application:
   ```
   node index.js
   ```
