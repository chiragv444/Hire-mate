import requests
from bs4 import BeautifulSoup
import re
import spacy
from typing import Dict, List, Any, Optional
import json
from urllib.parse import urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import time
from textblob import TextBlob
from fuzzywuzzy import fuzz

class JobScraper:
    def __init__(self):
        # Load spaCy model for NLP processing
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            import os
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
        
        # Headers for web scraping
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Job-related keywords for extraction
        self.job_keywords = {
            'skills': ['python', 'javascript', 'java', 'react', 'angular', 'vue', 'node.js', 'sql', 'aws', 'docker', 'kubernetes'],
            'experience_levels': ['entry level', 'junior', 'mid level', 'senior', 'lead', 'principal', 'architect'],
            'job_types': ['full time', 'part time', 'contract', 'freelance', 'remote', 'hybrid'],
            'industries': ['technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing']
        }
    
    async def scrape_linkedin_job(self, url: str) -> Dict[str, Any]:
        """Scrape job information from LinkedIn job URL with multiple fallback methods"""
        try:
            # Validate LinkedIn URL
            if not self._is_valid_linkedin_job_url(url):
                raise ValueError("Invalid LinkedIn job URL")
            
            # Extract job ID and construct direct job URL if needed
            processed_url = self._process_linkedin_url(url)
            
            job_data = None
            
            # Method 1: Try Selenium for dynamic content
            try:
                job_data = await self._scrape_with_selenium(processed_url)
                if job_data and job_data.get('description'):
                    return job_data
            except Exception as e:
                print(f"Selenium scraping failed: {e}")
            
            # Method 2: Fallback to requests + BeautifulSoup
            try:
                job_data = await self._scrape_with_requests(processed_url)
                if job_data and job_data.get('description'):
                    return job_data
            except Exception as e:
                print(f"Requests scraping failed: {e}")
            
            # Method 3: If both fail, return basic structure with URL
            return {
                'title': 'Job Title (Could not extract)',
                'company': 'Company (Could not extract)',
                'location': 'Location (Could not extract)',
                'description': f'Could not extract job description from LinkedIn URL: {url}. Please paste the job description manually.',
                'requirements': [],
                'benefits': [],
                'salary_range': None,
                'job_type': None,
                'experience_level': None,
                'scraping_error': True
            }
            
        except Exception as e:
            raise Exception(f"Error scraping LinkedIn job: {str(e)}")
    
    async def _scrape_with_selenium(self, url: str) -> Dict[str, Any]:
        """Scrape using Selenium for dynamic content"""
        driver = None
        try:
            # Setup Chrome options
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument(f"user-agent={self.headers['User-Agent']}")
            
            # Initialize driver
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Load the page
            driver.get(url)
            
            # Wait for content to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            # Additional wait for dynamic content
            time.sleep(3)
            
            # Get page source and parse
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Extract job information
            job_data = {
                'title': self._extract_job_title(soup),
                'company': self._extract_company_name(soup),
                'location': self._extract_location(soup),
                'description': self._extract_job_description(soup),
                'requirements': self._extract_requirements(soup),
                'benefits': self._extract_benefits(soup),
                'salary_range': self._extract_salary_info(soup),
                'job_type': self._extract_job_type(soup),
                'experience_level': self._extract_experience_level(soup)
            }
            
            return job_data
            
        finally:
            if driver:
                driver.quit()
    
    async def _scrape_with_requests(self, url: str) -> Dict[str, Any]:
        """Fallback scraping using requests"""
        # Make request to LinkedIn
        response = requests.get(url, headers=self.headers, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract job information
        job_data = {
            'title': self._extract_job_title(soup),
            'company': self._extract_company_name(soup),
            'location': self._extract_location(soup),
            'description': self._extract_job_description(soup),
            'requirements': self._extract_requirements(soup),
            'benefits': self._extract_benefits(soup),
            'salary_range': self._extract_salary_info(soup),
            'job_type': self._extract_job_type(soup),
            'experience_level': self._extract_experience_level(soup)
        }
        
        return job_data
    
    def _is_valid_linkedin_job_url(self, url: str) -> bool:
        """Validate if URL is a LinkedIn job URL"""
        try:
            parsed = urlparse(url)
            is_linkedin_domain = parsed.netloc in ['www.linkedin.com', 'linkedin.com']
            
            # Support multiple LinkedIn job URL patterns:
            # - /jobs/view/123456789
            # - /jobs/collections/recommended/?currentJobId=123456789
            # - /jobs/search/results/?currentJobId=123456789
            has_job_path = (
                '/jobs/view/' in parsed.path or
                '/jobs/collections/' in parsed.path or
                '/jobs/search/' in parsed.path or
                'currentJobId=' in parsed.query
            )
            
            return is_linkedin_domain and has_job_path
        except:
            return False
    
    def _process_linkedin_url(self, url: str) -> str:
        """Process LinkedIn URL to extract job ID and construct direct job URL"""
        try:
            parsed = urlparse(url)
            
            # If URL has currentJobId parameter, extract it
            if 'currentJobId=' in parsed.query:
                query_params = parse_qs(parsed.query)
                job_id = query_params.get('currentJobId', [None])[0]
                if job_id:
                    return f"https://www.linkedin.com/jobs/view/{job_id}"
            
            # If it's already a direct job view URL, return as is
            if '/jobs/view/' in parsed.path:
                return url
            
            # For other formats, return original URL
            return url
            
        except Exception:
            return url
    
    def _extract_job_title(self, soup: BeautifulSoup) -> str:
        """Extract job title from LinkedIn page"""
        # Try multiple selectors for job title
        selectors = [
            'h1[class*="job-title"]',
            'h1[class*="title"]',
            '.job-title',
            '.title',
            'h1'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        return "Job Title Not Found"
    
    def _extract_company_name(self, soup: BeautifulSoup) -> str:
        """Extract company name from LinkedIn page"""
        selectors = [
            '.company-name',
            '.employer-name',
            '[class*="company"]',
            '[class*="employer"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        return "Company Not Found"
    
    def _extract_location(self, soup: BeautifulSoup) -> str:
        """Extract job location from LinkedIn page"""
        selectors = [
            '.job-location',
            '.location',
            '[class*="location"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        return "Location Not Found"
    
    def _extract_job_description(self, soup: BeautifulSoup) -> str:
        """Extract job description from LinkedIn page"""
        selectors = [
            '.job-description',
            '.description',
            '[class*="description"]',
            '.job-details'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text().strip()
                if text:
                    return text
        
        # Fallback: try to find any large text block
        paragraphs = soup.find_all('p')
        description_parts = []
        
        for p in paragraphs:
            text = p.get_text().strip()
            if len(text) > 50:  # Only include substantial paragraphs
                description_parts.append(text)
        
        return '\n\n'.join(description_parts) if description_parts else "Description Not Found"
    
    def _extract_requirements(self, soup: BeautifulSoup) -> List[str]:
        """Extract job requirements from LinkedIn page"""
        requirements = []
        
        # Look for requirements section
        requirement_keywords = ['requirements', 'qualifications', 'skills', 'experience']
        
        for keyword in requirement_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    # Extract list items or paragraphs following the keyword
                    next_elements = parent.find_next_siblings()
                    for next_elem in next_elements:
                        if next_elem.name in ['li', 'p']:
                            text = next_elem.get_text().strip()
                            if text and len(text) > 10:
                                requirements.append(text)
        
        return requirements
    
    def _extract_benefits(self, soup: BeautifulSoup) -> List[str]:
        """Extract job benefits from LinkedIn page"""
        benefits = []
        
        # Look for benefits section
        benefit_keywords = ['benefits', 'perks', 'advantages', 'compensation']
        
        for keyword in benefit_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    next_elements = parent.find_next_siblings()
                    for next_elem in next_elements:
                        if next_elem.name in ['li', 'p']:
                            text = next_elem.get_text().strip()
                            if text and len(text) > 10:
                                benefits.append(text)
        
        return benefits
    
    def _extract_salary_info(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract salary information from LinkedIn page"""
        salary_keywords = ['salary', 'compensation', 'pay', 'wage']
        
        for keyword in salary_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    text = parent.get_text().strip()
                    if text and len(text) > 10:
                        return text
        
        return None
    
    def _extract_job_type(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract job type from LinkedIn page"""
        job_type_keywords = ['full time', 'part time', 'contract', 'freelance', 'remote', 'hybrid']
        
        text = soup.get_text().lower()
        for job_type in job_type_keywords:
            if job_type in text:
                return job_type.title()
        
        return None
    
    def _extract_experience_level(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract experience level from LinkedIn page"""
        experience_keywords = ['entry level', 'junior', 'mid level', 'senior', 'lead', 'principal', 'architect']
        
        text = soup.get_text().lower()
        for level in experience_keywords:
            if level in text:
                return level.title()
        
        return None
    
    async def parse_job_description(self, description: str) -> Dict[str, Any]:
        """Parse job description text and extract structured information"""
        try:
            # Clean the description
            cleaned_description = self._clean_text(description)
            
            # Use NLP to process the text
            doc = self.nlp(cleaned_description)
            
            # Extract structured information
            parsed_data = {
                'title': self._extract_job_title_from_text(cleaned_description),
                'company': self._extract_company_from_text(cleaned_description),
                'location': self._extract_location_from_text(cleaned_description),
                'description': cleaned_description,
                'skills': self._extract_skills_from_text(cleaned_description),
                'requirements': self._extract_requirements_from_text(cleaned_description),
                'responsibilities': self._extract_responsibilities_from_text(cleaned_description),
                'qualifications': self._extract_qualifications_from_text(cleaned_description),
                'keywords': self._extract_keywords_from_text(cleaned_description),
                'experience_level': self._extract_experience_level_from_text(cleaned_description),
                'job_type': self._extract_job_type_from_text(cleaned_description),
                'salary_info': self._extract_salary_from_text(cleaned_description)
            }
            
            return parsed_data
            
        except Exception as e:
            raise Exception(f"Error parsing job description: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep important ones
        text = re.sub(r'[^\w\s\-\.\,\;\:\!\?\(\)\[\]\{\}]', ' ', text)
        # Normalize line breaks
        text = re.sub(r'\n+', '\n', text)
        return text.strip()
    
    def _extract_job_title_from_text(self, text: str) -> str:
        """Extract job title from text"""
        # Look for common job title patterns
        title_patterns = [
            r'(?:looking for|seeking|hiring)\s+([A-Za-z\s]+(?:developer|engineer|manager|specialist|analyst))',
            r'(?:position|role|job):\s*([A-Za-z\s]+)',
            r'([A-Za-z\s]+(?:developer|engineer|manager|specialist|analyst))'
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Job Title"
    
    def _extract_company_from_text(self, text: str) -> str:
        """Extract company name from text"""
        # Look for company patterns
        company_patterns = [
            r'(?:at|with|join)\s+([A-Za-z\s&]+(?:Inc|Corp|LLC|Ltd))',
            r'([A-Za-z\s&]+(?:Inc|Corp|LLC|Ltd))'
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Company"
    
    def _extract_location_from_text(self, text: str) -> str:
        """Extract location from text"""
        # Look for location patterns
        location_patterns = [
            r'(?:in|at|location):\s*([A-Za-z\s,]+)',
            r'([A-Za-z\s,]+(?:remote|hybrid|onsite))'
        ]
        
        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return "Location"
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from job description"""
        skills = []
        text_lower = text.lower()
        
        # Extract skills from predefined categories
        for category, skill_list in self.job_keywords.items():
            if category == 'skills':
                for skill in skill_list:
                    if skill in text_lower:
                        skills.append(skill.title())
        
        # Use NLP to extract additional skills
        doc = self.nlp(text)
        
        # Extract noun phrases that might be skills
        for chunk in doc.noun_chunks:
            if len(chunk.text) > 2 and chunk.text.lower() not in ['the', 'and', 'or', 'for']:
                skills.append(chunk.text.title())
        
        return list(set(skills))
    
    def _extract_requirements_from_text(self, text: str) -> List[str]:
        """Extract requirements from job description"""
        requirements = []
        
        # Look for requirements section
        requirement_sections = re.split(r'(?:requirements|qualifications|skills|experience)', text, flags=re.IGNORECASE)
        
        if len(requirement_sections) > 1:
            requirements_text = requirement_sections[1]
            # Split by bullet points or new lines
            req_items = re.split(r'[•\-\*]|\n', requirements_text)
            
            for item in req_items:
                item = item.strip()
                if item and len(item) > 10:
                    requirements.append(item)
        
        return requirements
    
    def _extract_responsibilities_from_text(self, text: str) -> List[str]:
        """Extract responsibilities from job description"""
        responsibilities = []
        
        # Look for responsibilities section
        resp_sections = re.split(r'(?:responsibilities|duties|tasks|role)', text, flags=re.IGNORECASE)
        
        if len(resp_sections) > 1:
            resp_text = resp_sections[1]
            # Split by bullet points or new lines
            resp_items = re.split(r'[•\-\*]|\n', resp_text)
            
            for item in resp_items:
                item = item.strip()
                if item and len(item) > 10:
                    responsibilities.append(item)
        
        return responsibilities
    
    def _extract_qualifications_from_text(self, text: str) -> List[str]:
        """Extract qualifications from job description"""
        qualifications = []
        
        # Look for qualifications section
        qual_sections = re.split(r'(?:qualifications|education|degree)', text, flags=re.IGNORECASE)
        
        if len(qual_sections) > 1:
            qual_text = qual_sections[1]
            # Split by bullet points or new lines
            qual_items = re.split(r'[•\-\*]|\n', qual_text)
            
            for item in qual_items:
                item = item.strip()
                if item and len(item) > 10:
                    qualifications.append(item)
        
        return qualifications
    
    def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract keywords from job description"""
        keywords = []
        text_lower = text.lower()
        
        # Extract keywords from all categories
        for category, keyword_list in self.job_keywords.items():
            for keyword in keyword_list:
                if keyword in text_lower:
                    keywords.append(keyword.title())
        
        return list(set(keywords))
    
    def _extract_experience_level_from_text(self, text: str) -> Optional[str]:
        """Extract experience level from text"""
        text_lower = text.lower()
        
        for level in self.job_keywords['experience_levels']:
            if level in text_lower:
                return level.title()
        
        return None
    
    def _extract_job_type_from_text(self, text: str) -> Optional[str]:
        """Extract job type from text"""
        text_lower = text.lower()
        
        for job_type in self.job_keywords['job_types']:
            if job_type in text_lower:
                return job_type.title()
        
        return None
    
    def _extract_salary_from_text(self, text: str) -> Optional[str]:
        """Extract salary information from text"""
        salary_patterns = [
            r'\$[\d,]+(?:-\$[\d,]+)?\s*(?:per\s+year|annually|yearly)',
            r'\$[\d,]+(?:-\$[\d,]+)?\s*(?:per\s+hour|hourly)',
            r'(?:salary|compensation|pay):\s*\$[\d,]+(?:-\$[\d,]+)?'
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group()
        
        return None

# Initialize job scraper
job_scraper = JobScraper() 