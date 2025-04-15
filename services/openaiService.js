import axios from 'axios';
import { generateImage } from './imageService.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allowedSlugs = process.env.ALLOWED_SLUGS ? process.env.ALLOWED_SLUGS.split(',').map(s => s.trim()) : ['ai', 'tech', 'animanga', 'game'];

export async function fetchTrendingArticleFromOpenAI() {
  const now = new Date();
  const tanggal = now.getDate();
  const bulan = now.toLocaleString("id-ID", { month: "long" });
  const tahun = now.getFullYear();
  const topic = process.env.TOPIC || '';
  let inputQuery = '';
  if (topic) {
    inputQuery = `ambil artikel terbaru yang sesuai dengan salah satu tren tentang ${topic} pada ${tanggal} ${bulan} ${tahun}.

Berikan hasil dalam bentuk array of objects dengan properti berikut:
[
  {
    judul: string,
    artikel: string (minimal 500 kalimat),
    source: string (tautan asli sumber berita)
  }
]

Pastikan jawaban hanya JSON valid (tanpa karakter tambahan seperti \`\`\`json atau karakter apapun lainnya) agar dapat langsung di-parse dengan JSON.parse().`;
  } else {
    inputQuery = `Berikan 1 berita terbaru random pada ${tanggal} ${bulan} ${tahun}.

Berikan hasil dalam bentuk array of objects dengan properti berikut:
[
  {
    judul: string,
    artikel: string (minimal 500 kalimat),
    source: string (tautan asli sumber berita)
  }
]

Pastikan jawaban hanya JSON valid (tanpa karakter tambahan seperti \`\`\`json atau karakter apapun lainnya) agar dapat langsung di-parse dengan JSON.parse().`;
  }

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    tools: [{ type: "web_search_preview" }],
    input: inputQuery
  });

  const parsed = JSON.parse(response.output_text);
  return parsed[0];
}

export async function generatePost() {
  const { judul, artikel, source } = await fetchTrendingArticleFromOpenAI();
  const language = process.env.POST_LANGUAGE || 'id';
  let postPrompt = '';
  if (language === 'en') {
    postPrompt = `Rewrite the following article in English, with a minimum of 1000 words, using an active, engaging, and friendly tone.

Ensure:
- The context is maintained (if discussing a specific game/anime/technology, mention and provide details).
- Include the original reference link in the content (outbound link): ${source}
- Optimize for SEO using the title: "${judul}"
- Use a focus keyword based on the content.

Article:
${artikel}

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
- Tambahkan **tautan referensi asli** berikut di akhir atau dalam isi artikel (outbound link): ${source}
- Optimalkan untuk SEO menggunakan **judul**: "${judul}"
- Gunakan kata kunci fokus berdasarkan isi.

Artikel:
${artikel}

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

  return {
    title: args.title,
    content: args.content,
    categorySlug: process.env.CATEGORY || args.slug,
    metaDescription: args.meta_description,
    keywords: args.keywords,
    imageURL
  };
}