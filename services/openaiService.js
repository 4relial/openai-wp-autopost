import axios from 'axios';
import { generateImage } from './imageService.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allowedSlugs = process.env.ALLOWED_SLUGS ? process.env.ALLOWED_SLUGS.split(',').map(s => s.trim()) : ['ai', 'tech', 'animanga', 'game'];

export async function fetchTrendingArticleFromOpenAI() {
if (process.env.TYPE === 'newsapi' && process.env.NEWS_APIKEY) {
  // Read existing titles from JSON file
  const titlesFilePath = path.join(process.cwd(), 'used-titles-newsapi.json');
  let existingTitles = [];
  try {
    const titlesData = await fs.readFile(titlesFilePath, 'utf8');
    existingTitles = JSON.parse(titlesData);
  } catch (error) {
    // If file doesn't exist, create empty array
    await fs.writeFile(titlesFilePath, JSON.stringify([]));
  }

  const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_APIKEY}`);
  if (response.data.status === 'ok' && response.data.articles.length > 0) {
    // Filter out articles that have been used before
    const unusedArticles = response.data.articles.filter(article => 
      !existingTitles.includes(article.title)
    );

    if (unusedArticles.length === 0) {
      throw new Error('All available articles have been used');
    }

    // Get random article from unused articles
    const randomIndex = Math.floor(Math.random() * unusedArticles.length);
    const article = unusedArticles[randomIndex];

    // Save the used title
    existingTitles.push(article.title);
    await fs.writeFile(titlesFilePath, JSON.stringify(existingTitles, null, 2));

    return article.content || article.description;
  }
}

  const now = new Date();
  const tanggal = now.getDate();
  const bulan = now.toLocaleString("id-ID", { month: "long" });
  const tahun = now.getFullYear();
  const topic = process.env.TOPIC || '';

  // Read existing titles from JSON file
  const titlesFilePath = path.join(process.cwd(), 'used-titles.json');
  let existingTitles = [];
  try {
    const titlesData = await fs.readFile(titlesFilePath, 'utf8');
    existingTitles = JSON.parse(titlesData);
  } catch (error) {
    // If file doesn't exist, create empty array
    await fs.writeFile(titlesFilePath, JSON.stringify([]));
  }

  let inputQuery = '';
  if (topic) {
    inputQuery = `ambil artikel terbaru dalam 500 kata yang sesuai dengan salah satu tren tentang ${topic} pada ${tanggal} ${bulan} ${tahun}, selain berita yang ada di dalam list berikut:
${JSON.stringify(existingTitles)}`;
  } else {
    inputQuery = `Berikan 1 berita terbaru random dalam 500 kata pada ${tanggal} ${bulan} ${tahun}, selain berita yang ada di dalam list berikut:
${JSON.stringify(existingTitles)}`;
  }

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: inputQuery
  });

  const result = response.output_text

  return result;
}

export async function generatePost() {
  const post = await fetchTrendingArticleFromOpenAI();
  const language = process.env.POST_LANGUAGE || 'id';
  let postPrompt = '';
  if (language === 'en') {
    postPrompt = `Rewrite the following article in English, with a minimum of 1000 words, using an active, engaging, and friendly tone.

Ensure:
- The context is maintained (if discussing a specific game/anime/technology, mention and provide details).
- Optimize for SEO using the title by the article.
- Use a focus keyword based on the content.

Article:
${post}

Format the output in JSON with the following structure:
- title
- content (HTML)
- slug (${allowedSlugs.join(', ')})
- meta_description (max 160 characters, including keyword)
- keywords (array)
- image_prompt (in English, vivid visual description)
- focus_keyphrase
- image_alt_text (including keyword)`;
  } else {
    postPrompt = `Tulis ulang artikel berikut **dalam Bahasa Indonesia** sepanjang **minimal 1000 kata** dengan gaya aktif, humanis, dan ramah pembaca.

Pastikan:
- Fokus tidak keluar konteks (jika membahas game/anime/teknologi tertentu, sebutkan dan jelaskan secara lengkap).
- Tetap menyebutkan topik utama seperti nama game/anime/AI yang dimaksud.
- Optimalkan untuk SEO menggunakan artikel yang diberikan.
- Gunakan kata kunci fokus berdasarkan isi.

Artikel:
${post}

Format hasil dalam JSON dengan struktur berikut:
- title
- content (HTML)
- slug (${allowedSlugs.join(', ')})
- meta_description (maks 160 karakter, mengandung keyword)
- keywords (array)
- image_prompt (dalam Bahasa Inggris, deskripsi visual yang vivid)
- focus_keyphrase
- image_alt_text (mengandung keyword)`;
  }

  const systemMessage = language === 'en'
    ? "You are a professional SEO blog writer for technology and entertainment websites."
    : "Anda adalah penulis blog SEO profesional untuk situs teknologi dan hiburan.";

  const openAIResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'o3-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: postPrompt }
      ],
      function_call: { name: 'generate_blog_post' },
      functions: [
        {
          name: 'generate_blog_post',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              slug: { type: 'string', enum: allowedSlugs },
              meta_description: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              image_prompt: { type: 'string' },
              focus_keyphrase: { type: 'string' },
              image_alt_text: { type: 'string' }
            },
            required: ['title', 'content', 'slug', 'meta_description', 'keywords', 'image_prompt', 'focus_keyphrase', 'image_alt_text']
          }
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const args = JSON.parse(openAIResponse.data.choices[0].message.function_call.arguments);
  let imageURL = null;
  if (process.env.FLUX_API_KEY) {
    imageURL = await generateImage(args.image_prompt);
  }
  // Read existing titles from JSON file
  const titlesFilePath = path.join(process.cwd(), 'used-titles.json');
  let existingTitles = [];
  try {
    const titlesData = await fs.readFile(titlesFilePath, 'utf8');
    existingTitles = JSON.parse(titlesData);
  } catch (error) {
    // If file doesn't exist, create empty array
    await fs.writeFile(titlesFilePath, JSON.stringify([]));
  }

  existingTitles.push(args.title);
  await fs.writeFile(titlesFilePath, JSON.stringify(existingTitles, null, 2));

  return {
    title: args.title,
    content: args.content,
    categorySlug: process.env.CATEGORY || args.slug,
    metaDescription: args.meta_description,
    keywords: args.keywords,
    imageURL
  };
}