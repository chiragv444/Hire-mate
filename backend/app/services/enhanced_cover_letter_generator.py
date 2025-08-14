import os
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import re

# Try to import langchain dependencies, fallback to None if not available
try:
    from langchain.chat_models import ChatOpenAI
    from langchain.prompts import PromptTemplate
    from langchain.output_parsers import PydanticOutputParser
    from pydantic import BaseModel, Field
    LANGCHAIN_AVAILABLE = True
except ImportError:
    print("LangChain not available, using basic generation only")
    LANGCHAIN_AVAILABLE = False
    # Create dummy classes for type hints
    class BaseModel:
        def dict(self):
            return {}
    class Field:
        def __init__(self, *args, **kwargs):
            pass

# ----------------------------
# Pydantic models for cover letter generation
# ----------------------------

class CoverLetterStructure(BaseModel):
    """Structured cover letter output"""
    opening_paragraph: str = Field(description="Strong opening paragraph that introduces the candidate and expresses interest in the position")
    body_paragraphs: List[str] = Field(description="2-3 body paragraphs highlighting relevant experience, skills, and achievements")
    closing_paragraph: str = Field(description="Professional closing paragraph with call to action and contact information")
    full_content: str = Field(description="Complete cover letter content without bullet points, formatted as a professional letter")
    word_count: int = Field(description="Total word count of the cover letter")
    paragraph_count: int = Field(description="Total number of paragraphs")
    generated_at: str = Field(description="Timestamp when the cover letter was generated")

# ----------------------------
# Enhanced Cover Letter Generator Class
# ----------------------------

class EnhancedCoverLetterGenerator:
    def __init__(self):
        self.langchain_available = LANGCHAIN_AVAILABLE
        
        if self.langchain_available:
            self.openai_api_key = os.getenv("OPENAI_API_KEY")
            if not self.openai_api_key:
                print("Warning: OPENAI_API_KEY not found, falling back to basic generation")
                self.langchain_available = False
            else:
                try:
                    self.llm = ChatOpenAI(
                        model=os.getenv("COVER_LETTER_MODEL", "gpt-4"),
                        temperature=0.7,  # Slightly creative for engaging content
                        openai_api_key=self.openai_api_key
                    )
                    self.parser = PydanticOutputParser(pydantic_object=CoverLetterStructure)
                    self.prompt_template = PromptTemplate(
                        template=self._get_cover_letter_prompt(),
                        input_variables=["job_title", "company_name", "job_location", "job_description", "resume_data"],
                        partial_variables={"format_instructions": self.parser.get_format_instructions()}
                    )
                except Exception as e:
                    print(f"Error initializing LangChain: {e}, falling back to basic generation")
                    self.langchain_available = False
        
        # Initialize cover letter templates and patterns
        self._initialize_templates()
    
    def _initialize_templates(self):
        """Initialize professional cover letter templates and patterns"""
        # Professional opening templates
        self.opening_templates = [
            "I am writing to express my strong interest in the {position} position at {company}. With my {experience_years}+ years of experience in {field}, I am confident in my ability to make significant contributions to your team.",
            "I am excited to apply for the {position} role at {company}. My background in {field} and proven track record of {key_achievement} make me an ideal candidate for this position.",
            "I am writing to apply for the {position} position at {company}. My expertise in {field} and demonstrated success in {key_skill} align perfectly with your requirements.",
            "I am thrilled to submit my application for the {position} position at {company}. My {experience_years}+ years of experience in {field} and passion for {industry} make me an excellent fit for this role."
        ]
        
        # Professional closing templates
        self.closing_templates = [
            "I am excited about the opportunity to contribute to {company}'s continued success and would welcome the chance to discuss how my skills and experience align with your needs. Thank you for considering my application.",
            "I look forward to discussing how my background, skills, and enthusiasm can contribute to {company}'s mission. Thank you for your time and consideration.",
            "I am confident that my skills and experience make me a strong candidate for this position, and I would welcome the opportunity to discuss how I can contribute to {company}'s success. Thank you for your consideration.",
            "I am eager to bring my expertise to {company} and contribute to your team's achievements. I look forward to discussing this opportunity with you. Thank you for your time and consideration."
        ]
        
        # Action verbs for achievements
        self.action_verbs = [
            'developed', 'implemented', 'managed', 'created', 'designed', 'led', 'improved', 'achieved',
            'delivered', 'established', 'coordinated', 'facilitated', 'optimized', 'streamlined', 'enhanced',
            'built', 'launched', 'executed', 'oversaw', 'supervised', 'mentored', 'trained', 'analyzed',
            'increased', 'reduced', 'expanded', 'consolidated', 'innovated', 'transformed', 'scaled'
        ]
    
    def _get_cover_letter_prompt(self) -> str:
        """Get the comprehensive cover letter generation prompt"""
        return """
You are an expert career consultant and cover letter writer with 20+ years of experience helping professionals create compelling, ATS-optimized cover letters. You understand the nuances of different industries and can craft personalized, professional cover letters that stand out.

## TASK
Generate a professional, compelling cover letter for a job application based on the provided resume data and job description. The cover letter should be engaging, specific, and demonstrate clear value proposition.

## JOB INFORMATION
- Position: {job_title}
- Company: {company_name}
- Location: {job_location}
- Job Description: {job_description}

## RESUME DATA
{resume_data}

## COVER LETTER REQUIREMENTS

### 1. OPENING PARAGRAPH (2-3 sentences)
- Start with a strong, engaging opening that immediately captures attention
- Clearly state the position and company you're applying for
- Express genuine interest and enthusiasm
- Mention your relevant experience level or key qualification
- Make a connection between your background and the role

### 2. BODY PARAGRAPHS (2-3 paragraphs, 3-4 sentences each)
- **First Body Paragraph**: Highlight your most relevant experience and achievements
  - Focus on quantifiable results and specific accomplishments
  - Use action verbs and industry-specific terminology
  - Connect your experience directly to the job requirements
  
- **Second Body Paragraph**: Emphasize your key skills and qualifications
  - Highlight technical skills, soft skills, and domain expertise
  - Provide specific examples of how you've used these skills
  - Show how your skills align with the job requirements
  
- **Third Body Paragraph** (if needed): Address any specific requirements or challenges
  - Mention relevant certifications, education, or special projects
  - Show your understanding of the company's needs
  - Demonstrate your problem-solving abilities

### 3. CLOSING PARAGRAPH (2-3 sentences)
- Reiterate your interest in the position and company
- Express confidence in your ability to contribute
- Request an interview or next steps
- Thank the reader for their time and consideration
- Include a professional closing

## WRITING GUIDELINES

### PROFESSIONAL TONE & STYLE
- Use professional, confident language without being arrogant
- Write in first person, active voice
- Keep sentences clear and concise (15-20 words average)
- Avoid jargon unless it's industry-specific and relevant
- Use industry-appropriate terminology from the job description

### CONTENT QUALITY
- Be specific and provide concrete examples
- Quantify achievements when possible (numbers, percentages, metrics)
- Show enthusiasm and genuine interest in the company/role
- Demonstrate understanding of the company's needs and challenges
- Avoid generic statements - personalize everything

### FORMATTING & STRUCTURE
- NO bullet points - use flowing paragraphs
- Maintain professional letter format
- Keep total length to 250-400 words (1 page maximum)
- Use clear paragraph breaks for readability
- Ensure smooth transitions between paragraphs

### ATS OPTIMIZATION
- Include relevant keywords from the job description naturally
- Use industry-standard terminology
- Avoid overly creative formatting that might confuse ATS systems
- Ensure content is scannable and well-structured

## OUTPUT FORMAT
Return your cover letter in the exact format specified by the format instructions. Ensure all fields are properly populated with professional, engaging content that demonstrates the candidate's value proposition.

## FINAL INSTRUCTIONS
Create a cover letter that makes the hiring manager want to meet this candidate. Focus on specific achievements, relevant skills, and genuine enthusiasm for the role. Make every word count and ensure the letter flows naturally from opening to closing.

{format_instructions}

## PROFESSIONAL COVER LETTER
"""
    
    async def generate_cover_letter(
        self, 
        job_data: Dict[str, Any], 
        resume_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a professional cover letter using LangChain for intelligent content
        """
        start_time = datetime.now()
        
        try:
            if self.langchain_available:
                # Use LangChain for enhanced generation
                cover_letter = await self._generate_with_langchain(job_data, resume_data)
                generation_method = "openai_langchain"
            else:
                # Fallback to template-based generation
                cover_letter = await self._generate_with_templates(job_data, resume_data)
                generation_method = "templates_only"
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = int((end_time - start_time).total_seconds() * 1000)
            
            # Add metadata
            cover_letter['generation_method'] = generation_method
            cover_letter['processing_time_ms'] = processing_time
            
            return cover_letter
            
        except Exception as e:
            print(f"Error in cover letter generation: {e}")
            # Return fallback cover letter
            return await self._generate_with_templates(job_data, resume_data)
    
    async def _generate_with_langchain(self, job_data: Dict[str, Any], resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate cover letter using LangChain and GPT"""
        try:
            # Prepare the prompt with formatted data
            formatted_resume_data = self._format_resume_data_for_prompt(resume_data)
            
            prompt = self.prompt_template.format(
                job_title=job_data.get('title', 'the position'),
                company_name=job_data.get('company', 'your company'),
                job_location=job_data.get('location', 'the specified location'),
                job_description=job_data.get('description', ''),
                resume_data=formatted_resume_data
            )
            
            # Get response from LLM
            response = self.llm.predict(prompt)
            
            # Parse the response
            parsed_result = self.parser.parse(response)
            result_dict = parsed_result.dict()
            
            # Validate and clean the results
            result_dict = self._validate_cover_letter_results(result_dict)
            
            return result_dict
            
        except Exception as e:
            print(f"LangChain generation failed: {e}, falling back to templates")
            return await self._generate_with_templates(job_data, resume_data)
    
    async def _generate_with_templates(self, job_data: Dict[str, Any], resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback template-based cover letter generation"""
        try:
            # Extract key information
            job_title = job_data.get('title', 'the position')
            company_name = job_data.get('company', 'your company')
            job_location = job_data.get('location', 'the specified location')
            
            # Get resume information
            resume_parsed = resume_data.get('parsed_data', {})
            experience = resume_parsed.get('experience', [])
            skills = resume_parsed.get('skills', {})
            education = resume_parsed.get('education', [])
            
            # Calculate experience years
            experience_years = self._calculate_experience_years(experience)
            
            # Determine field/industry
            field = self._determine_field(job_title, skills, experience)
            
            # Generate opening paragraph
            opening = self._generate_opening_paragraph(
                job_title, company_name, experience_years, field
            )
            
            # Generate body paragraphs
            body_paragraphs = self._generate_body_paragraphs(
                job_data, resume_parsed, skills, experience
            )
            
            # Generate closing paragraph
            closing = self._generate_closing_paragraph(company_name)
            
            # Combine into full content
            full_content = self._combine_paragraphs(opening, body_paragraphs, closing)
            
            # Calculate metrics
            word_count = len(full_content.split())
            paragraph_count = 2 + len(body_paragraphs)  # opening + body + closing
            
            return {
                'opening_paragraph': opening,
                'body_paragraphs': body_paragraphs,
                'closing_paragraph': closing,
                'full_content': full_content,
                'word_count': word_count,
                'paragraph_count': paragraph_count,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Template generation failed: {e}")
            return self._get_fallback_cover_letter()
    
    def _format_resume_data_for_prompt(self, resume_data: Dict[str, Any]) -> str:
        """Format resume data for the LangChain prompt"""
        try:
            parsed_data = resume_data.get('parsed_data', {})
            
            # Extract key information
            personal_info = parsed_data.get('personal_info', {})
            experience = parsed_data.get('experience', [])
            skills = parsed_data.get('skills', {})
            education = parsed_data.get('education', [])
            projects = parsed_data.get('projects', [])
            certifications = parsed_data.get('certifications', [])
            
            # Format experience
            experience_text = ""
            for exp in experience[:3]:  # Top 3 experiences
                title = exp.get('title', '')
                company = exp.get('company', '')
                duration = exp.get('duration', '')
                description = exp.get('description', [])
                
                if title and company:
                    experience_text += f"\n- {title} at {company}"
                    if duration:
                        experience_text += f" ({duration})"
                    if description:
                        experience_text += f": {description[0][:100]}..." if description else ""
            
            # Format skills
            technical_skills = skills.get('technical', [])
            soft_skills = skills.get('soft', [])
            domain_skills = skills.get('domain', [])
            
            skills_text = f"\nTechnical Skills: {', '.join(technical_skills[:10])}"
            if soft_skills:
                skills_text += f"\nSoft Skills: {', '.join(soft_skills[:8])}"
            if domain_skills:
                skills_text += f"\nDomain Skills: {', '.join(domain_skills[:5])}"
            
            # Format education
            education_text = ""
            for edu in education[:2]:  # Top 2 education entries
                degree = edu.get('degree', '')
                institution = edu.get('institution', '')
                graduation_year = edu.get('graduation_year', '')
                
                if degree and institution:
                    education_text += f"\n- {degree} from {institution}"
                    if graduation_year:
                        education_text += f" ({graduation_year})"
            
            # Format projects
            projects_text = ""
            for project in projects[:3]:  # Top 3 projects
                name = project.get('name', '')
                description = project.get('description', '')
                technologies = project.get('technologies', [])
                
                if name:
                    projects_text += f"\n- {name}"
                    if description:
                        projects_text += f": {description[:100]}..."
                    if technologies:
                        projects_text += f" (Tech: {', '.join(technologies[:5])})"
            
            # Combine all sections
            formatted_data = f"""
RESUME SUMMARY:
{experience_text}

SKILLS:
{skills_text}

EDUCATION:
{education_text}

PROJECTS:
{projects_text}

CERTIFICATIONS: {', '.join([cert.get('name', '') for cert in certifications[:3]])}
"""
            
            return formatted_data.strip()
            
        except Exception as e:
            print(f"Error formatting resume data: {e}")
            return "Resume data could not be formatted properly."
    
    def _validate_cover_letter_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean cover letter results"""
        try:
            # Ensure all required fields exist
            required_fields = [
                'opening_paragraph', 'body_paragraphs', 'closing_paragraph', 
                'full_content', 'word_count', 'paragraph_count'
            ]
            
            for field in required_fields:
                if field not in results:
                    results[field] = self._get_default_value(field)
            
            # Ensure lists are actually lists
            if 'body_paragraphs' in results and not isinstance(results['body_paragraphs'], list):
                results['body_paragraphs'] = []
            
            # Ensure generated_at exists
            if 'generated_at' not in results:
                results['generated_at'] = datetime.now().isoformat()
            
            # Clean up content - remove any bullet points
            if 'full_content' in results:
                results['full_content'] = self._remove_bullet_points(results['full_content'])
            
            return results
            
        except Exception as e:
            print(f"Error validating results: {e}")
            return self._get_fallback_cover_letter()
    
    def _get_default_value(self, field: str) -> Any:
        """Get default values for missing fields"""
        defaults = {
            'opening_paragraph': 'I am writing to express my interest in this position.',
            'body_paragraphs': ['I believe my experience and skills make me a strong candidate for this role.'],
            'closing_paragraph': 'Thank you for considering my application.',
            'full_content': 'Cover letter content could not be generated.',
            'word_count': 0,
            'paragraph_count': 0
        }
        return defaults.get(field, '')
    
    def _get_fallback_cover_letter(self) -> Dict[str, Any]:
        """Get fallback cover letter when generation fails"""
        return {
            'opening_paragraph': 'I am writing to express my interest in this position.',
            'body_paragraphs': ['I believe my experience and skills make me a strong candidate for this role.'],
            'closing_paragraph': 'Thank you for considering my application.',
            'full_content': 'Cover letter content could not be generated at this time. Please try again.',
            'word_count': 0,
            'paragraph_count': 0,
            'generated_at': datetime.now().isoformat()
        }
    
    def _remove_bullet_points(self, content: str) -> str:
        """Remove bullet points and convert to flowing paragraphs"""
        # Remove common bullet point characters
        content = re.sub(r'[•◦▪■–—-]\s*', '', content)
        content = re.sub(r'^\s*[-*]\s*', '', content, flags=re.MULTILINE)
        
        # Convert multiple newlines to paragraph breaks
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content.strip()
    
    def _calculate_experience_years(self, experience: List[Dict]) -> int:
        """Calculate total years of experience"""
        try:
            total_years = 0
            for exp in experience:
                duration = exp.get('duration', '')
                if duration:
                    # Extract years from duration string
                    years_match = re.search(r'(\d+)', duration)
                    if years_match:
                        total_years += int(years_match.group(1))
            
            return max(1, total_years)  # Minimum 1 year
        except:
            return 3  # Default fallback
    
    def _determine_field(self, job_title: str, skills: Dict, experience: List[Dict]) -> str:
        """Determine the professional field based on job title and skills"""
        job_lower = job_title.lower()
        
        if any(word in job_lower for word in ['developer', 'engineer', 'programmer', 'software']):
            return 'software development'
        elif any(word in job_lower for word in ['designer', 'design']):
            return 'design'
        elif any(word in job_lower for word in ['manager', 'lead', 'director']):
            return 'management'
        elif any(word in job_lower for word in ['analyst', 'analysis']):
            return 'data analysis'
        elif any(word in job_lower for word in ['marketing', 'marketer']):
            return 'marketing'
        elif any(word in job_lower for word in ['sales', 'salesperson']):
            return 'sales'
        else:
            return 'professional services'
    
    def _generate_opening_paragraph(self, job_title: str, company_name: str, experience_years: int, field: str) -> str:
        """Generate opening paragraph using templates"""
        import random
        
        template = random.choice(self.opening_templates)
        key_achievement = "delivering results"  # Default achievement
        
        return template.format(
            position=job_title,
            company=company_name,
            experience_years=experience_years,
            field=field,
            key_achievement=key_achievement
        )
    
    def _generate_body_paragraphs(self, job_data: Dict[str, Any], resume_parsed: Dict[str, Any], skills: Dict, experience: List[Dict]) -> List[str]:
        """Generate body paragraphs highlighting relevant experience and skills"""
        paragraphs = []
        
        # First paragraph: Experience and achievements
        if experience:
            recent_exp = experience[0]
            title = recent_exp.get('title', '')
            company = recent_exp.get('company', '')
            description = recent_exp.get('description', [])
            
            if title and company:
                exp_text = f"In my current role as {title} at {company}, I have successfully "
                if description:
                    # Take first achievement and make it flow naturally
                    achievement = description[0].replace('-', '').strip()
                    exp_text += achievement.lower()
                else:
                    exp_text += "delivered significant results and contributed to team success."
                
                paragraphs.append(exp_text)
        
        # Second paragraph: Skills and qualifications
        technical_skills = skills.get('technical', [])
        soft_skills = skills.get('soft', [])
        
        if technical_skills or soft_skills:
            skills_text = "My technical expertise includes "
            if technical_skills:
                skills_text += f"{', '.join(technical_skills[:5])}. "
            
            if soft_skills:
                skills_text += f"I also bring strong {', '.join(soft_skills[:3])} skills, "
            
            skills_text += "which enable me to collaborate effectively with cross-functional teams and deliver high-quality results."
            paragraphs.append(skills_text)
        
        # Third paragraph: Connection to job requirements
        job_skills = job_data.get('parsed_skills', [])
        if job_skills:
            connection_text = f"The {job_data.get('title', 'position')} role particularly appeals to me because "
            connection_text += f"it requires expertise in {', '.join(job_skills[:3])}, areas where I have demonstrated proficiency. "
            connection_text += "I am excited about the opportunity to apply my skills in this challenging and rewarding position."
            paragraphs.append(connection_text)
        
        return paragraphs
    
    def _generate_closing_paragraph(self, company_name: str) -> str:
        """Generate closing paragraph using templates"""
        import random
        
        template = random.choice(self.closing_templates)
        return template.format(company=company_name)
    
    def _combine_paragraphs(self, opening: str, body_paragraphs: List[str], closing: str) -> str:
        """Combine all paragraphs into a flowing cover letter"""
        # Start with opening
        content = opening
        
        # Add body paragraphs with proper spacing
        for paragraph in body_paragraphs:
            content += "\n\n" + paragraph
        
        # Add closing with proper spacing
        content += "\n\n" + closing
        
        return content

# Initialize enhanced cover letter generator
try:
    enhanced_cover_letter_generator = EnhancedCoverLetterGenerator()
except Exception as e:
    print(f"Error initializing enhanced cover letter generator: {e}")
    enhanced_cover_letter_generator = None
