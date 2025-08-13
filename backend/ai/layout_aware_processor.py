"""
Production-Grade Layout-Aware Document Processing
Implements intelligent region detection and targeted OCR for optimal text extraction
"""

import cv2
import numpy as np
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
import io
import os
import logging
from typing import Tuple, List, Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LayoutAwareProcessor:
    def __init__(self):
        self.header_exclusion_ratio = 0.25  # Top 25% for first page
        self.footer_exclusion_ratio = 0.05  # Bottom 5% for all pages
        
        # OCR configuration for optimal results
        self.ocr_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()-"\' '
        
    def process_document(self, file_path: str) -> str:
        """
        Main entry point for layout-aware document processing
        """
        try:
            file_extension = os.path.splitext(file_path)[1].lower()
            
            if file_extension == '.pdf':
                return self._process_pdf(file_path)
            elif file_extension in ['.jpg', '.jpeg', '.png']:
                return self._process_image(file_path)
            elif file_extension in ['.docx', '.txt']:
                # Text-first formats don't need layout analysis
                return self._process_text_document(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")
                
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {e}")
            raise
    
    def _process_pdf(self, file_path: str) -> str:
        """
        Process PDF with intelligent page-by-page analysis
        """
        extracted_text = []
        
        try:
            pdf_document = fitz.open(file_path)
            
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # Check if page is text-based or image-based
                if self._is_text_based_page(page):
                    # Extract text directly
                    page_text = page.get_text()
                    if page_text.strip():
                        extracted_text.append(page_text)
                else:
                    # Convert to image and process with layout analysis
                    page_image = self._pdf_page_to_image(page)
                    page_text = self._process_page_image(page_image, page_num == 0)
                    if page_text.strip():
                        extracted_text.append(page_text)
            
            pdf_document.close()
            return '\n\n'.join(extracted_text)
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {e}")
            raise
    
    def _is_text_based_page(self, page) -> bool:
        """
        Determine if a PDF page contains extractable text or is image-based
        """
        try:
            text = page.get_text().strip()
            # If page has substantial text content, it's text-based
            return len(text) > 50
        except:
            return False
    
    def _pdf_page_to_image(self, page) -> np.ndarray:
        """
        Convert PDF page to OpenCV image format
        """
        try:
            # Render page as image with high DPI for better OCR
            mat = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x zoom for better quality
            img_data = mat.tobytes("png")
            
            # Convert to PIL Image then to OpenCV format
            pil_image = Image.open(io.BytesIO(img_data))
            opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            return opencv_image
            
        except Exception as e:
            logger.error(f"Error converting PDF page to image: {e}")
            raise
    
    def _process_image(self, file_path: str) -> str:
        """
        Process image file with layout-aware region detection
        """
        try:
            image = cv2.imread(file_path)
            if image is None:
                raise ValueError(f"Could not load image: {file_path}")
            
            # Process as first page (apply header exclusion)
            return self._process_page_image(image, is_first_page=True)
            
        except Exception as e:
            logger.error(f"Error processing image {file_path}: {e}")
            raise
    
    def _process_page_image(self, image: np.ndarray, is_first_page: bool = False) -> str:
        """
        Core layout-aware image processing with region exclusion
        """
        try:
            height, width = image.shape[:2]
            
            # Calculate exclusion boundaries
            header_cutoff = 0
            footer_cutoff = height
            
            if is_first_page:
                # Exclude top 25% of first page (e-Stamp region)
                header_cutoff = int(height * self.header_exclusion_ratio)
                logger.info(f"First page: excluding header region (0 to {header_cutoff})")
            
            # Exclude bottom 5% of all pages (footer region)
            footer_cutoff = int(height * (1 - self.footer_exclusion_ratio))
            logger.info(f"Excluding footer region ({footer_cutoff} to {height})")
            
            # Extract body region
            body_region = image[header_cutoff:footer_cutoff, :]
            
            # Validate body region
            if body_region.shape[0] < 50:  # Minimum height check
                logger.warning("Body region too small, using full image")
                body_region = image
            
            # Pre-process image for better OCR
            processed_image = self._preprocess_for_ocr(body_region)
            
            # Perform targeted OCR on body region only
            extracted_text = self._perform_ocr(processed_image)
            
            # Post-process extracted text
            cleaned_text = self._post_process_text(extracted_text)
            
            logger.info(f"Extracted {len(cleaned_text)} characters from body region")
            return cleaned_text
            
        except Exception as e:
            logger.error(f"Error processing page image: {e}")
            raise
    
    def _preprocess_for_ocr(self, image: np.ndarray) -> np.ndarray:
        """
        Optimize image for OCR accuracy
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (1, 1), 0)
            
            # Apply adaptive thresholding for better text contrast
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up text
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            logger.error(f"Error preprocessing image for OCR: {e}")
            return image
    
    def _perform_ocr(self, image: np.ndarray) -> str:
        """
        Perform OCR with optimized configuration
        """
        try:
            # Use Tesseract with custom configuration
            text = pytesseract.image_to_string(image, config=self.ocr_config)
            return text
            
        except Exception as e:
            logger.error(f"OCR error: {e}")
            return ""
    
    def _post_process_text(self, text: str) -> str:
        """
        Clean and normalize extracted text
        """
        if not text:
            return ""
        
        # Remove excessive whitespace
        cleaned = ' '.join(text.split())
        
        # Remove common OCR artifacts
        artifacts = ['|', '_' * 3, '-' * 3, '=' * 3]
        for artifact in artifacts:
            cleaned = cleaned.replace(artifact, ' ')
        
        # Normalize line breaks
        cleaned = cleaned.replace('\n\n\n', '\n\n')
        
        # Remove very short lines (likely OCR noise)
        lines = cleaned.split('\n')
        filtered_lines = [line.strip() for line in lines if len(line.strip()) > 3]
        
        return '\n'.join(filtered_lines)
    
    def _process_text_document(self, file_path: str) -> str:
        """
        Process text-first documents (DOCX, TXT) without layout analysis
        """
        try:
            if file_path.endswith('.txt'):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            elif file_path.endswith('.docx'):
                # Use mammoth or python-docx for DOCX processing
                import mammoth
                with open(file_path, 'rb') as f:
                    result = mammoth.extract_raw_text(f)
                    return result.value
            else:
                raise ValueError(f"Unsupported text document format")
                
        except Exception as e:
            logger.error(f"Error processing text document {file_path}: {e}")
            raise
    
    def analyze_layout_regions(self, image: np.ndarray) -> Dict:
        """
        Analyze and return information about detected layout regions
        """
        try:
            height, width = image.shape[:2]
            
            analysis = {
                'image_dimensions': {'width': width, 'height': height},
                'header_region': {
                    'start': 0,
                    'end': int(height * self.header_exclusion_ratio),
                    'percentage': self.header_exclusion_ratio * 100
                },
                'body_region': {
                    'start': int(height * self.header_exclusion_ratio),
                    'end': int(height * (1 - self.footer_exclusion_ratio)),
                    'percentage': (1 - self.header_exclusion_ratio - self.footer_exclusion_ratio) * 100
                },
                'footer_region': {
                    'start': int(height * (1 - self.footer_exclusion_ratio)),
                    'end': height,
                    'percentage': self.footer_exclusion_ratio * 100
                }
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing layout regions: {e}")
            return {}

# Global processor instance
layout_processor = LayoutAwareProcessor()

def process_document_with_layout_awareness(file_path: str) -> str:
    """
    Main function to process documents with layout awareness
    """
    try:
        return layout_processor.process_document(file_path)
    except Exception as e:
        logger.error(f"Layout-aware processing failed for {file_path}: {e}")
        raise

def analyze_document_layout(file_path: str) -> Dict:
    """
    Analyze document layout for debugging purposes
    """
    try:
        if file_path.endswith(('.jpg', '.jpeg', '.png')):
            image = cv2.imread(file_path)
            return layout_processor.analyze_layout_regions(image)
        else:
            return {"message": "Layout analysis only available for image files"}
    except Exception as e:
        logger.error(f"Layout analysis failed for {file_path}: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    # Test the layout-aware processor
    import sys
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        try:
            result = process_document_with_layout_awareness(test_file)
            print(f"Extracted text length: {len(result)}")
            print(f"First 500 characters:\n{result[:500]}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Usage: python layout_aware_processor.py <file_path>")
