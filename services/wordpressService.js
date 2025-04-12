import axios from 'axios';
import btoa from 'btoa';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

export async function uploadImageToWordPress(imageUrl, imageName = 'featured-image.jpg') {
  const auth = btoa(`${process.env.WP_USER}:${process.env.WP_PASSWORD}`);
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.buffer();

  const form = new FormData();
  form.append('file', imageBuffer, imageName);

  const res = await fetch(`${process.env.WP_URL}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      ...form.getHeaders()
    },
    body: form
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const data = await res.json();
  return data.id;
}

export async function getCategoryId(slug) {
  try {
    const auth = btoa(`${process.env.WP_USER}:${process.env.WP_PASSWORD}`);
    const res = await axios.get(`${process.env.WP_URL}/wp-json/wp/v2/categories?slug=${slug}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    return res.data.length > 0 ? res.data[0].id : null;
  } catch (err) {
    console.error('Error fetching category:', err.message);
    return null;
  }
}

export async function postToWordPress({ title, content, categoryId, metaDescription, keywords, imageURL }) {
  const auth = btoa(`${process.env.WP_USER}:${process.env.WP_PASSWORD}`);
  let featuredMediaId = null;

  if (imageURL) {
    try {
      featuredMediaId = await uploadImageToWordPress(imageURL);
    } catch (err) {
      console.warn('⚠️ Failed to upload featured image:', err.message);
    }
  }

  try {
    const res = await axios.post(
      `${process.env.WP_URL}/wp-json/wp/v2/posts`,
      {
        title,
        content,
        status: 'publish',
        categories: [categoryId],
        featured_media: featuredMediaId || undefined,
        meta: {
          _yoast_wpseo_metadesc: metaDescription,
          _yoast_wpseo_focuskw: keywords.join(', ')
        }
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Posted to WordPress: ${res.data.link}`);
  } catch (error) {
    console.error('❌ Error posting to WordPress:', error.response?.data || error.message);
  }
}