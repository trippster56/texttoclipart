const fs = require('fs/promises');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const layoutImport = "import Layout from '../components/Layout';\n";

// List of pages to update
const pages = [
  'AboutPage.tsx',
  'BlogPage.tsx',
  'ContactPage.tsx',
  'CreatePage.tsx',
  'ExplorePage.tsx',
  'FaqPage.tsx',
  'HowItWorksPage.tsx',
  'LoginPage.tsx',
  'PricingPage.tsx',
  'PrivacyPage.tsx',
  'SignupPage.tsx',
  'TermsPage.tsx'
];

// Update pages to use Layout component instead of Navbar
async function updatePages() {
  for (const page of pages) {
  const filePath = path.join(pagesDir, page);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove Navbar import and usage
    content = content.replace(/import Navbar from ['"]\.\.\/components\/Navigation\/Navbar['"];?\n?/g, '');
    content = content.replace(/<Navbar \/>\n?/g, '');
    
    // Add Layout import if not already present
    if (!content.includes('import Layout')) {
      content = layoutImport + content;
    }
    
  }
}

updatePages().then(() => {
  console.log('All pages updated successfully!');
}).catch(error => {
  console.error('Error updating pages:', error);
  process.exit(1);
});
