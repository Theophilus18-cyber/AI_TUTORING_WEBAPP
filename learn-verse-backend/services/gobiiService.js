// services/gobiiService.js
// Mock Gobii service for testing - replace with actual import when resolved
// import Gobii from '@gobii-ai/client';

const GOBII_API_KEY = process.env.GOBII_API_KEY || 'np1hPpzFzBI7ezeN-xzQBYCAjF-Vq-zVqroDxvP9x7Y';

// Mock Gobii class for testing
class MockGobii {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.visual = config.visual;
  }
  
  async createSession() {
    return new MockSession();
  }
}

class MockSession {
  async open(url) {
    console.log(`Mock: Opening ${url}`);
    return Promise.resolve();
  }
  
  async waitForSelector(selector, options) {
    console.log(`Mock: Waiting for selector ${selector}`);
    return Promise.resolve();
  }
  
  async $(selector) {
    console.log(`Mock: Finding element ${selector}`);
    return null; // Return null to simulate no element found
  }
  
  async $$(selector) {
    console.log(`Mock: Finding elements ${selector}`);
    return [];
  }
  
  async $$eval(selector, callback) {
    console.log(`Mock: Evaluating ${selector}`);
    return [];
  }
  
  async type(element, text) {
    console.log(`Mock: Typing "${text}"`);
    return Promise.resolve();
  }
  
  async click(selector) {
    console.log(`Mock: Clicking ${selector}`);
    return Promise.resolve();
  }
  
  async wait(ms) {
    console.log(`Mock: Waiting ${ms}ms`);
    return Promise.resolve();
  }
  
  async download(url) {
    console.log(`Mock: Downloading ${url}`);
    return Promise.resolve();
  }
  
  async close() {
    console.log(`Mock: Closing session`);
    return Promise.resolve();
  }
}

const gobii = new MockGobii({
  apiKey: GOBII_API_KEY,
  visual: true // Enable visual browser
});

async function performTask({ website, grade, subject, year, taskType, customQuery }) {
  console.log(`Starting Gobii task: ${taskType} for ${subject} grade ${grade} year ${year}`);
  
  const session = await gobii.createSession();
  
  try {
    await session.open(website);
    console.log(`Opened website: ${website}`);

    // Handle different task types
    if (taskType === 'exam_papers') {
      return await handleExamPapersTask(session, { grade, subject, year });
    } else if (taskType === 'search_resources') {
      return await handleSearchResourcesTask(session, { subject, customQuery });
    } else {
      // Fallback for custom queries
      return await handleCustomTask(session, { customQuery });
    }
  } catch (error) {
    console.error('Gobii task error:', error);
    return { 
      success: false, 
      message: `Task failed: ${error.message}`,
      error: error.message 
    };
  } finally {
    await session.close();
  }
}

async function handleExamPapersTask(session, { grade, subject, year }) {
  console.log(`Searching for ${subject} exam papers grade ${grade} year ${year}`);
  
  try {
    // Navigate to the exam papers section
    await session.waitForSelector('body', { timeout: 10000 });
    
    // Try to find search functionality
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="search" i]',
      'input[name*="search" i]',
      '.search-input',
      '#search'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        searchInput = await session.$(selector);
        if (searchInput) break;
      } catch (e) {
        continue;
      }
    }
    
    if (searchInput) {
      const searchQuery = `${grade} ${subject} ${year} past papers`;
      await session.type(searchInput, searchQuery);
      console.log(`Typed search query: ${searchQuery}`);
      
      // Try to submit search
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.search-button',
        'button:contains("Search")'
      ];
      
      for (const selector of submitSelectors) {
        try {
          await session.click(selector);
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Wait for results
      await session.wait(3000);
    }
    
    // Look for download links
    const downloadSelectors = [
      'a[href*=".pdf" i]',
      'a[href*="download" i]',
      '.download-link',
      'a[download]',
      'button:contains("Download")'
    ];
    
    let links = [];
    for (const selector of downloadSelectors) {
      try {
        const elements = await session.$$(selector);
        if (elements.length > 0) {
          links = await session.$$eval(selector, els => 
            els.map(el => ({
              href: el.href || el.getAttribute('href'),
              text: el.textContent?.trim() || '',
              download: el.getAttribute('download') || ''
            }))
          );
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Filter links by subject and year
    const filteredLinks = links.filter(link => {
      const linkText = (link.text + ' ' + link.href).toLowerCase();
      return linkText.includes(subject.toLowerCase()) || 
             linkText.includes(year) ||
             linkText.includes(grade);
    });
    
    console.log(`Found ${filteredLinks.length} relevant download links`);
    
    // Download files
    const downloadedFiles = [];
    for (const link of filteredLinks.slice(0, 5)) { // Limit to 5 downloads
      try {
        if (link.href) {
          await session.download(link.href);
          downloadedFiles.push(link);
          console.log(`Downloaded: ${link.text || link.href}`);
        }
      } catch (e) {
        console.error(`Failed to download ${link.href}:`, e.message);
      }
    }
    
    // For mock testing, return simulated results
    return {
      success: true,
      links: [
        {
          href: `https://example.com/${subject}-grade-${grade}-${year}.pdf`,
          text: `${subject} Grade ${grade} ${year} Past Paper`,
          download: `${subject}-grade-${grade}-${year}.pdf`
        }
      ],
      message: `Successfully downloaded 1 ${subject} exam papers for grade ${grade} (${year})`,
      totalFound: 1,
      downloaded: 1,
      mock: true // Indicate this is a mock result
    };
    
  } catch (error) {
    console.error('Exam papers task error:', error);
    return {
      success: false,
      message: `Failed to download exam papers: ${error.message}`,
      error: error.message
    };
  }
}

async function handleSearchResourcesTask(session, { subject, customQuery }) {
  console.log(`Searching for ${subject} resources`);
  
  try {
    // Navigate to Google or educational search
    await session.open('https://www.google.com');
    
    const searchQuery = customQuery || `educational resources ${subject} teaching materials`;
    await session.type('input[name="q"]', searchQuery);
    await session.click('input[name="btnK"]');
    
    await session.wait(3000);
    
    // For mock testing, return simulated results
    const mockResults = [
      {
        title: `${subject} Educational Resources`,
        link: `https://example.com/${subject}-resources`
      },
      {
        title: `${subject} Teaching Materials`,
        link: `https://example.com/${subject}-materials`
      }
    ];
    
    return {
      success: true,
      results: mockResults,
      message: `Found ${mockResults.length} educational resources for ${subject}`,
      searchQuery,
      mock: true // Indicate this is a mock result
    };
    
  } catch (error) {
    console.error('Search resources task error:', error);
    return {
      success: false,
      message: `Failed to search resources: ${error.message}`,
      error: error.message
    };
  }
}

async function handleCustomTask(session, { customQuery }) {
  console.log(`Performing custom task: ${customQuery}`);
  
  try {
    // Navigate to Google for custom search
    await session.open('https://www.google.com');
    await session.type('input[name="q"]', customQuery);
    await session.click('input[name="btnK"]');
    
    await session.wait(3000);
    
    // For mock testing, return simulated results
    const mockResults = [
      {
        title: `Search Results for: ${customQuery}`,
        link: `https://example.com/search-results`
      }
    ];
    
    return {
      success: true,
      results: mockResults,
      message: `Found ${mockResults.length} results for: ${customQuery}`,
      customQuery,
      mock: true // Indicate this is a mock result
    };
    
  } catch (error) {
    console.error('Custom task error:', error);
    return {
      success: false,
      message: `Failed to perform custom task: ${error.message}`,
      error: error.message
    };
  }
}

export { performTask }; 