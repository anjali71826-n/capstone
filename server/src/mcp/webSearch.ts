import axios from 'axios';

export interface DestinationInfo {
  destination: string;
  query_type: string;
  content: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

// Fetch destination information from Wikipedia
async function fetchWikipediaInfo(destination: string, queryType: string): Promise<string> {
  try {
    // Extract city name (remove country if present)
    const cityName = destination.split(',')[0].trim();
    
    // Search for the page
    const searchResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: `${cityName} ${queryType === 'overview' ? '' : queryType}`,
        format: 'json',
        srlimit: 1,
      },
      timeout: 10000,
    });

    const searchResults = searchResponse.data.query?.search;
    if (!searchResults || searchResults.length === 0) {
      // Try just the city name
      const fallbackSearch = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: cityName,
          format: 'json',
          srlimit: 1,
        },
        timeout: 10000,
      });
      
      if (!fallbackSearch.data.query?.search?.length) {
        return `No Wikipedia information found for ${destination}`;
      }
    }

    const pageTitle = searchResults?.[0]?.title || cityName;

    // Get the page content
    const contentResponse = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: pageTitle,
        prop: 'extracts',
        exintro: queryType === 'overview',
        explaintext: true,
        format: 'json',
      },
      timeout: 10000,
    });

    const pages = contentResponse.data.query?.pages;
    if (!pages) {
      return `No content found for ${destination}`;
    }

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') {
      return `Wikipedia page not found for ${destination}`;
    }

    let content = pages[pageId].extract || '';
    
    // Limit content length
    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...';
    }

    return content;
  } catch (error) {
    console.error('Wikipedia fetch error:', error);
    throw error;
  }
}

// Fetch from Wikivoyage for travel-specific info
async function fetchWikivoyageInfo(destination: string, queryType: string): Promise<string> {
  try {
    const cityName = destination.split(',')[0].trim();
    
    const response = await axios.get('https://en.wikivoyage.org/w/api.php', {
      params: {
        action: 'query',
        titles: cityName,
        prop: 'extracts',
        explaintext: true,
        format: 'json',
      },
      timeout: 10000,
    });

    const pages = response.data.query?.pages;
    if (!pages) {
      return '';
    }

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') {
      return '';
    }

    let content = pages[pageId].extract || '';
    
    // Extract relevant section based on query type
    const sectionMap: Record<string, string[]> = {
      overview: ['understand', ''],
      attractions: ['see', 'do', 'attractions'],
      food: ['eat', 'drink', 'food'],
      culture: ['understand', 'respect', 'culture'],
      tips: ['stay safe', 'cope', 'get around'],
      neighborhoods: ['districts', 'areas', 'neighborhoods'],
    };

    const sections = sectionMap[queryType] || [''];
    
    // Try to find relevant section
    for (const section of sections) {
      if (!section) continue;
      const regex = new RegExp(`(?:^|\\n)(?:==\\s*)?${section}(?:\\s*==)?\\n([\\s\\S]*?)(?=\\n==|$)`, 'i');
      const match = content.match(regex);
      if (match && match[1]) {
        content = match[1].trim();
        break;
      }
    }

    // Limit content length
    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...';
    }

    return content;
  } catch (error) {
    console.error('Wikivoyage fetch error:', error);
    return '';
  }
}

export async function searchDestinationInfo(
  destination: string,
  queryType: string
): Promise<DestinationInfo> {
  const sources: Array<{ title: string; url: string }> = [];
  let combinedContent = '';
  
  // Try Wikivoyage first (better for travel)
  try {
    const wikivoyageContent = await fetchWikivoyageInfo(destination, queryType);
    if (wikivoyageContent && wikivoyageContent.length > 100) {
      combinedContent += wikivoyageContent;
      const cityName = destination.split(',')[0].trim();
      sources.push({
        title: `Wikivoyage - ${cityName}`,
        url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(cityName)}`,
      });
    }
  } catch (error) {
    console.warn('Wikivoyage error:', error);
  }

  // Also try Wikipedia for additional context
  try {
    const wikipediaContent = await fetchWikipediaInfo(destination, queryType);
    if (wikipediaContent && !combinedContent) {
      combinedContent = wikipediaContent;
    } else if (wikipediaContent && combinedContent.length < 500) {
      // Add Wikipedia content if Wikivoyage was limited
      combinedContent += '\n\n--- Additional Information ---\n\n' + wikipediaContent;
    }
    
    const cityName = destination.split(',')[0].trim();
    sources.push({
      title: `Wikipedia - ${cityName}`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cityName)}`,
    });
  } catch (error) {
    console.warn('Wikipedia error:', error);
  }

  // If no content found from any source
  if (!combinedContent) {
    combinedContent = `Unable to fetch detailed information for ${destination}. The AI will use general knowledge to help plan your trip. For the most accurate information, please verify details through official tourism websites.`;
  }

  return {
    destination,
    query_type: queryType,
    content: combinedContent,
    sources,
  };
}

export default searchDestinationInfo;
