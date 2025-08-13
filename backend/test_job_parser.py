#!/usr/bin/env python3
"""
Test script for the enhanced job parser
"""
import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from services.enhanced_job_parser import enhanced_job_parser

async def test_job_parser():
    """Test the enhanced job parser"""
    if not enhanced_job_parser:
        print("❌ Job parser not initialized")
        return
    
    print("🔧 Testing Enhanced Job Parser...")
    
    # Test 1: Check if parser is working
    test_result = enhanced_job_parser.test_parser()
    print(f"✅ Parser test: {'PASSED' if test_result else 'FAILED'}")
    
    # Test 2: Check system dependencies
    deps = enhanced_job_parser.check_system_dependencies()
    print(f"🔍 System dependencies: {deps}")
    
    # Test 3: Test URL validation
    test_url = "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4027743206"
    is_valid = enhanced_job_parser._is_valid_linkedin_job_url(test_url)
    print(f"🔗 URL validation: {'PASSED' if is_valid else 'FAILED'}")
    
    # Test 4: Test job ID extraction
    job_id = enhanced_job_parser._extract_job_id_from_url(test_url)
    print(f"🆔 Job ID extraction: {job_id}")
    
    # Test 5: Test direct URL construction
    if job_id:
        direct_url = enhanced_job_parser._construct_direct_job_url(job_id)
        print(f"🔗 Direct URL: {direct_url}")
        
        # Test 6: Test actual scraping (this will take time)
        print("\n🌐 Testing actual LinkedIn scraping...")
        try:
            result = await enhanced_job_parser.scrape_linkedin_job(test_url)
            if result:
                print("✅ Scraping successful!")
                print(f"📝 Title: {result.get('title', 'N/A')}")
                print(f"🏢 Company: {result.get('company', {}).get('name', 'N/A')}")
                print(f"📍 Location: {result.get('location', {}).get('full_location', 'N/A')}")
                print(f"📄 Description length: {len(result.get('description', ''))}")
            else:
                print("❌ Scraping failed")
        except Exception as e:
            print(f"❌ Scraping error: {e}")
    else:
        print("❌ Could not extract job ID")

if __name__ == "__main__":
    print("🚀 Testing Enhanced Job Parser...")
    asyncio.run(test_job_parser())
