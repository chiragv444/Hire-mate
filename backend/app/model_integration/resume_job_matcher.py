#!/usr/bin/env python3
"""
Resume-Job Matching Model Integration Script

This script provides a simple interface to integrate the fine-tuned DistilBERT model
for resume-job matching into other projects.

Usage:
    from resume_job_matcher import ResumeJobMatcher
    
    matcher = ResumeJobMatcher()
    result = matcher.predict_fit(resume_text, job_text)
    print(f"Match Score: {result['good_fit_score']}")
"""

import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, DistilBertForSequenceClassification
from typing import Dict, Union, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResumeJobMatcher:
    """
    A class to handle resume-job matching using a fine-tuned DistilBERT model.
    
    This class loads the model once and provides methods to predict job-resume fit.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the ResumeJobMatcher with a pre-trained model.
        
        Args:
            model_path (str): Path to the directory containing the fine-tuned model
        """
        # Use the directory where this file is located as the base path
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "fine_tuned_distilbert_model")
            
            # If the model path doesn't exist, try alternative paths
            if not os.path.isdir(model_path):
                logger.warning(f"Primary model path not found: {model_path}")
                
                # Try relative to current working directory
                alt_path = os.path.join(os.getcwd(), "fine_tuned_distilbert_model")
                if os.path.isdir(alt_path):
                    model_path = alt_path
                    logger.info(f"Using alternative model path: {model_path}")
                else:
                    # Try relative to backend directory
                    backend_dir = os.path.join(os.getcwd(), "backend", "app", "model_integration", "fine_tuned_distilbert_model")
                    if os.path.isdir(backend_dir):
                        model_path = backend_dir
                        logger.info(f"Using backend directory model path: {model_path}")
                    else:
                        # Try relative to project root (assuming we're in backend/app/model_integration)
                        project_root = os.path.join(current_dir, "..", "..", "..")
                        project_model_path = os.path.join(project_root, "fine_tuned_distilbert_model")
                        if os.path.isdir(project_model_path):
                            model_path = project_model_path
                            logger.info(f"Using project root model path: {model_path}")
                        else:
                            logger.error(f"Could not find model directory. Tried paths:")
                            logger.error(f"  - {os.path.join(current_dir, 'fine_tuned_distilbert_model')}")
                            logger.error(f"  - {alt_path}")
                            logger.error(f"  - {backend_dir}")
                            logger.error(f"  - {project_model_path}")
                            logger.error(f"Current working directory: {os.getcwd()}")
                            logger.error(f"Current file directory: {current_dir}")
        
        self.model_path = model_path
        logger.info(f"Final model path: {self.model_path}")
        logger.info(f"Current working directory: {os.getcwd()}")
        logger.info(f"Model directory exists: {os.path.isdir(self.model_path)}")
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self.id2label = {0: "No Fit", 1: "Potential Fit", 2: "Good Fit"}
        
        # Load the model
        self._load_model()
    
    def _load_model(self):
        """Load the tokenizer and model from the specified path."""
        try:
            if not os.path.isdir(self.model_path):
                raise FileNotFoundError(f"Model directory not found: {self.model_path}")
            
            logger.info(f"Loading model from {self.model_path}...")
            logger.info(f"Using device: {self.device}")
            
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self.model = DistilBertForSequenceClassification.from_pretrained(self.model_path)
            self.model.to(self.device)
            self.model.eval()
            
            logger.info("Model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def predict_fit(self, resume_text: str, job_desc_text: str) -> Dict[str, Union[int, str, float]]:
        """
        Predict the fit between a resume and job description.
        
        Args:
            resume_text (str): The resume text content
            job_desc_text (str): The job description text content
            
        Returns:
            Dict containing:
                - label_id (int): Numeric label (0: No Fit, 1: Potential Fit, 2: Good Fit)
                - label (str): Human-readable label
                - good_fit_prob (float): Probability of being a "Good Fit"
                - good_fit_score (str): Formatted percentage score
        """
        if not resume_text or not job_desc_text:
            raise ValueError("Both resume_text and job_desc_text must be provided")
        
        if not self.model or not self.tokenizer:
            raise RuntimeError("Model not loaded. Please check initialization.")
        
        try:
            # Tokenize inputs
            inputs = self.tokenizer(
                resume_text,
                job_desc_text,
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors="pt"
            )
            
            # Move inputs to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probs = F.softmax(logits, dim=1)
                
                # Get predicted label
                label_id = int(torch.argmax(probs, dim=1).item())
                label = self.id2label.get(label_id, "Unknown")
                
                # Get probability for "Good Fit" (class 2)
                good_fit_prob = float(probs[0][2].item())
                
                # Format score as percentage
                good_fit_score = f"{good_fit_prob:.2%}"
            
            result = {
                "label_id": label_id,
                "label": label,
                "good_fit_prob": good_fit_prob,
                "good_fit_score": good_fit_score
            }
            
            logger.info(f"Prediction completed: {label} ({good_fit_score})")
            return result
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise
    
    def predict_fit_simple(self, resume_text: str, job_desc_text: str) -> Dict[str, Union[str, float]]:
        """
        Predict the fit between a resume and job description with simplified output.
        
        Args:
            resume_text (str): The resume text content
            job_desc_text (str): The job description text content
            
        Returns:
            Dict containing:
                - fit_status (str): "Not Fit", "Possible Fit", or "Good Fit"
                - percentage (float): Match percentage (0-100)
        """
        try:
            # Check if model is loaded
            if not self.model or not self.tokenizer:
                logger.warning("Model not loaded, returning default values")
                return {
                    "fit_status": "Not Fit",
                    "percentage": 0.0
                }
            
            # Get full prediction
            full_result = self.predict_fit(resume_text, job_desc_text)
            
            # Map label to fit status
            label_to_status = {
                "No Fit": "Not Fit",
                "Potential Fit": "Possible Fit", 
                "Good Fit": "Good Fit"
            }
            
            fit_status = label_to_status.get(full_result["label"], "Not Fit")
            percentage = round(full_result["good_fit_prob"] * 100, 2)
            
            return {
                "fit_status": fit_status,
                "percentage": percentage
            }
            
        except Exception as e:
            logger.error(f"Error during simple prediction: {str(e)}")
            # Return default values on error
            return {
                "fit_status": "Not Fit",
                "percentage": 0.0
            }
    
    def get_model_info(self) -> Dict[str, str]:
        """Get information about the loaded model."""
        return {
            "model_path": self.model_path,
            "device": str(self.device),
            "model_loaded": str(self.model is not None),
            "tokenizer_loaded": str(self.tokenizer is not None)
        }
    
    def is_model_available(self) -> bool:
        """Check if the model is available and ready for prediction."""
        return self.model is not None and self.tokenizer is not None


# Convenience function for simple usage
def predict_resume_job_fit(resume_text: str, job_text: str, 
                          model_path: str = None) -> Dict[str, Union[int, str, float]]:
    """
    Convenience function to quickly predict resume-job fit without creating a class instance.
    
    Args:
        resume_text (str): The resume text content
        job_text (str): The job description text content
        model_path (str): Path to the model directory
        
    Returns:
        Dict with prediction results
    """
    matcher = ResumeJobMatcher(model_path)
    return matcher.predict_fit(resume_text, job_text)


def predict_resume_job_fit_simple(resume_text: str, job_text: str, 
                                model_path: str = None) -> Dict[str, Union[str, float]]:
    """
    Convenience function to quickly predict resume-job fit with simplified output.
    
    Args:
        resume_text (str): The resume text content
        job_text (str): The job description text content
        model_path (str): Path to the model directory
        
    Returns:
        Dict with simplified prediction results (fit_status, percentage)
    """
    matcher = ResumeJobMatcher(model_path)
    return matcher.predict_fit_simple(resume_text, job_text)


def is_model_available(model_path: str = None) -> bool:
    """
    Convenience function to check if the model is available.
    
    Args:
        model_path (str): Path to the model directory
        
    Returns:
        bool: True if model is available, False otherwise
    """
    try:
        matcher = ResumeJobMatcher(model_path)
        return matcher.is_model_available()
    except Exception as e:
        logger.error(f"Error checking model availability: {str(e)}")
        return False


# Example usage and testing
if __name__ == "__main__":
    # Example usage
    print("Resume-Job Matcher Integration Script")
    print("=" * 50)
    
    # Sample texts for testing
    sample_resume = """
    Experienced software engineer with 5+ years in Python development.
    Strong background in machine learning and web development.
    Proficient in Flask, FastAPI, and PyTorch.
    """
    
    sample_job = """
    We are looking for a Python developer with experience in web frameworks.
    Knowledge of machine learning is a plus.
    Experience with FastAPI or Flask required.
    """
    
    try:
        # Test the convenience function
        print("Testing convenience function...")
        result = predict_resume_job_fit(sample_resume, sample_job)
        print(f"Result: {result}")
        
        # Test the class-based approach
        print("\nTesting class-based approach...")
        matcher = ResumeJobMatcher()
        result2 = matcher.predict_fit(sample_resume, sample_job)
        print(f"Result: {result2}")
        
        # Show model info
        print("\nModel Information:")
        info = matcher.get_model_info()
        for key, value in info.items():
            print(f"  {key}: {value}")
            
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        print("Make sure the model directory exists and contains the required files.")
