import dotenv from 'dotenv';
dotenv.config();

import schedule from 'node-schedule';
import { generatePost } from './services/openaiService.js';
import { getCategoryId, postToWordPress } from './services/wordpressService.js';

const scheduleEnv = process.env.SCHEDULE || '0 13 * * *';
const scheduleList = scheduleEnv.split(',').map(s => s.trim());
scheduleList.forEach(scheduleExp => {
  schedule.scheduleJob(scheduleExp, async () => {
    try {
      const { title, content, categorySlug, metaDescription, keywords, imageURL } = await generatePost();
      const categoryId = await getCategoryId(categorySlug);
  
      console.log(`📝 Title: ${title}`);
      console.log(`📂 Category: ${categorySlug} → ID ${categoryId}`);
      console.log(`🔍 Meta: ${metaDescription}`);
      console.log(`🏷️ Keywords: ${keywords.join(', ')}`);
      console.log(`🖼️ Image: ${imageURL}`);
  
      if (categoryId) {
        await postToWordPress({ title, content, categoryId, metaDescription, keywords, imageURL });
      } else {
        console.error('✋ Category not found. Aborting post.');
      }
    } catch (err) {
      console.error('🚨 Unexpected Error:', err.message);
    }
  });
});