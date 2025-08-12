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
    print("LangChain not available, using basic analysis only")
    LANGCHAIN_AVAILABLE = False
    # Create dummy classes for type hints
    class BaseModel:
        def dict(self):
            return {}
    class Field:
        def __init__(self, *args, **kwargs):
            pass

# ----------------------------
# Pydantic models for analysis results
# ----------------------------

class KeywordAnalysis(BaseModel):
    missing_keywords: List[str] = Field(description="Important keywords from job description missing in resume", default_factory=list)
    present_keywords: List[str] = Field(description="Keywords from job description found in resume", default_factory=list)
    keyword_coverage_percentage: float = Field(description="Percentage of job keywords covered by resume", default=0.0)

class ATSEvaluation(BaseModel):
    formatting_score: float = Field(description="Score for ATS-friendly formatting (0-100)", default=0.0)
    keyword_density: float = Field(description="Score for appropriate keyword density (0-100)", default=0.0)
    structure_score: float = Field(description="Score for clear document structure (0-100)", default=0.0)
    overall_ats_score: float = Field(description="Overall ATS compatibility score (0-100)", default=0.0)
    feedback: List[str] = Field(description="Specific ATS improvement recommendations", default_factory=list)

class SkillAnalysis(BaseModel):
    matching_skills: List[str] = Field(description="Skills from resume that match job requirements", default_factory=list)
    missing_skills: List[str] = Field(description="Required skills missing from resume", default_factory=list)
    skill_match_percentage: float = Field(description="Percentage of required skills matched", default=0.0)
    skill_gaps: List[str] = Field(description="Critical skill gaps that need addressing", default_factory=list)

class ExperienceAlignment(BaseModel):
    experience_relevance: float = Field(description="How well resume experience aligns with job requirements (0-100)", default=0.0)
    experience_highlighting: List[str] = Field(description="Specific experiences that should be emphasized", default_factory=list)
    experience_gaps: List[str] = Field(description="Experience areas that need development", default_factory=list)

class ResumeAnalysisResults(BaseModel):
    # Core Scores
    match_score: float = Field(description="Overall compatibility score between resume and job (0-100)", default=0.0)
    ats_score: float = Field(description="Overall ATS compatibility score (0-100)", default=0.0)
    
    # Detailed Analysis
    keyword_analysis: KeywordAnalysis = Field(description="Analysis of keyword coverage and missing terms")
    skill_analysis: SkillAnalysis = Field(description="Analysis of skill matching and gaps")
    ats_evaluation: ATSEvaluation = Field(description="Detailed ATS compatibility evaluation")
    experience_alignment: ExperienceAlignment = Field(description="Experience relevance analysis")
    
    # Actionable Insights
    missing_keywords: List[str] = Field(description="Critical missing keywords for ATS optimization", default_factory=list)
    ats_feedback: List[str] = Field(description="Specific recommendations for ATS improvement", default_factory=list)
    suggestions: List[str] = Field(description="Strategic recommendations to improve overall match", default_factory=list)
    
    # Fit Assessment
    fit_level: str = Field(description="Overall fit assessment: 'Great Fit', 'Possible Fit', 'Not Fit'", default="Not Fit")
    confidence_score: float = Field(description="Confidence in the analysis results (0-100)", default=0.0)
    
    # Metadata
    analysis_timestamp: str = Field(description="When the analysis was performed", default="")
    analysis_method: str = Field(description="Method used for analysis", default="")
    processing_time_ms: int = Field(description="Time taken to process analysis in milliseconds", default=0)

# ----------------------------
# Enhanced Resume Analyzer Class
# ----------------------------

class EnhancedResumeAnalyzer:
    def __init__(self):
        self.langchain_available = LANGCHAIN_AVAILABLE
        
        if self.langchain_available:
            self.openai_api_key = os.getenv("OPENAI_API_KEY")
            if not self.openai_api_key:
                print("Warning: OPENAI_API_KEY not found, falling back to basic analysis")
                self.langchain_available = False
            else:
                try:
                    self.llm = ChatOpenAI(
                        model=os.getenv("RESUME_ANALYZER_MODEL", "gpt-4"),
                        temperature=0.1,  # Low temperature for consistent analysis
                        openai_api_key=self.openai_api_key
                    )
                    self.parser = PydanticOutputParser(pydantic_object=ResumeAnalysisResults)
                    self.prompt_template = PromptTemplate(
                        template=self._get_analysis_prompt(),
                        input_variables=["job_description", "resume_text"],
                        partial_variables={"format_instructions": self.parser.get_format_instructions()}
                    )
                except Exception as e:
                    print(f"Error initializing LangChain: {e}, falling back to basic analysis")
                    self.langchain_available = False
        
        # Initialize analysis patterns and rules
        self._initialize_analysis_patterns()
    
    def _initialize_analysis_patterns(self):
        """Initialize patterns and rules for analysis"""
        # Universal job keywords that significantly impact ATS scoring across ALL professions
        self.critical_keywords = {
            'technical_skills': [
                # Programming & Development
                'python', 'javascript', 'java', 'react', 'angular', 'vue', 'node.js', 'sql', 'aws', 'docker', 'kubernetes',
                'machine learning', 'ai', 'data science', 'cloud computing', 'devops', 'agile', 'scrum', 'git',
                'rest api', 'microservices', 'ci/cd', 'terraform', 'jenkins', 'mongodb', 'postgresql', 'redis',
                # Design & Creative
                'photoshop', 'illustrator', 'indesign', 'figma', 'sketch', 'autocad', 'solidworks', 'maya', 'blender',
                'after effects', 'premiere pro', 'final cut pro', 'motion graphics', '3d modeling', 'animation',
                # Business Software
                'excel', 'powerpoint', 'word', 'outlook', 'sharepoint', 'teams', 'salesforce', 'hubspot', 'quickbooks',
                'sap', 'oracle', 'tableau', 'power bi', 'qlik', 'looker', 'jira', 'confluence', 'slack', 'trello',
                # Medical & Healthcare
                'epic', 'cerner', 'meditech', 'allscripts', 'emr', 'ehr', 'pacs', 'medical devices', 'laboratory equipment',
                'diagnostic tools', 'imaging', 'radiology', 'pathology', 'clinical research', 'hipaa compliance',
                # Engineering & Manufacturing
                'matlab', 'labview', 'plc', 'scada', 'cnc', 'cad', 'fem analysis', 'lean manufacturing', 'six sigma',
                'quality control', 'process improvement', 'iso standards', 'fda regulations', 'gmp', 'haccp',
                # Finance & Accounting
                'bloomberg', 'financial modeling', 'risk management', 'trading platforms', 'derivatives', 'forex',
                'portfolio management', 'audit', 'compliance', 'gaap', 'ifrs', 'tax preparation', 'budgeting',
                # Legal
                'litigation', 'contract law', 'intellectual property', 'corporate law', 'family law', 'criminal law',
                'real estate law', 'tax law', 'employment law', 'immigration law', 'legal research', 'case management',
                # Education
                'curriculum development', 'lesson planning', 'assessment', 'classroom management', 'special education',
                'esl', 'stem', 'early childhood', 'higher education', 'learning management systems', 'edtech',
                # Marketing & Sales
                'digital marketing', 'seo', 'sem', 'social media', 'content marketing', 'brand management',
                'market research', 'analytics', 'ppc', 'email marketing', 'influencer marketing', 'crm',
                # Creative Industries
                'brand identity', 'visual communication', 'user experience', 'user interface', 'typography',
                'color theory', 'composition', 'storytelling', 'copywriting', 'content creation', 'video production'
            ],
            'soft_skills': [
                'leadership', 'communication', 'teamwork', 'problem solving', 'project management', 'collaboration',
                'time management', 'critical thinking', 'creativity', 'adaptability', 'mentoring', 'stakeholder management',
                'emotional intelligence', 'conflict resolution', 'negotiation', 'presentation', 'public speaking',
                'customer service', 'sales', 'coaching', 'facilitation', 'decision making', 'strategic thinking',
                'innovation', 'resilience', 'cultural awareness', 'flexibility', 'organization', 'attention to detail'
            ],
            'experience_levels': [
                'entry level', 'junior', 'mid level', 'senior', 'lead', 'principal', 'architect', 'manager', 'director',
                'vp', 'c-level', 'executive', 'associate', 'specialist', 'coordinator', 'supervisor', 'team lead',
                'consultant', 'advisor', 'expert', 'guru', 'ninja', 'rockstar', 'evangelist', 'ambassador'
            ],
            'industry_specific': {
                'healthcare': ['patient care', 'clinical', 'medical', 'nursing', 'pharmacy', 'therapy', 'diagnosis', 'treatment'],
                'finance': ['financial analysis', 'investment', 'banking', 'insurance', 'credit', 'lending', 'underwriting'],
                'education': ['teaching', 'instruction', 'curriculum', 'assessment', 'student', 'academic', 'pedagogy'],
                'legal': ['litigation', 'legal', 'court', 'attorney', 'lawyer', 'paralegal', 'legal research'],
                'marketing': ['campaign', 'brand', 'market', 'advertising', 'promotion', 'public relations', 'media'],
                'sales': ['sales', 'revenue', 'clients', 'prospects', 'quota', 'territory', 'account management'],
                'engineering': ['design', 'development', 'testing', 'maintenance', 'quality', 'safety', 'standards'],
                'retail': ['customer service', 'inventory', 'merchandising', 'point of sale', 'store operations'],
                'hospitality': ['guest service', 'hotel', 'restaurant', 'tourism', 'event planning', 'customer experience'],
                'government': ['policy', 'regulations', 'compliance', 'public service', 'administration', 'bureaucracy']
            }
        }
        
        # ATS optimization patterns
        self.ats_patterns = {
            'formatting_issues': [
                r'[^\w\s\-\.\,\;\:\!\?\(\)\[\]\{\}]',  # Special characters that confuse ATS
                r'\s{3,}',  # Multiple spaces
                r'[^\x00-\x7F]',  # Non-ASCII characters
            ],
            'structure_markers': [
                r'experience|work history|employment',
                r'education|academic|degree',
                r'skills|competencies|expertise',
                r'projects|achievements|accomplishments'
            ]
        }
    
    def _get_analysis_prompt(self) -> str:
        """Get the comprehensive analysis prompt"""
        return """
You are a senior career consultant and resume analyst with 30+ years of experience in AI, software development, and recruiting across ALL industries and professions. You have deep expertise in ATS optimization, job matching, and career development for every imaginable role from entry-level to C-suite executives.

## ANALYSIS CONTEXT
You are analyzing a resume for compatibility with a specific job posting. This analysis will help the candidate understand their fit and improve their application. Your insights should be PROFESSIONAL, ACTIONABLE, and INDUSTRY-AWARE.

## JOB DESCRIPTION
{job_description}

## RESUME CONTENT
{resume_text}

## ANALYSIS REQUIREMENTS

### 1. MATCH SCORE (0-100) - PROFESSIONAL ASSESSMENT
Calculate overall compatibility considering:
- **Skill Alignment (35% weight)**: Technical skills, soft skills, industry-specific knowledge
- **Experience Relevance (30% weight)**: Work history alignment with job requirements
- **Keyword Coverage (20% weight)**: ATS optimization and industry terminology
- **Overall Presentation (15% weight)**: Professional formatting and clarity

### 2. ATS SCORE (0-100) - TECHNICAL OPTIMIZATION
Evaluate ATS compatibility based on:
- **Keyword Strategy (30% weight)**: Optimal density, placement, and industry relevance
- **Document Structure (25% weight)**: Clear sections, headers, and organization
- **Content Clarity (25% weight)**: Readability, action verbs, and quantifiable achievements
- **Technical Formatting (20% weight)**: ATS-friendly formatting and compatibility

### 3. COMPREHENSIVE KEYWORD ANALYSIS
- **Critical Missing Keywords**: Industry-specific terms that will hurt ATS scoring
- **Present Keywords**: Successfully matched terms and their context
- **Keyword Coverage Percentage**: Mathematical accuracy of coverage
- **Industry Context**: Understanding of role-specific terminology

### 4. PROFESSIONAL SKILL ANALYSIS
- **Technical Skills**: Hard skills, tools, and technologies
- **Soft Skills**: Leadership, communication, and interpersonal abilities
- **Industry Skills**: Domain-specific knowledge and expertise
- **Skill Gaps**: Critical missing competencies with development recommendations

### 5. EXPERIENCE ALIGNMENT ASSESSMENT
- **Relevance Score**: How well experience matches job requirements
- **Experience Highlighting**: Specific achievements that should be emphasized
- **Experience Gaps**: Areas needing development or alternative approaches
- **Career Progression**: Assessment of career trajectory alignment

### 6. PROFESSIONAL ATS FEEDBACK
Provide specific, actionable recommendations for:
- **Formatting Improvements**: Professional presentation enhancements
- **Keyword Optimization**: Strategic keyword placement and density
- **Structure Enhancements**: Clear section organization and headers
- **Content Clarity**: Professional language and achievement quantification

### 7. STRATEGIC CAREER RECOMMENDATIONS
Offer high-level professional guidance for:
- **Resume Improvements**: Specific enhancements for this role
- **Skill Development**: Professional development priorities
- **Experience Highlighting**: Strategic emphasis of relevant achievements
- **Application Strategy**: Overall approach to this opportunity

## PROFESSIONAL ANALYSIS GUIDELINES

### ACCURACY & PROFESSIONALISM
- Base all scores on concrete evidence from the provided texts
- Use precise percentages and specific examples
- Provide industry-aware, professional advice
- Ensure mathematical consistency and logical scoring

### INSIGHT QUALITY & ACTIONABILITY
- Provide specific, implementable recommendations
- Explain WHY each recommendation matters professionally
- Prioritize recommendations by impact and feasibility
- Consider both immediate improvements and long-term career development

### INDUSTRY AWARENESS
- Recognize industry-specific terminology and requirements
- Provide context-appropriate advice for the specific role
- Consider career progression within the industry
- Address industry-specific challenges and opportunities

### SCORING METHODOLOGY
- **Match Score**: Focus on actual content alignment and professional fit
- **ATS Score**: Emphasize technical optimization and industry keyword strategy
- **Confidence Score**: Based on analysis quality and data completeness
- Use consistent 0-100 scales throughout with professional justification

### KEYWORD STRATEGY
- Focus on industry-specific and role-specific keywords
- Consider keyword variations, synonyms, and industry jargon
- Prioritize keywords by frequency and importance in job description
- Distinguish between "must-have" and "nice-to-have" keywords

## OUTPUT FORMAT
Return your analysis in the exact format specified by the format instructions. Ensure all fields are properly populated with specific, actionable, professional insights.

## FINAL PROFESSIONAL INSTRUCTIONS
You are providing career guidance that could significantly impact someone's professional trajectory. Be thorough, specific, and actionable. Provide insights that can immediately improve their chances while also offering strategic guidance for long-term career development. Your analysis should reflect the expertise of a seasoned professional who understands the nuances of every industry and career level.

{format_instructions}

## PROFESSIONAL ANALYSIS RESULTS
"""
    
    async def analyze_resume_against_job(
        self, 
        job_description: str, 
        resume_text: str
    ) -> Dict[str, Any]:
        """
        Analyze resume against job description using LangChain for intelligent insights
        """
        start_time = datetime.now()
        
        try:
            if self.langchain_available:
                # Use LangChain for enhanced analysis
                analysis_results = await self._analyze_with_langchain(job_description, resume_text)
                analysis_method = "openai_langchain"
            else:
                # Fallback to rule-based analysis
                analysis_results = await self._analyze_with_rules(job_description, resume_text)
                analysis_method = "rules_only"
            
            # Calculate processing time
            end_time = datetime.now()
            processing_time = int((end_time - start_time).total_seconds() * 1000)
            
            # Add metadata
            analysis_results['analysis_timestamp'] = datetime.now().isoformat()
            analysis_results['analysis_method'] = analysis_method
            analysis_results['processing_time_ms'] = processing_time
            
            return analysis_results
            
        except Exception as e:
            print(f"Error in resume analysis: {e}")
            # Return fallback analysis
            return await self._analyze_with_rules(job_description, resume_text)
    
    async def _analyze_with_langchain(self, job_description: str, resume_text: str) -> Dict[str, Any]:
        """Perform analysis using LangChain and GPT"""
        try:
            # Prepare the prompt
            prompt = self.prompt_template.format(
                job_description=job_description,
                resume_text=resume_text
            )
            
            # Get response from LLM
            response = self.llm.predict(prompt)
            
            # Parse the response
            parsed_result = self.parser.parse(response)
            result_dict = parsed_result.dict()
            
            # Validate and clean the results
            result_dict = self._validate_analysis_results(result_dict)
            
            return result_dict
            
        except Exception as e:
            print(f"LangChain analysis failed: {e}, falling back to rules")
            return await self._analyze_with_rules(job_description, resume_text)
    
    async def _analyze_with_rules(self, job_description: str, resume_text: str) -> Dict[str, Any]:
        """Fallback rule-based analysis"""
        try:
            # Clean and normalize texts
            clean_job = self._clean_text(job_description)
            clean_resume = self._clean_text(resume_text)
            
            # Extract keywords and skills
            job_keywords = self._extract_job_keywords(clean_job)
            resume_keywords = self._extract_resume_keywords(clean_resume)
            
            # Calculate scores
            match_score = self._calculate_match_score(clean_resume, clean_job, resume_keywords, job_keywords)
            ats_score = self._calculate_ats_score(clean_resume, clean_job, resume_keywords, job_keywords)
            
            # Generate insights
            missing_keywords = self._identify_missing_keywords(job_keywords, resume_keywords)
            ats_feedback = self._generate_ats_feedback(clean_resume, clean_job)
            suggestions = self._generate_suggestions(missing_keywords, match_score)
            
            # Determine fit level
            fit_level = self._determine_fit_level(match_score)
            
            return {
                'match_score': round(match_score, 1),
                'ats_score': round(ats_score, 1),
                'missing_keywords': missing_keywords[:10],  # Top 10 missing keywords
                'ats_feedback': ats_feedback,
                'suggestions': suggestions,
                'fit_level': fit_level,
                'confidence_score': 75.0,  # Lower confidence for rule-based analysis
                'keyword_analysis': {
                    'missing_keywords': missing_keywords[:10],
                    'present_keywords': list(set(job_keywords) & set(resume_keywords))[:10],
                    'keyword_coverage_percentage': round((len(set(job_keywords) & set(resume_keywords)) / len(set(job_keywords))) * 100, 1) if job_keywords else 0
                },
                'skill_analysis': {
                    'matching_skills': list(set(job_keywords) & set(resume_keywords))[:10],
                    'missing_skills': missing_keywords[:10],
                    'skill_match_percentage': round((len(set(job_keywords) & set(resume_keywords)) / len(set(job_keywords))) * 100, 1) if job_keywords else 0,
                    'skill_gaps': missing_keywords[:5]
                },
                'ats_evaluation': {
                    'formatting_score': self._evaluate_formatting(clean_resume),
                    'keyword_density': self._evaluate_keyword_density(clean_resume, job_keywords),
                    'structure_score': self._evaluate_structure(clean_resume),
                    'overall_ats_score': round(ats_score, 1),
                    'feedback': ats_feedback
                },
                'experience_alignment': {
                    'experience_relevance': round(match_score * 0.8, 1),  # Correlate with match score
                    'experience_highlighting': self._identify_experience_highlights(clean_resume, clean_job),
                    'experience_gaps': missing_keywords[:5]
                }
            }
            
        except Exception as e:
            print(f"Rule-based analysis failed: {e}")
            return self._get_fallback_results()
    
    def _validate_analysis_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean analysis results"""
        try:
            # Ensure all required fields exist
            required_fields = [
                'match_score', 'ats_score', 'missing_keywords', 'ats_feedback', 
                'suggestions', 'fit_level', 'confidence_score'
            ]
            
            for field in required_fields:
                if field not in results:
                    results[field] = self._get_default_value(field)
            
            # Validate score ranges
            if 'match_score' in results:
                results['match_score'] = max(0, min(100, float(results['match_score'])))
            if 'ats_score' in results:
                results['ats_score'] = max(0, min(100, float(results['ats_score'])))
            if 'confidence_score' in results:
                results['confidence_score'] = max(0, min(100, float(results['confidence_score'])))
            
            # Ensure lists are actually lists
            list_fields = ['missing_keywords', 'ats_feedback', 'suggestions']
            for field in list_fields:
                if field in results and not isinstance(results[field], list):
                    results[field] = []
            
            return results
            
        except Exception as e:
            print(f"Error validating results: {e}")
            return self._get_fallback_results()
    
    def _get_default_value(self, field: str) -> Any:
        """Get default values for missing fields"""
        defaults = {
            'match_score': 0.0,
            'ats_score': 0.0,
            'missing_keywords': [],
            'ats_feedback': ['Analysis incomplete - please try again'],
            'suggestions': ['Unable to generate suggestions at this time'],
            'fit_level': 'Not Fit',
            'confidence_score': 0.0
        }
        return defaults.get(field, '')
    
    def _get_fallback_results(self) -> Dict[str, Any]:
        """Get fallback results when analysis fails"""
        return {
            'match_score': 0.0,
            'ats_score': 0.0,
            'missing_keywords': ['Analysis failed - please try again'],
            'ats_feedback': ['Unable to analyze ATS compatibility'],
            'suggestions': ['Please ensure your resume and job description are properly formatted'],
            'fit_level': 'Not Fit',
            'confidence_score': 0.0,
            'keyword_analysis': {
                'missing_keywords': [],
                'present_keywords': [],
                'keyword_coverage_percentage': 0.0
            },
            'skill_analysis': {
                'matching_skills': [],
                'missing_skills': [],
                'skill_match_percentage': 0.0,
                'skill_gaps': []
            },
            'ats_evaluation': {
                'formatting_score': 0.0,
                'keyword_density': 0.0,
                'structure_score': 0.0,
                'overall_ats_score': 0.0,
                'feedback': ['ATS analysis failed']
            },
            'experience_alignment': {
                'experience_relevance': 0.0,
                'experience_highlighting': [],
                'experience_gaps': []
            }
        }
    
    # Helper methods for rule-based analysis
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for analysis"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters that confuse ATS
        text = re.sub(r'[^\w\s\-\.\,\;\:\!\?\(\)\[\]\{\}]', ' ', text)
        # Normalize line breaks
        text = re.sub(r'\n+', ' ', text)
        return text.strip().lower()
    
    def _extract_job_keywords(self, job_text: str) -> List[str]:
        """Extract important keywords from job description"""
        keywords = []
        
        # Extract technical skills
        for skill in self.critical_keywords['technical_skills']:
            if skill.lower() in job_text:
                keywords.append(skill.lower())
        
        # Extract soft skills
        for skill in self.critical_keywords['soft_skills']:
            if skill.lower() in job_text:
                keywords.append(skill.lower())
        
        # Extract experience levels
        for level in self.critical_keywords['experience_levels']:
            if level.lower() in job_text:
                keywords.append(level.lower())
        
        # Extract additional keywords using frequency analysis
        words = job_text.split()
        word_freq = {}
        for word in words:
            if len(word) > 3 and word.isalpha():
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Add high-frequency words as keywords
        for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]:
            if word not in keywords:
                keywords.append(word)
        
        return list(set(keywords))
    
    def _extract_resume_keywords(self, resume_text: str) -> List[str]:
        """Extract keywords from resume"""
        keywords = []
        
        # Extract technical skills
        for skill in self.critical_keywords['technical_skills']:
            if skill.lower() in resume_text:
                keywords.append(skill.lower())
        
        # Extract soft skills
        for skill in self.critical_keywords['soft_skills']:
            if skill.lower() in resume_text:
                keywords.append(skill.lower())
        
        # Extract experience levels
        for level in self.critical_keywords['experience_levels']:
            if level.lower() in resume_text:
                keywords.append(level.lower())
        
        return list(set(keywords))
    
    def _calculate_match_score(self, resume_text: str, job_text: str, resume_keywords: List[str], job_keywords: List[str]) -> float:
        """Calculate overall match score"""
        if not job_keywords:
            return 0.0
        
        # Keyword matching (40% weight)
        keyword_match = len(set(resume_keywords) & set(job_keywords)) / len(set(job_keywords)) * 40
        
        # Text similarity (30% weight)
        resume_words = set(resume_text.split())
        job_words = set(job_text.split())
        if job_words:
            text_similarity = len(resume_words & job_words) / len(job_words) * 30
        else:
            text_similarity = 0
        
        # Content relevance (30% weight)
        relevant_sections = ['experience', 'skills', 'education', 'projects']
        section_relevance = 0
        for section in relevant_sections:
            if section in resume_text and section in job_text:
                section_relevance += 7.5  # 30/4 = 7.5 per section
        
        total_score = keyword_match + text_similarity + section_relevance
        return min(total_score, 100.0)
    
    def _calculate_ats_score(self, resume_text: str, job_text: str, resume_keywords: List[str], job_keywords: List[str]) -> float:
        """Calculate ATS compatibility score"""
        if not job_keywords:
            return 0.0
        
        # Keyword density (35% weight)
        keyword_density = self._evaluate_keyword_density(resume_text, job_keywords) * 0.35
        
        # Formatting (30% weight)
        formatting_score = self._evaluate_formatting(resume_text) * 0.30
        
        # Structure (20% weight)
        structure_score = self._evaluate_structure(resume_text) * 0.20
        
        # Content clarity (15% weight)
        clarity_score = self._evaluate_clarity(resume_text) * 0.15
        
        total_score = keyword_density + formatting_score + structure_score + clarity_score
        return min(total_score, 100.0)
    
    def _evaluate_keyword_density(self, resume_text: str, job_keywords: List[str]) -> float:
        """Evaluate keyword density in resume"""
        if not job_keywords:
            return 0.0
        
        total_keywords = len(job_keywords)
        found_keywords = 0
        
        for keyword in job_keywords:
            if keyword in resume_text:
                found_keywords += 1
        
        # Optimal density is around 2-3% of total words
        resume_words = len(resume_text.split())
        if resume_words > 0:
            density = (found_keywords / resume_words) * 100
            if 1.5 <= density <= 3.5:
                return 100.0  # Optimal density
            elif density > 0:
                return max(50.0, 100.0 - abs(density - 2.5) * 20)  # Penalize too high/low
            else:
                return 0.0
        
        return 0.0
    
    def _evaluate_formatting(self, resume_text: str) -> float:
        """Evaluate resume formatting for ATS compatibility"""
        score = 100.0
        
        # Check for problematic characters
        problematic_chars = re.findall(r'[^\x00-\x7F]', resume_text)
        if problematic_chars:
            score -= len(problematic_chars) * 5
        
        # Check for multiple spaces
        multiple_spaces = re.findall(r'\s{3,}', resume_text)
        if multiple_spaces:
            score -= len(multiple_spaces) * 3
        
        # Check for excessive special characters
        special_chars = re.findall(r'[^\w\s]', resume_text)
        if len(special_chars) > len(resume_text) * 0.1:  # More than 10% special chars
            score -= 20
        
        return max(0.0, score)
    
    def _evaluate_structure(self, resume_text: str) -> float:
        """Evaluate resume structure"""
        score = 100.0
        
        # Check for key sections
        required_sections = ['experience', 'education', 'skills']
        for section in required_sections:
            if section not in resume_text.lower():
                score -= 20
        
        # Check for clear section markers
        section_markers = re.findall(r'\b(?:experience|education|skills|projects|certifications)\b', resume_text.lower())
        if len(section_markers) < 3:
            score -= 15
        
        return max(0.0, score)
    
    def _evaluate_clarity(self, resume_text: str) -> float:
        """Evaluate content clarity"""
        score = 100.0
        
        # Check for bullet points (good for readability)
        bullet_points = resume_text.count('•') + resume_text.count('-') + resume_text.count('*')
        if bullet_points < 5:
            score -= 20
        
        # Check for action verbs
        action_verbs = ['developed', 'implemented', 'managed', 'created', 'designed', 'led', 'improved', 'achieved']
        action_verb_count = sum(1 for verb in action_verbs if verb in resume_text.lower())
        if action_verb_count < 3:
            score -= 15
        
        return max(0.0, score)
    
    def _identify_missing_keywords(self, job_keywords: List[str], resume_keywords: List[str]) -> List[str]:
        """Identify keywords missing from resume"""
        missing = list(set(job_keywords) - set(resume_keywords))
        
        # Prioritize technical skills and experience levels
        priority_keywords = []
        regular_keywords = []
        
        for keyword in missing:
            if any(tech in keyword for tech in self.critical_keywords['technical_skills']):
                priority_keywords.append(keyword)
            elif any(level in keyword for level in self.critical_keywords['experience_levels']):
                priority_keywords.append(keyword)
            else:
                regular_keywords.append(keyword)
        
        # Return priority keywords first, then regular ones
        return priority_keywords + regular_keywords
    
    def _generate_ats_feedback(self, resume_text: str, job_text: str) -> List[str]:
        """Generate ATS improvement feedback"""
        feedback = []
        
        # Check keyword density
        if len(resume_text.split()) < 200:
            feedback.append("Increase resume length to improve keyword density and ATS scoring")
        
        # Check formatting
        if re.search(r'[^\x00-\x7F]', resume_text):
            feedback.append("Remove non-ASCII characters that can confuse ATS systems")
        
        # Check structure
        if not re.search(r'\b(?:experience|work history)\b', resume_text.lower()):
            feedback.append("Add clear 'Experience' section header for better ATS parsing")
        
        if not re.search(r'\b(?:skills|competencies)\b', resume_text.lower()):
            feedback.append("Include a dedicated 'Skills' section to improve keyword matching")
        
        # Check for bullet points
        bullet_count = resume_text.count('•') + resume_text.count('-') + resume_text.count('*')
        if bullet_count < 5:
            feedback.append("Use more bullet points to improve readability and ATS parsing")
        
        # Check for action verbs
        action_verbs = ['developed', 'implemented', 'managed', 'created', 'designed', 'led']
        action_verb_count = sum(1 for verb in action_verbs if verb in resume_text.lower())
        if action_verb_count < 3:
            feedback.append("Include more action verbs to demonstrate achievements and capabilities")
        
        if not feedback:
            feedback.append("Your resume appears to be well-optimized for ATS systems")
        
        return feedback
    
    def _generate_suggestions(self, missing_keywords: List[str], match_score: float) -> List[str]:
        """Generate strategic improvement suggestions"""
        suggestions = []
        
        if missing_keywords:
            top_keywords = missing_keywords[:5]
            suggestions.append(f"Add these critical keywords to your resume: {', '.join(top_keywords)}")
        
        if match_score < 60:
            suggestions.append("Consider tailoring your resume to better match the specific job requirements")
            suggestions.append("Highlight relevant experience and achievements that align with the job description")
        
        if match_score < 40:
            suggestions.append("This position may require skills or experience you don't currently have")
            suggestions.append("Consider applying to roles that better match your current qualifications")
        
        if match_score < 70:
            suggestions.append("Quantify your achievements with specific metrics and numbers")
            suggestions.append("Use industry-specific terminology from the job description")
        
        if not suggestions:
            suggestions.append("Your resume appears to be a strong match for this position")
        
        return suggestions
    
    def _determine_fit_level(self, match_score: float) -> str:
        """Determine overall fit level"""
        if match_score >= 80:
            return "Great Fit"
        elif match_score >= 60:
            return "Possible Fit"
        elif match_score >= 40:
            return "Marginal Fit"
        else:
            return "Not Fit"
    
    def _identify_experience_highlights(self, resume_text: str, job_text: str) -> List[str]:
        """Identify experiences that should be highlighted"""
        highlights = []
        
        # Look for experience-related keywords in job description
        experience_keywords = ['experience', 'background', 'work history', 'employment']
        relevant_experience = []
        
        for keyword in experience_keywords:
            if keyword in job_text.lower():
                relevant_experience.append(keyword)
        
        if relevant_experience:
            highlights.append(f"Emphasize your {', '.join(relevant_experience)} that aligns with the job requirements")
        
        # Look for specific technologies or skills mentioned in job
        tech_keywords = ['python', 'javascript', 'aws', 'docker', 'react', 'sql']
        found_tech = []
        
        for tech in tech_keywords:
            if tech in job_text.lower() and tech in resume_text.lower():
                found_tech.append(tech)
        
        if found_tech:
            highlights.append(f"Highlight your experience with: {', '.join(found_tech)}")
        
        if not highlights:
            highlights.append("Focus on quantifiable achievements and measurable results")
        
        return highlights

# Initialize enhanced resume analyzer
try:
    enhanced_resume_analyzer = EnhancedResumeAnalyzer()
except Exception as e:
    print(f"Error initializing enhanced resume analyzer: {e}")
    enhanced_resume_analyzer = None
