import os
import json
import re
from typing import Dict, List, Any, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import time
from urllib.parse import urlparse, parse_qs

# Try to import langchain dependencies, fallback to None if not available
try:
    from langchain.chat_models import ChatOpenAI
    from langchain.prompts import PromptTemplate
    from langchain.output_parsers import PydanticOutputParser
    from pydantic import BaseModel, Field
    LANGCHAIN_AVAILABLE = True
except ImportError:
    print("LangChain not available, using basic parsing only")
    LANGCHAIN_AVAILABLE = False
    # Create dummy classes for type hints
    class BaseModel:
        def dict(self):
            return {}
    class Field:
        def __init__(self, *args, **kwargs):
            pass

# ----------------------------
# Pydantic models for job parsing
# ----------------------------

class CompanyInfo(BaseModel):
    name: Optional[str] = Field(description="Company name")
    industry: Optional[str] = Field(description="Company industry")
    size: Optional[str] = Field(description="Company size (e.g., '1000-5000 employees')")
    location: Optional[str] = Field(description="Company headquarters location")
    website: Optional[str] = Field(description="Company website")
    description: Optional[str] = Field(description="Company description/about")
    linkedin_url: Optional[str] = Field(description="Company LinkedIn URL")

class JobLocation(BaseModel):
    city: Optional[str] = Field(description="Job location city")
    state: Optional[str] = Field(description="Job location state/province")
    country: Optional[str] = Field(description="Job location country")
    is_remote: bool = Field(description="Whether the job is remote", default=False)
    is_hybrid: bool = Field(description="Whether the job is hybrid", default=False)
    full_location: Optional[str] = Field(description="Full location string")

class SalaryInfo(BaseModel):
    min_salary: Optional[str] = Field(description="Minimum salary")
    max_salary: Optional[str] = Field(description="Maximum salary")
    currency: Optional[str] = Field(description="Salary currency (e.g., USD)")
    period: Optional[str] = Field(description="Salary period (e.g., yearly, hourly)")
    equity: Optional[str] = Field(description="Equity information if mentioned")

class JobRequirements(BaseModel):
    required_skills: List[str] = Field(description="Required technical and soft skills", default_factory=list)
    preferred_skills: List[str] = Field(description="Preferred/nice-to-have skills", default_factory=list)
    education: List[str] = Field(description="Education requirements", default_factory=list)
    certifications: List[str] = Field(description="Required certifications", default_factory=list)
    experience_level: Optional[str] = Field(description="Experience level (e.g., 'Senior', 'Mid-level', 'Entry-level')")
    years_of_experience: Optional[str] = Field(description="Years of experience required")
    languages: List[str] = Field(description="Programming languages required", default_factory=list)
    tools_technologies: List[str] = Field(description="Tools and technologies required", default_factory=list)

class JobBenefits(BaseModel):
    health_insurance: bool = Field(description="Health insurance provided", default=False)
    dental_vision: bool = Field(description="Dental and vision insurance", default=False)
    retirement_401k: bool = Field(description="401k or retirement benefits", default=False)
    paid_time_off: bool = Field(description="Paid time off/vacation", default=False)
    flexible_schedule: bool = Field(description="Flexible work schedule", default=False)
    remote_work: bool = Field(description="Remote work options", default=False)
    professional_development: bool = Field(description="Professional development opportunities", default=False)
    stock_options: bool = Field(description="Stock options or equity", default=False)
    other_benefits: List[str] = Field(description="Other benefits mentioned", default_factory=list)

class JobDetails(BaseModel):
    job_type: Optional[str] = Field(description="Job type (Full-time, Part-time, Contract, etc.)")
    seniority_level: Optional[str] = Field(description="Seniority level")
    job_function: Optional[str] = Field(description="Job function/department")
    industries: List[str] = Field(description="Industries this role serves", default_factory=list)
    posted_date: Optional[str] = Field(description="Job posting date")
    application_deadline: Optional[str] = Field(description="Application deadline if mentioned")
    number_of_applicants: Optional[str] = Field(description="Number of applicants if shown")

class ParsedJobStructure(BaseModel):
    title: Optional[str] = Field(description="Job title")
    company: CompanyInfo = Field(description="Company information")
    location: JobLocation = Field(description="Job location details")
    salary: SalaryInfo = Field(description="Salary information")
    requirements: JobRequirements = Field(description="Job requirements")
    benefits: JobBenefits = Field(description="Job benefits")
    details: JobDetails = Field(description="Additional job details")
    description: Optional[str] = Field(description="Full job description text")
    responsibilities: List[str] = Field(description="Key responsibilities", default_factory=list)
    qualifications: List[str] = Field(description="Qualifications listed", default_factory=list)
    summary: Optional[str] = Field(description="AI-generated job summary")
    linkedin_url: Optional[str] = Field(description="Original LinkedIn job URL")

# ----------------------------
# Enhanced Job Parser Class
# ----------------------------

class EnhancedJobParser:
    def __init__(self):
        self.langchain_available = LANGCHAIN_AVAILABLE
        
        if self.langchain_available:
            self.openai_api_key = os.getenv("OPENAI_API_KEY")
            if not self.openai_api_key:
                print("Warning: OPENAI_API_KEY not found, falling back to basic parsing")
                self.langchain_available = False
            else:
                try:
                    self.llm = ChatOpenAI(
                        model=os.getenv("JOB_PARSER_MODEL", "gpt-4"),
                        temperature=0,
                        openai_api_key=self.openai_api_key
                    )
                    self.parser = PydanticOutputParser(pydantic_object=ParsedJobStructure)
                    self.prompt_template = PromptTemplate(
                        template=(
                            "You are an expert job description parser and career analyst. Extract comprehensive structured information from the job posting below.\n"
                            "Return ONLY fields described in the schema via the format instructions.\n"
                            "Guidelines:\n"
                            "- Extract ALL skills mentioned (technical, soft, domain-specific)\n"
                            "- Identify experience level and years required\n"
                            "- Parse salary information if present\n"
                            "- Extract company information and benefits\n"
                            "- Categorize requirements vs preferences\n"
                            "- Generate a comprehensive summary of the role\n"
                            "- If information is missing, use nulls or empty arrays. Do not invent facts.\n"
                            "- Be thorough in extracting responsibilities and qualifications\n\n"
                            "Job Posting Text:\n{job_text}\n\n{format_instructions}\n\nParsed Job:\n"
                        ),
                        input_variables=["job_text"],
                        partial_variables={"format_instructions": self.parser.get_format_instructions()}
                    )
                except Exception as e:
                    print(f"Error initializing LangChain: {e}, falling back to basic parsing")
                    self.langchain_available = False
        
        # Headers for web scraping
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Comprehensive skill databases
        self.skill_patterns = {
            'programming_languages': [
                'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift',
                'kotlin', 'scala', 'r', 'matlab', 'perl', 'typescript', 'dart', 'elixir', 'clojure'
            ],
            'web_technologies': [
                'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
                'laravel', 'rails', 'asp.net', 'html', 'css', 'sass', 'less', 'webpack', 'babel'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
                'oracle', 'sql server', 'sqlite', 'dynamodb', 'neo4j', 'influxdb'
            ],
            'cloud_platforms': [
                'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean', 'linode',
                'cloudflare', 'vercel', 'netlify'
            ],
            'devops_tools': [
                'docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions', 'terraform',
                'ansible', 'chef', 'puppet', 'vagrant', 'helm', 'prometheus', 'grafana'
            ],
            'soft_skills': [
                'communication', 'leadership', 'teamwork', 'problem solving', 'analytical thinking',
                'project management', 'time management', 'adaptability', 'creativity', 'mentoring'
            ]
        }

    async def scrape_linkedin_job(self, url: str) -> Dict[str, Any]:
        """Scrape job information from LinkedIn with enhanced data extraction"""
        try:
            if not self._is_valid_linkedin_job_url(url):
                raise ValueError("Invalid LinkedIn job URL")
            
            # Extract job ID and construct direct URL if needed
            job_id = self._extract_job_id_from_url(url)
            if job_id:
                direct_url = self._construct_direct_job_url(job_id)
                print(f"Extracted job ID {job_id}, using direct URL: {direct_url}")
            else:
                direct_url = url
                print(f"Using original URL: {direct_url}")
            
            # Try multiple scraping methods with the direct URL
            raw_data = self._scrape_with_selenium(direct_url)
            if not raw_data or not raw_data.get('description'):
                print("Selenium failed, trying requests method...")
                raw_data = self._scrape_with_requests(direct_url)
            
            if not raw_data or not raw_data.get('description'):
                print("Both scraping methods failed, using fallback parsing...")
                # Create minimal raw data for fallback
                raw_data = {
                    'url': direct_url,
                    'scraped_at': datetime.now().isoformat(),
                    'title': 'Job Title Not Found',
                    'company_name': 'Company Not Found',
                    'location': 'Location Not Found',
                    'description': f'Unable to scrape job details from LinkedIn. Job ID: {job_id or "Unknown"}. Please try with a direct job URL or paste the job description manually.'
                }
            
            # Ensure description is never None or empty
            if not raw_data.get('description'):
                raw_data['description'] = 'Job description could not be extracted. Please provide the job description manually.'
            
            # Parse with LangChain if available, otherwise use basic parsing
            if self.langchain_available:
                parsed_data = self._parse_with_langchain(raw_data)
            else:
                parsed_data = self._basic_parse_job(raw_data)
            
            # Add raw data and generate detailed summary
            parsed_data['raw_data'] = raw_data
            parsed_data['detailed_summary'] = self._generate_detailed_summary(parsed_data)
            
            return parsed_data
            
        except Exception as e:
            print(f"Error scraping LinkedIn job: {e}")
            raise

    async def parse_job_description(self, job_text: str, linkedin_url: Optional[str] = None) -> Dict[str, Any]:
        """Parse job description from plain text"""
        try:
            # Ensure job_text is always a valid string
            job_text = str(job_text or '').strip()
            if not job_text:
                job_text = 'No job description provided. Please provide a job description to analyze.'
            
            raw_data = {
                'description': job_text,
                'url': linkedin_url,
                'scraped_at': datetime.now().isoformat()
            }
            
            # Parse with LangChain if available
            if self.langchain_available:
                parsed_data = self._parse_with_langchain(raw_data)
            else:
                parsed_data = self._basic_parse_job(raw_data)
            
            # Add raw data and generate detailed summary
            parsed_data['raw_data'] = raw_data
            parsed_data['detailed_summary'] = self._generate_detailed_summary(parsed_data)
            
            return parsed_data
            
        except Exception as e:
            print(f"Error parsing job text: {e}")
            raise

    def _scrape_with_selenium(self, url: str) -> Dict[str, Any]:
        """Scrape LinkedIn job using Selenium for dynamic content"""
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
            
            # Get page source and parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Extract job information using BeautifulSoup
            job_data = {
                'url': url,
                'scraped_at': datetime.now().isoformat(),
                'title': self._extract_job_title(soup),
                'company_name': self._extract_company_name(soup),
                'location': self._extract_location(soup),
                'description': self._extract_job_description(soup)
            }
            
            return job_data
            
        except Exception as e:
            print(f"Selenium scraping failed: {e}")
            return None
        finally:
            if driver:
                driver.quit()

    def _scrape_with_requests(self, url: str) -> Dict[str, Any]:
        """Fallback scraping method using requests and BeautifulSoup"""
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            job_data = {
                'url': url,
                'scraped_at': datetime.now().isoformat(),
                'title': self._extract_job_title(soup),
                'company_name': self._extract_company_name(soup),
                'location': self._extract_location(soup),
                'description': self._extract_job_description(soup)
            }
            
            return job_data
            
        except Exception as e:
            print(f"Requests scraping failed: {e}")
            return None

    def _parse_with_langchain(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse job data using LangChain and GPT"""
        try:
            job_text = raw_data.get('description', '')
            if not job_text:
                raise ValueError("No job description found in raw data")
            
            # Create prompt and get response
            prompt = self.prompt_template.format(job_text=job_text)
            response = self.llm.predict(prompt)
            
            # Parse response
            parsed_result = self.parser.parse(response)
            result_dict = parsed_result.dict()
            
            # Add LinkedIn URL if available
            if raw_data.get('url'):
                result_dict['linkedin_url'] = raw_data['url']
            
            return result_dict
            
        except Exception as e:
            print(f"LangChain parsing failed: {e}, falling back to basic parsing")
            return self._basic_parse_job(raw_data)

    def _basic_parse_job(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Basic job parsing without LangChain"""
        description = str(raw_data.get('description') or 'No job description available')
        
        return {
            'title': raw_data.get('title', ''),
            'company': {
                'name': raw_data.get('company_name', ''),
                'description': self._extract_company_description(description)
            },
            'location': {
                'full_location': raw_data.get('location', ''),
                'is_remote': 'remote' in description.lower(),
                'is_hybrid': 'hybrid' in description.lower()
            },
            'requirements': {
                'required_skills': self._extract_skills(description),
                'experience_level': self._extract_experience_level(description),
                'years_of_experience': self._extract_years_experience(description)
            },
            'description': description,
            'responsibilities': self._extract_responsibilities(description),
            'qualifications': self._extract_qualifications(description),
            'linkedin_url': raw_data.get('url')
        }

    def _generate_detailed_summary(self, parsed_data: Dict[str, Any]) -> str:
        """Generate a comprehensive summary of the job posting"""
        try:
            company_name = parsed_data.get('company', {}).get('name', 'Unknown Company')
            title = parsed_data.get('title', 'Unknown Position')
            location = parsed_data.get('location', {}).get('full_location', 'Location not specified')
            
            summary_parts = []
            
            # Company and role intro
            summary_parts.append(f"{company_name} is seeking a {title} based in {location}.")
            
            # Company description
            company_desc = parsed_data.get('company', {}).get('description')
            if company_desc:
                summary_parts.append(f"About the Company: {company_desc}")
            
            # Role details
            if parsed_data.get('details', {}).get('job_type'):
                job_type = parsed_data['details']['job_type']
                summary_parts.append(f"This is a {job_type} position.")
            
            # Experience requirements
            exp_level = parsed_data.get('requirements', {}).get('experience_level')
            years_exp = parsed_data.get('requirements', {}).get('years_of_experience')
            if exp_level or years_exp:
                exp_text = f"Experience Required: {exp_level or ''} {years_exp or ''}".strip()
                summary_parts.append(exp_text)
            
            # Key skills
            required_skills = parsed_data.get('requirements', {}).get('required_skills', [])
            if required_skills:
                skills_text = f"Key Skills: {', '.join(required_skills[:10])}"
                if len(required_skills) > 10:
                    skills_text += f" and {len(required_skills) - 10} more"
                summary_parts.append(skills_text)
            
            # Salary info
            salary = parsed_data.get('salary', {})
            if salary.get('min_salary') or salary.get('max_salary'):
                salary_text = f"Compensation: {salary.get('min_salary', '')} - {salary.get('max_salary', '')} {salary.get('currency', '')}"
                summary_parts.append(salary_text.strip())
            
            # Benefits
            benefits = parsed_data.get('benefits', {})
            benefit_list = []
            if benefits.get('health_insurance'):
                benefit_list.append('Health Insurance')
            if benefits.get('retirement_401k'):
                benefit_list.append('401k')
            if benefits.get('remote_work'):
                benefit_list.append('Remote Work Options')
            if benefits.get('professional_development'):
                benefit_list.append('Professional Development')
            
            if benefit_list:
                summary_parts.append(f"Benefits: {', '.join(benefit_list)}")
            
            return ' '.join(summary_parts)
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            return "Detailed job summary could not be generated."

    # Helper methods for data extraction
    def _extract_job_title(self, soup: BeautifulSoup) -> str:
        """Extract job title from LinkedIn page"""
        # Try multiple selectors for job title
        selectors = [
            'h1[class*="job-title"]',
            'h1[class*="title"]',
            '.job-title',
            '.title',
            'h1.top-card-layout__title',
            '.job-details-jobs-unified-top-card__job-title h1',
            '.jobs-unified-top-card__job-title',
            'h1[data-automation-id="jobPostingHeader"]',
            '.jobs-unified-top-card__job-title h1',
            'h1.t-24',
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
            '.job-details-jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name a',
            '.job-details-jobs-unified-top-card__company-name',
            'a[data-automation-id="jobPostingCompanyLink"]',
            '.jobs-unified-top-card__company-name',
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
            '.job-details-jobs-unified-top-card__bullet',
            '.jobs-unified-top-card__bullet',
            'span[data-automation-id="jobPostingLocation"]',
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
            '.jobs-description-content__text',
            '.jobs-box__html-content',
            '.job-details-jobs-unified-top-card__job-description',
            'div[data-automation-id="jobPostingDescription"]',
            '.jobs-description__content',
            '.jobs-box__group .jobs-box__html-content',
            '.show-more-less-html__markup',
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

    def _safe_extract_text(self, driver, selectors: List[str]) -> str:
        """Safely extract text from element using multiple selectors"""
        for selector in selectors:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                if element and element.text.strip():
                    return element.text.strip()
            except:
                continue
        return ""
    
    def _extract_text_from_soup(self, soup: BeautifulSoup, selectors: List[str]) -> str:
        """Extract text from soup using multiple selectors"""
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        return ""

    def _extract_company_info(self, driver) -> Dict[str, Any]:
        """Extract comprehensive company information"""
        try:
            return {
                'size': self._safe_extract_text(driver, [".jobs-unified-top-card__company-name + div"]),
                'industry': self._safe_extract_text(driver, [".job-details-jobs-unified-top-card__company-name + div"]),
                'website': self._safe_extract_attribute(driver, [".jobs-company__company-logo"], 'href')
            }
        except:
            return {}

    def _extract_job_insights(self, driver) -> Dict[str, Any]:
        """Extract job insights and additional details"""
        try:
            insights = {}
            insight_elements = driver.find_elements(By.CSS_SELECTOR, ".job-details-preferences-and-skills")
            for element in insight_elements:
                text = element.text
                if 'seniority level' in text.lower():
                    insights['seniority_level'] = text
                elif 'employment type' in text.lower():
                    insights['employment_type'] = text
                elif 'job function' in text.lower():
                    insights['job_function'] = text
            return insights
        except:
            return {}

    def _safe_extract_attribute(self, driver, selectors: List[str], attribute: str) -> str:
        """Safely extract attribute using multiple selectors"""
        for selector in selectors:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                return element.get_attribute(attribute) or ""
            except:
                continue
        return ""

    def _is_valid_linkedin_job_url(self, url: str) -> bool:
        """Validate LinkedIn job URL"""
        return 'linkedin.com/jobs' in url
    
    def _extract_job_id_from_url(self, url: str) -> Optional[str]:
        """Extract job ID from LinkedIn URL"""
        import re
        # Handle collection URLs like /collections/recommended/?currentJobId=4278917507
        job_id_match = re.search(r'currentJobId=([0-9]+)', url)
        if job_id_match:
            return job_id_match.group(1)
        
        # Handle direct job URLs like /jobs/view/4278917507
        job_id_match = re.search(r'/jobs/view/([0-9]+)', url)
        if job_id_match:
            return job_id_match.group(1)
        
        return None
    
    def _construct_direct_job_url(self, job_id: str) -> str:
        """Construct direct LinkedIn job URL from job ID"""
        return f"https://www.linkedin.com/jobs/view/{job_id}"

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from job description text"""
        skills = []
        text_lower = text.lower()
        
        for category, skill_list in self.skill_patterns.items():
            for skill in skill_list:
                if skill.lower() in text_lower:
                    skills.append(skill)
        
        return list(set(skills))

    def _extract_experience_level(self, text: str) -> str:
        """Extract experience level from job description"""
        text_lower = text.lower()
        levels = ['entry level', 'junior', 'mid level', 'senior', 'lead', 'principal', 'architect']
        
        for level in levels:
            if level in text_lower:
                return level.title()
        
        return ""

    def _extract_years_experience(self, text: str) -> str:
        """Extract years of experience requirement"""
        patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)-(\d+)\s*years?\s*(?:of\s*)?experience',
            r'minimum\s*(\d+)\s*years?',
            r'at least\s*(\d+)\s*years?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return match.group(0)
        
        return ""

    def _extract_company_description(self, text: str) -> str:
        """Extract company description from job text"""
        # Look for common company description patterns
        patterns = [
            r'about\s+(?:the\s+)?company[:\s]+(.*?)(?:\n\n|\n[A-Z])',
            r'company\s+description[:\s]+(.*?)(?:\n\n|\n[A-Z])',
            r'who\s+we\s+are[:\s]+(.*?)(?:\n\n|\n[A-Z])'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()[:500]  # Limit to 500 chars
        
        return ""

    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract job responsibilities from description"""
        responsibilities = []
        
        # Look for responsibility sections
        resp_patterns = [
            r'responsibilities[:\s]+(.*?)(?:\n\n|\nqualifications|\nrequirements)',
            r'what\s+you[\'"]?ll\s+do[:\s]+(.*?)(?:\n\n|\nqualifications|\nrequirements)',
            r'key\s+responsibilities[:\s]+(.*?)(?:\n\n|\nqualifications|\nrequirements)'
        ]
        
        for pattern in resp_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                resp_text = match.group(1)
                # Split by bullet points or line breaks
                resp_items = re.split(r'[•\-\*]\s*|\n\s*', resp_text)
                responsibilities.extend([item.strip() for item in resp_items if item.strip()])
                break
        
        return responsibilities[:10]  # Limit to 10 items

    def _extract_qualifications(self, text: str) -> List[str]:
        """Extract qualifications from job description"""
        qualifications = []
        
        # Look for qualification sections
        qual_patterns = [
            r'qualifications[:\s]+(.*?)(?:\n\n|\nbenefits|\nwhat\s+we\s+offer)',
            r'requirements[:\s]+(.*?)(?:\n\n|\nbenefits|\nwhat\s+we\s+offer)',
            r'what\s+we[\'"]?re\s+looking\s+for[:\s]+(.*?)(?:\n\n|\nbenefits|\nwhat\s+we\s+offer)'
        ]
        
        for pattern in qual_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                qual_text = match.group(1)
                # Split by bullet points or line breaks
                qual_items = re.split(r'[•\-\*]\s*|\n\s*', qual_text)
                qualifications.extend([item.strip() for item in qual_items if item.strip()])
                break
        
        return qualifications[:10]  # Limit to 10 items

# Initialize enhanced job parser
try:
    enhanced_job_parser = EnhancedJobParser()
except Exception as e:
    print(f"Error initializing enhanced job parser: {e}")
    enhanced_job_parser = None
