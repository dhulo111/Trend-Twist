import { useEffect } from 'react';

/**
 * Custom hook to dynamically update document title and meta tags for SEO.
 * @param {string} title - The title of the page.
 * @param {string} description - The meta description of the page.
 * @param {string} type - The Open Graph type (e.g., 'website', 'article', 'video').
 * @param {string} image - A URL to the Open Graph image.
 */
const useSEO = (title, description, type = 'website', image = '') => {
  useEffect(() => {
    const formattedTitle = title ? `${title} • Trend Twist` : 'Trend Twist';
    
    // Update Title
    document.title = formattedTitle;

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || 'Discover the latest trends on Trend Twist.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description || 'Discover the latest trends on Trend Twist.';
      document.head.appendChild(meta);
    }

    // Update Open Graph (OG) Tags
    const updateOGTag = (property, content) => {
      if (!content) return;
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    updateOGTag('og:title', formattedTitle);
    updateOGTag('og:description', description || 'Discover the latest trends on Trend Twist.');
    updateOGTag('og:type', type);
    if (image) updateOGTag('og:image', image);

    // Optional: Reset title when component unmounts
    return () => {
      document.title = 'Trend Twist';
    };
  }, [title, description, type, image]);
};

export default useSEO;
