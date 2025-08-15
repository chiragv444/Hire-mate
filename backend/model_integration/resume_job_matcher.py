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
        if model_path is None:
            # Auto-detect the model path based on the current file location
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "fine_tuned_distilbert_model")
        
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self.id2label = {0: "No Fit", 1: "Possible Fit", 2: "Great Fit"}
        
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
    
    def predict_fit(self, resume_text: str, job_desc_text: str) -> Dict[str, Union[str, float]]:
        """
        Predict the fit between a resume and job description.
        
        Args:
            resume_text (str): The resume text content
            job_desc_text (str): The job description text content
            
        Returns:
            Dict containing:
                - fit_level (str): "Not Fit", "Possible Fit", or "Great Fit"
                - percentage (float): Percentage score (0-100)
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
                label = self.id2label.get(label_id, "Not Fit")
                
                # Get probability for the PREDICTED class (not just Good Fit)
                predicted_prob = float(probs[0][label_id].item())
                percentage = predicted_prob * 100
                
                # Map label to fit level
                fit_level = label
            
            result = {
                "fit_level": fit_level,
                "percentage": round(percentage, 1)
            }
            
            logger.info(f"Prediction completed: {fit_level} ({percentage:.1f}%)")
            return result
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise

    def predict_fit_simple(self, resume_text: str, job_desc_text: str) -> Dict[str, Union[str, float]]:
        """
        Simple prediction method that returns just fit_level and percentage.
        This is a wrapper around predict_fit for convenience.
        """
        return self.predict_fit(resume_text, job_desc_text)
    
    def get_model_info(self) -> Dict[str, str]:
        """Get information about the loaded model."""
        return {
            "model_path": self.model_path,
            "device": str(self.device),
            "model_loaded": str(self.model is not None),
            "tokenizer_loaded": str(self.tokenizer is not None)
        }


# Convenience function for simple usage
def predict_resume_job_fit(resume_text: str, job_text: str, 
                          model_path: str = "./fine_tuned_distilbert_model") -> Dict[str, Union[str, float]]:
    """
    Convenience function to quickly predict resume-job fit without creating a class instance.
    
    Args:
        resume_text (str): The resume text content
        job_text (str): The job description text content
        model_path (str): Path to the model directory
        
    Returns:
        Dict with prediction results: {"fit_level": str, "percentage": float}
    """
    matcher = ResumeJobMatcher(model_path)
    return matcher.predict_fit(resume_text, job_text)


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
        print(f"Fit Level: {result['fit_level']}")
        print(f"Percentage: {result['percentage']}%")
        
        # Test the class-based approach
        print("\nTesting class-based approach...")
        matcher = ResumeJobMatcher()
        result2 = matcher.predict_fit(sample_resume, sample_job)
        print(f"Result: {result2}")
        print(f"Fit Level: {result2['fit_level']}")
        print(f"Percentage: {result2['percentage']}%")
        
        # Show model info
        print("\nModel Information:")
        info = matcher.get_model_info()
        for key, value in info.items():
            print(f"  {key}: {value}")
            
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        print("Make sure the model directory exists and contains the required files.")
