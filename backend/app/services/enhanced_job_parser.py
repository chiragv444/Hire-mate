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
    company_type: Optional[str] = Field(description="Company type (e.g., 'Public', 'Private', 'Startup')")
    founded_year: Optional[str] = Field(description="Company founding year")
    revenue: Optional[str] = Field(description="Company revenue if mentioned")
    specialties: List[str] = Field(description="Company specialties/focus areas", default_factory=list)

class JobLocation(BaseModel):
    city: Optional[str] = Field(description="Job location city")
    state: Optional[str] = Field(description="Job location state/province")
    country: Optional[str] = Field(description="Job location country")
    is_remote: bool = Field(description="Whether the job is remote", default=False)
    is_hybrid: bool = Field(description="Whether the job is hybrid", default=False)
    full_location: Optional[str] = Field(description="Full location string")
    timezone: Optional[str] = Field(description="Timezone if mentioned")
    relocation_assistance: Optional[bool] = Field(description="Whether relocation assistance is provided")

class SalaryInfo(BaseModel):
    min_salary: Optional[str] = Field(description="Minimum salary")
    max_salary: Optional[str] = Field(description="Maximum salary")
    currency: Optional[str] = Field(description="Salary currency (e.g., USD)")
    period: Optional[str] = Field(description="Salary period (e.g., yearly, hourly)")
    equity: Optional[str] = Field(description="Equity information if mentioned")
    bonus: Optional[str] = Field(description="Bonus information if mentioned")
    commission: Optional[str] = Field(description="Commission structure if mentioned")

class JobRequirements(BaseModel):
    required_skills: List[str] = Field(description="Required technical and soft skills", default_factory=list)
    preferred_skills: List[str] = Field(description="Preferred/nice-to-have skills", default_factory=list)
    education: List[str] = Field(description="Education requirements", default_factory=list)
    certifications: List[str] = Field(description="Required certifications", default_factory=list)
    experience_level: Optional[str] = Field(description="Experience level (e.g., 'Senior', 'Mid-level', 'Entry-level')")
    years_of_experience: Optional[str] = Field(description="Years of experience required")
    languages: List[str] = Field(description="Programming languages required", default_factory=list)
    tools_technologies: List[str] = Field(description="Tools and technologies required", default_factory=list)
    industry_experience: List[str] = Field(description="Required industry experience", default_factory=list)
    domain_knowledge: List[str] = Field(description="Required domain knowledge", default_factory=list)

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
    gym_membership: bool = Field(description="Gym membership or wellness benefits", default=False)
    commuter_benefits: bool = Field(description="Commuter benefits or transportation", default=False)
    tuition_reimbursement: bool = Field(description="Tuition reimbursement or education support", default=False)

class JobDetails(BaseModel):
    job_type: Optional[str] = Field(description="Job type (Full-time, Part-time, Contract, etc.)")
    seniority_level: Optional[str] = Field(description="Seniority level")
    job_function: Optional[str] = Field(description="Job function/department")
    industries: List[str] = Field(description="Industries this role serves", default_factory=list)
    posted_date: Optional[str] = Field(description="Job posting date")
    application_deadline: Optional[str] = Field(description="Application deadline if mentioned")
    number_of_applicants: Optional[str] = Field(description="Number of applicants if shown")
    application_method: Optional[str] = Field(description="How to apply (email, portal, etc.)")
    visa_sponsorship: Optional[bool] = Field(description="Whether visa sponsorship is available")
    travel_requirements: Optional[str] = Field(description="Travel requirements if any")
    team_size: Optional[str] = Field(description="Team size if mentioned")
    reporting_structure: Optional[str] = Field(description="Reporting structure if mentioned")

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
    company_culture: Optional[str] = Field(description="Company culture information if mentioned")
    growth_opportunities: Optional[str] = Field(description="Growth and advancement opportunities")
    work_environment: Optional[str] = Field(description="Work environment description")

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
            chrome_options.add_argument("--disable-extensions")
            chrome_options.add_argument("--disable-plugins")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--allow-running-insecure-content")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_argument("--disable-features=VizDisplayCompositor")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument(f"user-agent={self.headers['User-Agent']}")
            
            # Initialize driver
            service = Service("/usr/local/bin/chromedriver")
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
            page_source = driver.page_source
            print(f"Page source length: {len(page_source) if page_source else 'None'}")
            
            if not page_source or len(page_source.strip()) == 0:
                print("Warning: Empty page source from Selenium")
                return None
            
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Extract job information using BeautifulSoup
            try:
                title = self._extract_job_title(soup)
                company_name = self._extract_company_name(soup)
                location = self._extract_location(soup)
                description = self._extract_job_description(soup)
                
                job_data = {
                    'url': url,
                    'scraped_at': datetime.now().isoformat(),
                    'title': title,
                    'company_name': company_name,
                    'location': location,
                    'description': description
                }
                
                print(f"Extracted job data: {job_data}")
                return job_data
            except Exception as e:
                print(f"Error extracting job data from soup: {e}")
                import traceback
                traceback.print_exc()
                return None
            
        except Exception as e:
            print(f"Selenium scraping failed: {e}")
            print(f"Error type: {type(e)}")
            print(f"Error details: {str(e)}")
            import traceback
            traceback.print_exc()
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
        """Generate a comprehensive, detailed summary of the job posting"""
        try:
            company_name = parsed_data.get('company', {}).get('name', 'Unknown Company')
            title = parsed_data.get('title', 'Unknown Position')
            location = parsed_data.get('location', {}).get('full_location', 'Location not specified')
            
            summary_parts = []
            
            # Company and role introduction
            summary_parts.append(f"{company_name} is seeking a {title} based in {location}.")
            
            # Company comprehensive information
            company_info = parsed_data.get('company', {})
            if company_info.get('description'):
                summary_parts.append(f"About the Company: {company_info['description']}")
            
            if company_info.get('industry'):
                summary_parts.append(f"Industry: {company_info['industry']}")
            
            if company_info.get('size'):
                summary_parts.append(f"Company Size: {company_info['size']}")
            
            if company_info.get('company_type'):
                summary_parts.append(f"Company Type: {company_info['company_type']}")
            
            if company_info.get('specialties'):
                specialties = ', '.join(company_info['specialties'][:5])  # Limit to top 5
                summary_parts.append(f"Company Specialties: {specialties}")
            
            # Role details and requirements
            details = parsed_data.get('details', {})
            requirements = parsed_data.get('requirements', {})
            
            if details.get('job_type'):
                summary_parts.append(f"Employment Type: {details['job_type']}")
            
            if details.get('seniority_level'):
                summary_parts.append(f"Seniority Level: {details['seniority_level']}")
            
            if details.get('job_function'):
                summary_parts.append(f"Job Function: {details['job_function']}")
            
            if details.get('industries'):
                industries = ', '.join(details['industries'][:3])  # Limit to top 3
                summary_parts.append(f"Target Industries: {industries}")
            
            # Experience requirements
            exp_level = requirements.get('experience_level')
            years_exp = requirements.get('years_of_experience')
            if exp_level or years_exp:
                exp_text = f"Experience Requirements: {exp_level or ''} {years_exp or ''}".strip()
                summary_parts.append(exp_text)
            
            # Education requirements
            education_reqs = requirements.get('education', [])
            if education_reqs:
                edu_text = f"Education Requirements: {', '.join(education_reqs[:3])}"
                summary_parts.append(edu_text)
            
            # Key skills and technologies
            required_skills = requirements.get('required_skills', [])
            preferred_skills = requirements.get('preferred_skills', [])
            tools_tech = requirements.get('tools_technologies', [])
            
            if required_skills:
                skills_text = f"Required Skills: {', '.join(required_skills[:8])}"
                if len(required_skills) > 8:
                    skills_text += f" and {len(required_skills) - 8} more"
                summary_parts.append(skills_text)
            
            if preferred_skills:
                pref_skills_text = f"Preferred Skills: {', '.join(preferred_skills[:5])}"
                summary_parts.append(pref_skills_text)
            
            if tools_tech:
                tools_text = f"Tools & Technologies: {', '.join(tools_tech[:6])}"
                summary_parts.append(tools_text)
            
            # Industry experience and domain knowledge
            industry_exp = requirements.get('industry_experience', [])
            domain_knowledge = requirements.get('domain_knowledge', [])
            
            if industry_exp:
                industry_text = f"Industry Experience: {', '.join(industry_exp[:3])}"
                summary_parts.append(industry_text)
            
            if domain_knowledge:
                domain_text = f"Domain Knowledge: {', '.join(domain_knowledge[:3])}"
                summary_parts.append(domain_text)
            
            # Salary and compensation
            salary = parsed_data.get('salary', {})
            if salary.get('min_salary') or salary.get('max_salary'):
                salary_text = f"Compensation Range: {salary.get('min_salary', '')} - {salary.get('max_salary', '')} {salary.get('currency', '')}"
                if salary.get('period'):
                    salary_text += f" ({salary['period']})"
                summary_parts.append(salary_text.strip())
            
            if salary.get('equity'):
                summary_parts.append(f"Equity: {salary['equity']}")
            
            if salary.get('bonus'):
                summary_parts.append(f"Bonus: {salary['bonus']}")
            
            if salary.get('commission'):
                summary_parts.append(f"Commission: {salary['commission']}")
            
            # Comprehensive benefits
            benefits = parsed_data.get('benefits', {})
            benefit_list = []
            
            if benefits.get('health_insurance'):
                benefit_list.append('Health Insurance')
            if benefits.get('dental_vision'):
                benefit_list.append('Dental & Vision Insurance')
            if benefits.get('retirement_401k'):
                benefit_list.append('401k/Retirement Benefits')
            if benefits.get('paid_time_off'):
                benefit_list.append('Paid Time Off')
            if benefits.get('flexible_schedule'):
                benefit_list.append('Flexible Schedule')
            if benefits.get('remote_work'):
                benefit_list.append('Remote Work Options')
            if benefits.get('professional_development'):
                benefit_list.append('Professional Development')
            if benefits.get('stock_options'):
                benefit_list.append('Stock Options/Equity')
            if benefits.get('gym_membership'):
                benefit_list.append('Gym/Wellness Benefits')
            if benefits.get('commuter_benefits'):
                benefit_list.append('Commuter Benefits')
            if benefits.get('tuition_reimbursement'):
                benefit_list.append('Tuition Reimbursement')
            
            if benefit_list:
                summary_parts.append(f"Benefits Package: {', '.join(benefit_list)}")
            
            # Additional job details
            if details.get('application_method'):
                summary_parts.append(f"Application Method: {details['application_method']}")
            
            if details.get('visa_sponsorship'):
                summary_parts.append("Visa Sponsorship: Available")
            
            if details.get('travel_requirements'):
                summary_parts.append(f"Travel Requirements: {details['travel_requirements']}")
            
            if details.get('team_size'):
                summary_parts.append(f"Team Size: {details['team_size']}")
            
            if details.get('reporting_structure'):
                summary_parts.append(f"Reporting Structure: {details['reporting_structure']}")
            
            # Company culture and work environment
            if parsed_data.get('company_culture'):
                summary_parts.append(f"Company Culture: {parsed_data['company_culture']}")
            
            if parsed_data.get('work_environment'):
                summary_parts.append(f"Work Environment: {parsed_data['work_environment']}")
            
            if parsed_data.get('growth_opportunities'):
                summary_parts.append(f"Growth Opportunities: {parsed_data['growth_opportunities']}")
            
            # Responsibilities and qualifications summary
            responsibilities = parsed_data.get('responsibilities', [])
            qualifications = parsed_data.get('qualifications', [])
            
            if responsibilities:
                resp_count = len(responsibilities)
                summary_parts.append(f"Key Responsibilities: {resp_count} main areas including {', '.join(responsibilities[:3])}")
            
            if qualifications:
                qual_count = len(qualifications)
                summary_parts.append(f"Qualifications: {qual_count} key requirements including {', '.join(qualifications[:3])}")
            
            # Posting details
            if details.get('posted_date'):
                summary_parts.append(f"Posted: {details['posted_date']}")
            
            if details.get('application_deadline'):
                summary_parts.append(f"Application Deadline: {details['application_deadline']}")
            
            if details.get('number_of_applicants'):
                summary_parts.append(f"Current Applicants: {details['number_of_applicants']}")
            
            # Generate comprehensive summary
            comprehensive_summary = ' '.join(summary_parts)
            
            # Add a professional conclusion
            if len(comprehensive_summary) > 500:  # If summary is substantial
                comprehensive_summary += f" This position represents an excellent opportunity for a {exp_level or 'qualified'} professional to join {company_name} and contribute to their mission while advancing their career in {company_info.get('industry', 'the industry')}."
            
            return comprehensive_summary
            
        except Exception as e:
            print(f"Error generating detailed summary: {e}")
            return "Comprehensive job summary could not be generated. Please review the job description manually for complete details."

    # Helper methods for data extraction
    def _extract_job_title(self, soup: BeautifulSoup) -> str:
        """Extract job title from LinkedIn page with comprehensive selectors"""
        # Comprehensive selectors for job title extraction
        selectors = [
            # Primary selectors
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
            # Additional selectors for different LinkedIn layouts
            'h1[class*="jobs-unified-top-card__job-title"]',
            'h1[class*="job-details-jobs-unified-top-card__job-title"]',
            'h1[class*="top-card-layout__title"]',
            'h1[class*="jobs-box__job-title"]',
            'h1[class*="job-posting-header"]',
            'h1[class*="job-header"]',
            'h1[class*="position-title"]',
            'h1[class*="role-title"]',
            # Fallback selectors
            'h1',
            'h2[class*="title"]',
            'h2[class*="job"]',
            '.job-header h1',
            '.position-header h1'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                title = element.get_text().strip()
                # Clean up common artifacts
                title = re.sub(r'\s+', ' ', title)
                title = re.sub(r'[^\w\s\-&()]', '', title)
                if len(title) > 3:  # Ensure we have a meaningful title
                    return title
        
        # Fallback: look for any heading that might contain job title
        headings = soup.find_all(['h1', 'h2', 'h3'])
        for heading in headings:
            text = heading.get_text().strip()
            if text and len(text) > 3 and len(text) < 100:
                # Check if it looks like a job title
                if any(word in text.lower() for word in ['engineer', 'manager', 'developer', 'analyst', 'specialist', 'coordinator', 'director', 'lead', 'architect']):
                    return text
        
        return "Job Title Not Found"
    
    def _extract_company_name(self, soup: BeautifulSoup) -> str:
        """Extract company name from LinkedIn page with comprehensive selectors"""
        # Comprehensive selectors for company name extraction
        selectors = [
            # Primary selectors
            '.job-details-jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name a',
            '.job-details-jobs-unified-top-card__company-name',
            'a[data-automation-id="jobPostingCompanyLink"]',
            '.jobs-unified-top-card__company-name',
            '.company-name',
            '.employer-name',
            '[class*="company"]',
            '[class*="employer"]',
            # Additional selectors for different layouts
            'a[class*="company-name"]',
            'a[class*="employer-name"]',
            'span[class*="company-name"]',
            'span[class*="employer-name"]',
            'div[class*="company-name"]',
            'div[class*="employer-name"]',
            '.job-header a[href*="/company/"]',
            '.position-header a[href*="/company/"]',
            'a[href*="/company/"][class*="name"]',
            # Fallback selectors
            'a[href*="/company/"]',
            '[class*="company"] a',
            '[class*="employer"] a'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                company_name = element.get_text().strip()
                # Clean up common artifacts
                company_name = re.sub(r'\s+', ' ', company_name)
                company_name = re.sub(r'[^\w\s\-&()]', '', company_name)
                if len(company_name) > 2:  # Ensure we have a meaningful company name
                    return company_name
        
        # Fallback: look for company links in the page
        company_links = soup.find_all('a', href=re.compile(r'/company/'))
        for link in company_links:
            text = link.get_text().strip()
            if text and len(text) > 2 and len(text) < 100:
                # Check if it looks like a company name
                if not any(word in text.lower() for word in ['apply', 'save', 'share', 'report', 'job', 'position']):
                    return text
        
        # Additional fallback: look for text near company-related keywords
        company_keywords = ['company', 'employer', 'organization', 'firm', 'corporation', 'inc', 'llc', 'ltd']
        for keyword in company_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    text = parent.get_text().strip()
                    if text and len(text) > 5 and len(text) < 100:
                        # Extract potential company name
                        words = text.split()
                        for i, word in enumerate(words):
                            if keyword.lower() in word.lower() and i > 0:
                                potential_name = ' '.join(words[:i])
                                if len(potential_name) > 2:
                                    return potential_name
        
        return "Company Not Found"
    
    def _extract_location(self, soup: BeautifulSoup) -> str:
        """Extract job location from LinkedIn page with comprehensive selectors"""
        # Comprehensive selectors for location extraction
        selectors = [
            # Primary selectors
            '.job-details-jobs-unified-top-card__bullet',
            '.jobs-unified-top-card__bullet',
            'span[data-automation-id="jobPostingLocation"]',
            '.job-location',
            '.location',
            '[class*="location"]',
            # Additional selectors for different layouts
            'span[class*="location"]',
            'div[class*="location"]',
            'p[class*="location"]',
            '.job-header [class*="location"]',
            '.position-header [class*="location"]',
            '[class*="job-location"]',
            '[class*="work-location"]',
            '[class*="office-location"]',
            # Fallback selectors
            '.job-details [class*="location"]',
            '.job-info [class*="location"]',
            '.job-meta [class*="location"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                location = element.get_text().strip()
                # Clean up common artifacts
                location = re.sub(r'\s+', ' ', location)
                if len(location) > 2:  # Ensure we have a meaningful location
                    return location
        
        # Fallback: look for location patterns in the page
        location_patterns = [
            r'([A-Za-z\s]+,\s*[A-Z]{2})',  # City, ST
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2})',  # City, County, ST
            r'([A-Za-z\s]+,\s*[A-Za-z\s]+)',  # City, State
            r'([A-Za-z\s]+,\s*[A-Za-z]{2})',  # City, Province
        ]
        
        page_text = soup.get_text()
        for pattern in location_patterns:
            matches = re.findall(pattern, page_text)
            for match in matches:
                if len(match.strip()) > 5 and len(match.strip()) < 100:
                    return match.strip()
        
        # Additional fallback: look for text near location-related keywords
        location_keywords = ['location', 'based in', 'office in', 'work from', 'remote', 'hybrid']
        for keyword in location_keywords:
            elements = soup.find_all(text=re.compile(keyword, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    text = parent.get_text().strip()
                    if text and len(text) > 10 and len(text) < 200:
                        # Extract potential location
                        if keyword.lower() in text.lower():
                            parts = text.split(keyword, 1)
                            if len(parts) > 1:
                                potential_location = parts[1].strip()
                                if len(potential_location) > 3 and len(potential_location) < 100:
                                    # Clean up the location
                                    potential_location = re.sub(r'[^\w\s,\-]', '', potential_location)
                                    if potential_location.strip():
                                        return potential_location.strip()
        
        return "Location Not Found"
    
    def _extract_job_description(self, soup: BeautifulSoup) -> str:
        """Extract job description from LinkedIn page with comprehensive selectors"""
        # Comprehensive selectors for job description extraction
        selectors = [
            # Primary selectors
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
            '.job-details',
            # Additional selectors for different layouts
            '.job-description-content',
            '.job-posting-description',
            '.position-description',
            '.role-description',
            '.job-summary',
            '.job-overview',
            '.job-requirements',
            '.job-responsibilities',
            '.job-qualifications',
            # Fallback selectors
            '[class*="job-description"]',
            '[class*="job-content"]',
            '[class*="job-text"]',
            '[class*="job-body"]'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text().strip()
                if text and len(text) > 100:  # Ensure substantial content
                    return text
        
        # Fallback: try to find any large text block
        paragraphs = soup.find_all('p')
        description_parts = []
        
        for p in paragraphs:
            text = p.get_text().strip()
            if len(text) > 50:  # Only include substantial paragraphs
                description_parts.append(text)
        
        # Also look for div elements with substantial text
        divs = soup.find_all('div')
        for div in divs:
            text = div.get_text().strip()
            if len(text) > 100 and not any(child.name in ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] for child in div.children):
                description_parts.append(text)
        
        # Combine and clean up
        if description_parts:
            # Filter out None values and ensure all parts are strings
            valid_parts = [str(part).strip() for part in description_parts if part and str(part).strip()]
            if valid_parts:
                combined = '\n\n'.join(valid_parts)
                # Remove duplicates and clean up
                lines = combined.split('\n')
                unique_lines = []
                seen = set()
                for line in lines:
                    line = line.strip()
                    if line and line not in seen and len(line) > 10:
                        seen.add(line)
                        unique_lines.append(line)
                return '\n\n'.join(unique_lines)
        
        return "Description Not Found"

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
        """Extract comprehensive company information from LinkedIn"""
        try:
            company_info = {}
            
            # Company size
            size_selectors = [
                ".jobs-unified-top-card__company-name + div",
                ".job-details-jobs-unified-top-card__company-name + div",
                ".company-info [class*='size']",
                ".employer-info [class*='size']",
                "[class*='company-size']",
                "[class*='employee-count']"
            ]
            company_info['size'] = self._safe_extract_text(driver, size_selectors)
            
            # Company industry
            industry_selectors = [
                ".company-info [class*='industry']",
                ".employer-info [class*='industry']",
                "[class*='company-industry']",
                "[class*='business-sector']",
                ".company-details [class*='industry']"
            ]
            company_info['industry'] = self._safe_extract_text(driver, industry_selectors)
            
            # Company website
            website_selectors = [
                ".jobs-company__company-logo",
                "a[href*='http'][class*='company']",
                "a[href*='www'][class*='company']",
                ".company-website a",
                ".employer-website a"
            ]
            company_info['website'] = self._safe_extract_attribute(driver, website_selectors, 'href')
            
            # Company type
            type_selectors = [
                ".company-info [class*='type']",
                ".employer-info [class*='type']",
                "[class*='company-type']",
                "[class*='business-type']"
            ]
            company_info['company_type'] = self._safe_extract_text(driver, type_selectors)
            
            # Company specialties
            specialties_selectors = [
                ".company-info [class*='specialties']",
                ".employer-info [class*='specialties']",
                "[class*='company-specialties']",
                "[class*='focus-areas']"
            ]
            specialties_text = self._safe_extract_text(driver, specialties_selectors)
            if specialties_text:
                company_info['specialties'] = [s.strip() for s in specialties_text.split(',') if s.strip()]
            
            # Company description
            desc_selectors = [
                ".company-info [class*='description']",
                ".employer-info [class*='description']",
                "[class*='company-description']",
                "[class*='about-company']"
            ]
            company_info['description'] = self._safe_extract_text(driver, desc_selectors)
            
            return company_info
        except Exception as e:
            print(f"Error extracting company info: {e}")
            return {}

    def _extract_job_insights(self, driver) -> Dict[str, Any]:
        """Extract comprehensive job insights and additional details from LinkedIn"""
        try:
            insights = {}
            
            # Job insights section
            insight_selectors = [
                ".job-details-preferences-and-skills",
                ".job-insights",
                ".job-preferences",
                ".job-details__insights",
                "[class*='job-insights']",
                "[class*='job-preferences']"
            ]
            
            for selector in insight_selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if text:
                            # Extract seniority level
                            if 'seniority level' in text.lower() or 'level' in text.lower():
                                insights['seniority_level'] = text
                            # Extract employment type
                            elif 'employment type' in text.lower() or 'job type' in text.lower():
                                insights['employment_type'] = text
                            # Extract job function
                            elif 'job function' in text.lower() or 'function' in text.lower():
                                insights['job_function'] = text
                            # Extract industries
                            elif 'industries' in text.lower():
                                insights['industries'] = text
                            # Extract experience level
                            elif 'experience' in text.lower() and 'level' in text.lower():
                                insights['experience_level'] = text
                except Exception as e:
                    continue
            
            # Additional job details
            additional_selectors = [
                ".job-details__additional-info",
                ".job-meta",
                ".job-requirements-summary",
                "[class*='job-requirements']",
                "[class*='job-qualifications']"
            ]
            
            for selector in additional_selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if text:
                            # Extract salary information
                            if any(word in text.lower() for word in ['salary', 'compensation', 'pay', '$']):
                                insights['salary_info'] = text
                            # Extract benefits
                            elif any(word in text.lower() for word in ['benefits', 'perks', 'insurance', '401k']):
                                insights['benefits'] = text
                            # Extract requirements
                            elif any(word in text.lower() for word in ['requirements', 'qualifications', 'skills']):
                                insights['requirements'] = text
                            # Extract responsibilities
                            elif any(word in text.lower() for word in ['responsibilities', 'duties', 'tasks']):
                                insights['responsibilities'] = text
                except Exception as e:
                    continue
            
            # Extract company culture and work environment
            culture_selectors = [
                ".company-culture",
                ".work-environment",
                ".company-values",
                "[class*='culture']",
                "[class*='environment']"
            ]
            
            for selector in culture_selectors:
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if text and len(text) > 20:
                            if 'culture' in selector.lower():
                                insights['company_culture'] = text
                            elif 'environment' in selector.lower():
                                insights['work_environment'] = text
                except Exception as e:
                    continue
            
            return insights
        except Exception as e:
            print(f"Error extracting job insights: {e}")
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
