"""
PDF Processing and OCR Service
Handles PDF parsing, OCR, and text extraction
"""
from typing import Dict, List, Any, Optional, Tuple
import pytesseract
from PIL import Image
import PyPDF2
import pdfplumber
import numpy as np
from pathlib import Path
from loguru import logger
import hashlib
import re

from app.core.config import settings

# Optional imports for enhanced features
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    logger.warning("pdf2image not available - image-based OCR will be disabled")
    PDF2IMAGE_AVAILABLE = False
    convert_from_path = None

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    logger.warning("opencv-python not available - image preprocessing will be disabled")
    CV2_AVAILABLE = False
    cv2 = None


class PDFProcessor:
    """Service for PDF processing and OCR"""
    
    def __init__(self):
        """Initialize PDF processor"""
        # Set Tesseract path if configured
        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
        
        self.ocr_language = settings.OCR_LANGUAGE
        logger.info(f"Initialized PDF processor with OCR language: {self.ocr_language}")
    
    def calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate SHA256 hash of file
        
        Args:
            file_path: Path to file
        
        Returns:
            File hash
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def get_pdf_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from PDF
        
        Args:
            file_path: Path to PDF file
        
        Returns:
            PDF metadata
        """
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                metadata = {
                    'page_count': len(pdf_reader.pages),
                    'file_size': Path(file_path).stat().st_size,
                    'file_hash': self.calculate_file_hash(file_path),
                }
                
                # Extract PDF info if available
                if pdf_reader.metadata:
                    info = pdf_reader.metadata
                    metadata.update({
                        'title': info.get('/Title', ''),
                        'author': info.get('/Author', ''),
                        'subject': info.get('/Subject', ''),
                        'creator': info.get('/Creator', ''),
                        'producer': info.get('/Producer', ''),
                        'creation_date': info.get('/CreationDate', ''),
                    })
                
                return metadata
                
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
            raise
    
    def extract_text_from_pdf(self, file_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Extract text from PDF using multiple methods with fallback strategy
        Handles structured, unstructured, and semi-structured PDFs
        
        Args:
            file_path: Path to PDF file
        
        Returns:
            Tuple of (full_text, page_data)
        """
        try:
            full_text = ""
            page_data = []
            
            logger.info(f"Starting PDF text extraction with multi-method approach")
            
            # Method 1: Try pdfplumber first (best for structured/digital PDFs)
            try:
                with pdfplumber.open(file_path) as pdf:
                    total_pages = len(pdf.pages)
                    logger.info(f"PDF has {total_pages} pages, attempting pdfplumber extraction")
                    
                    for page_num, page in enumerate(pdf.pages, start=1):
                        try:
                            text = page.extract_text()
                            
                            # Check if extraction was successful
                            if text and len(text.strip()) > 30:
                                # Good text extraction - structured/digital PDF
                                page_data.append({
                                    'page_number': page_num,
                                    'text': text,
                                    'method': 'pdfplumber',
                                    'char_count': len(text),
                                    'quality': 'high'
                                })
                                full_text += f"\n\n--- Page {page_num} ---\n\n{text}"
                                logger.debug(f"Page {page_num}: pdfplumber extracted {len(text)} chars")
                            else:
                                # Poor/no text extraction - likely scanned/image-based
                                logger.info(f"Page {page_num}: pdfplumber failed, trying OCR (unstructured PDF)")
                                ocr_text = self._ocr_page(file_path, page_num)
                                
                                if ocr_text and len(ocr_text.strip()) > 20:
                                    page_data.append({
                                        'page_number': page_num,
                                        'text': ocr_text,
                                        'method': 'ocr',
                                        'char_count': len(ocr_text),
                                        'quality': 'medium'
                                    })
                                    full_text += f"\n\n--- Page {page_num} (OCR) ---\n\n{ocr_text}"
                                    logger.debug(f"Page {page_num}: OCR extracted {len(ocr_text)} chars")
                                else:
                                    # OCR also failed - try PyPDF2 as last resort
                                    logger.warning(f"Page {page_num}: OCR failed, trying PyPDF2")
                                    pypdf_text = self._extract_with_pypdf2(file_path, page_num)
                                    
                                    if pypdf_text and len(pypdf_text.strip()) > 10:
                                        page_data.append({
                                            'page_number': page_num,
                                            'text': pypdf_text,
                                            'method': 'pypdf2',
                                            'char_count': len(pypdf_text),
                                            'quality': 'low'
                                        })
                                        full_text += f"\n\n--- Page {page_num} (PyPDF2) ---\n\n{pypdf_text}"
                                    else:
                                        # Complete failure - add placeholder
                                        logger.error(f"Page {page_num}: All extraction methods failed")
                                        page_data.append({
                                            'page_number': page_num,
                                            'text': f"[Page {page_num}: Text extraction failed]",
                                            'method': 'failed',
                                            'char_count': 0,
                                            'quality': 'none'
                                        })
                                        full_text += f"\n\n--- Page {page_num} (FAILED) ---\n\n[Text extraction failed]"
                        
                        except Exception as page_error:
                            logger.error(f"Error processing page {page_num}: {page_error}")
                            # Add error placeholder
                            page_data.append({
                                'page_number': page_num,
                                'text': f"[Page {page_num}: Error - {str(page_error)}]",
                                'method': 'error',
                                'char_count': 0,
                                'quality': 'none'
                            })
                            full_text += f"\n\n--- Page {page_num} (ERROR) ---\n\n[Error: {str(page_error)}]"
            
            except Exception as pdf_error:
                logger.error(f"pdfplumber failed completely: {pdf_error}")
                # Fallback to PyPDF2 for entire document
                logger.info("Falling back to PyPDF2 for entire document")
                return self._extract_with_pypdf2_full(file_path)
            
            # Calculate extraction statistics
            successful_pages = sum(1 for p in page_data if p['char_count'] > 0)
            total_chars = sum(p['char_count'] for p in page_data)
            methods_used = set(p['method'] for p in page_data)
            
            logger.info(f"Extraction complete: {successful_pages}/{len(page_data)} pages successful")
            logger.info(f"Total characters: {total_chars}, Methods used: {methods_used}")
            
            # Warn if extraction quality is poor
            if successful_pages < len(page_data) * 0.5:
                logger.warning(f"Low extraction success rate: {successful_pages}/{len(page_data)} pages")
            
            return full_text, page_data
            
        except Exception as e:
            logger.error(f"Critical error in PDF text extraction: {e}")
            # Last resort - return minimal data
            return f"[PDF extraction failed: {str(e)}]", [{
                'page_number': 1,
                'text': f"[Extraction failed: {str(e)}]",
                'method': 'failed',
                'char_count': 0,
                'quality': 'none'
            }]
    
    def _ocr_page(self, file_path: str, page_number: int) -> str:
        """
        Perform OCR on a specific PDF page with enhanced error handling
        Handles scanned, image-based, and low-quality PDFs
        
        Args:
            file_path: Path to PDF file
            page_number: Page number (1-indexed)
        
        Returns:
            Extracted text
        """
        try:
            logger.info(f"Starting OCR for page {page_number}")
            
            # Convert PDF page to image with higher DPI for better quality
            images = convert_from_path(
                file_path,
                first_page=page_number,
                last_page=page_number,
                dpi=300,  # High DPI for better OCR accuracy
                fmt='png'
            )
            
            if not images:
                logger.warning(f"No images generated for page {page_number}")
                return ""
            
            image = images[0]
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(image)
            
            # Try multiple OCR configurations for best results
            ocr_configs = [
                '--psm 6',  # Assume uniform block of text
                '--psm 4',  # Assume single column of text
                '--psm 3',  # Fully automatic page segmentation
                '--psm 1',  # Automatic with OSD (Orientation and Script Detection)
            ]
            
            best_text = ""
            best_confidence = 0
            
            for config in ocr_configs:
                try:
                    # Perform OCR with current config
                    text = pytesseract.image_to_string(
                        processed_image,
                        lang=self.ocr_language,
                        config=config
                    )
                    
                    # Get confidence score
                    try:
                        data = pytesseract.image_to_data(
                            processed_image,
                            lang=self.ocr_language,
                            config=config,
                            output_type=pytesseract.Output.DICT
                        )
                        confidences = [int(conf) for conf in data['conf'] if conf != '-1']
                        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                    except:
                        avg_confidence = len(text.strip())  # Use text length as proxy
                    
                    # Keep best result
                    if avg_confidence > best_confidence and len(text.strip()) > 20:
                        best_text = text
                        best_confidence = avg_confidence
                        logger.debug(f"OCR config '{config}' produced {len(text)} chars with confidence {avg_confidence:.1f}")
                
                except Exception as config_error:
                    logger.debug(f"OCR config '{config}' failed: {config_error}")
                    continue
            
            if best_text:
                logger.info(f"OCR successful for page {page_number}: {len(best_text)} chars, confidence {best_confidence:.1f}")
                return best_text
            else:
                logger.warning(f"All OCR attempts failed for page {page_number}")
                return ""
            
        except Exception as e:
            logger.error(f"Error performing OCR on page {page_number}: {e}")
            return ""
    
    def _extract_with_pypdf2(self, file_path: str, page_number: int) -> str:
        """
        Extract text from a specific page using PyPDF2 (fallback method)
        
        Args:
            file_path: Path to PDF file
            page_number: Page number (1-indexed)
        
        Returns:
            Extracted text
        """
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                if page_number <= len(pdf_reader.pages):
                    page = pdf_reader.pages[page_number - 1]
                    text = page.extract_text()
                    return text if text else ""
                return ""
        except Exception as e:
            logger.error(f"PyPDF2 extraction failed for page {page_number}: {e}")
            return ""
    
    def _extract_with_pypdf2_full(self, file_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Extract text from entire PDF using PyPDF2 (complete fallback)
        
        Args:
            file_path: Path to PDF file
        
        Returns:
            Tuple of (full_text, page_data)
        """
        try:
            full_text = ""
            page_data = []
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                total_pages = len(pdf_reader.pages)
                
                logger.info(f"Using PyPDF2 fallback for {total_pages} pages")
                
                for page_num in range(total_pages):
                    try:
                        page = pdf_reader.pages[page_num]
                        text = page.extract_text()
                        
                        if text and len(text.strip()) > 10:
                            page_data.append({
                                'page_number': page_num + 1,
                                'text': text,
                                'method': 'pypdf2_fallback',
                                'char_count': len(text),
                                'quality': 'low'
                            })
                            full_text += f"\n\n--- Page {page_num + 1} (PyPDF2) ---\n\n{text}"
                        else:
                            # Try OCR as last resort
                            ocr_text = self._ocr_page(file_path, page_num + 1)
                            page_data.append({
                                'page_number': page_num + 1,
                                'text': ocr_text if ocr_text else "[No text extracted]",
                                'method': 'ocr_fallback',
                                'char_count': len(ocr_text) if ocr_text else 0,
                                'quality': 'medium' if ocr_text else 'none'
                            })
                            full_text += f"\n\n--- Page {page_num + 1} (OCR Fallback) ---\n\n{ocr_text if ocr_text else '[No text]'}"
                    
                    except Exception as page_error:
                        logger.error(f"PyPDF2 page {page_num + 1} error: {page_error}")
                        page_data.append({
                            'page_number': page_num + 1,
                            'text': f"[Error: {str(page_error)}]",
                            'method': 'error',
                            'char_count': 0,
                            'quality': 'none'
                        })
                
                return full_text, page_data
        
        except Exception as e:
            logger.error(f"PyPDF2 complete fallback failed: {e}")
            return f"[Complete extraction failure: {str(e)}]", []
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results
        Handles various image quality issues
        
        Args:
            image: PIL Image
        
        Returns:
            Preprocessed image
        """
        # If opencv is not available, return original image
        if not CV2_AVAILABLE:
            logger.debug("OpenCV not available - skipping image preprocessing")
            return image
            
        try:
            # Convert PIL Image to OpenCV format
            img_array = np.array(image)
            
            # Convert to grayscale if needed
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Apply multiple preprocessing techniques
            
            # 1. Noise reduction
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # 2. Contrast enhancement using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(denoised)
            
            # 3. Adaptive thresholding (works better for varied lighting)
            binary = cv2.adaptiveThreshold(
                enhanced,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                11,
                2
            )
            
            # 4. Morphological operations to remove small noise
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # 5. Deskew if needed (straighten tilted text)
            try:
                coords = np.column_stack(np.where(cleaned > 0))
                if len(coords) > 0:
                    angle = cv2.minAreaRect(coords)[-1]
                    if angle < -45:
                        angle = -(90 + angle)
                    else:
                        angle = -angle
                    
                    # Only deskew if angle is significant
                    if abs(angle) > 0.5:
                        (h, w) = cleaned.shape[:2]
                        center = (w // 2, h // 2)
                        M = cv2.getRotationMatrix2D(center, angle, 1.0)
                        cleaned = cv2.warpAffine(
                            cleaned,
                            M,
                            (w, h),
                            flags=cv2.INTER_CUBIC,
                            borderMode=cv2.BORDER_REPLICATE
                        )
            except Exception as deskew_error:
                logger.debug(f"Deskew failed: {deskew_error}")
                # Continue with non-deskewed image
            
            # Convert back to PIL Image
            processed_image = Image.fromarray(cleaned)
            
            return processed_image
            
        except Exception as e:
            logger.warning(f"Error preprocessing image: {e}, using original")
            return image
    
    def extract_sections(self, text: str) -> Dict[str, str]:
        """
        Extract common sections from judgment text
        
        Args:
            text: Full judgment text
        
        Returns:
            Dictionary of sections
        """
        sections = {
            'header': '',
            'facts': '',
            'arguments': '',
            'analysis': '',
            'conclusion': '',
            'orders': '',
            'full_text': text
        }
        
        # Common section markers in Indian judgments
        markers = {
            'facts': ['FACTS', 'BACKGROUND', 'BRIEF FACTS'],
            'arguments': ['ARGUMENTS', 'SUBMISSIONS', 'CONTENTIONS'],
            'analysis': ['ANALYSIS', 'DISCUSSION', 'REASONING', 'CONSIDERATION'],
            'conclusion': ['CONCLUSION', 'FINDINGS'],
            'orders': ['ORDER', 'DIRECTIONS', 'DISPOSED OF', 'JUDGMENT']
        }
        
        # Simple section extraction (can be enhanced with NLP)
        lines = text.split('\n')
        current_section = 'header'
        section_text = []
        
        for line in lines:
            line_upper = line.strip().upper()
            
            # Check if line is a section marker
            section_found = False
            for section_name, keywords in markers.items():
                if any(keyword in line_upper for keyword in keywords):
                    # Save previous section
                    if section_text:
                        sections[current_section] = '\n'.join(section_text)
                    
                    # Start new section
                    current_section = section_name
                    section_text = [line]
                    section_found = True
                    break
            
            if not section_found:
                section_text.append(line)
        
        # Save last section
        if section_text:
            sections[current_section] = '\n'.join(section_text)
        
        return sections
    
    def extract_case_id(self, text: str) -> Optional[str]:
        """
        Extract case ID from judgment text using regex patterns
        
        Common Indian court case ID patterns:
        - WP/12345/2023
        - CRL.A. 123/2023
        - Civil Appeal No. 1234 of 2023
        - W.P.(C) 12345/2023
        - SLP(C) No. 12345/2023
        - Crl.A. No. 123/2023
        
        Args:
            text: Judgment text
        
        Returns:
            Extracted case ID or None
        """
        try:
            # Take first 2000 characters (case ID is usually at the top)
            header_text = text[:2000]
            
            # Common case ID patterns in Indian courts
            patterns = [
                # Writ Petition patterns
                r'W\.?P\.?\s*(?:\(C\))?\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                r'WP\s*(?:\(C\))?\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                
                # Criminal Appeal patterns
                r'Crl?\.?\s*A\.?\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                r'CRL\.A\.\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                
                # Civil Appeal patterns
                r'Civil\s+Appeal\s+(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                r'C\.A\.\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                
                # Special Leave Petition
                r'SLP\s*(?:\(C\))?\s*(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
                
                # General pattern with slashes
                r'([A-Z]+\.?[A-Z]*\.?)\s*(?:No\.?)?\s*(\d+)\s*/\s*(\d{4})',
                
                # Numbered pattern
                r'(?:Case|Petition|Appeal)\s+(?:No\.?)?\s*(\d+)\s*(?:of|/)?\s*(\d{4})',
            ]
            
            for pattern in patterns:
                matches = re.search(pattern, header_text, re.IGNORECASE)
                if matches:
                    groups = matches.groups()
                    
                    # Construct case ID based on pattern
                    if len(groups) == 2:
                        # Simple number/year pattern
                        case_id = f"{groups[0]}/{groups[1]}"
                    elif len(groups) == 3:
                        # Type/number/year pattern
                        case_id = f"{groups[0]}/{groups[1]}/{groups[2]}"
                    else:
                        case_id = '/'.join(groups)
                    
                    logger.info(f"Extracted case ID: {case_id}")
                    return case_id
            
            # If no pattern matched, try to find any case-like identifier
            # Look for patterns like "IN THE MATTER OF: XYZ/123/2023"
            matter_pattern = r'(?:IN\s+THE\s+MATTER\s+OF|CASE\s+NO|PETITION\s+NO)[:\s]+([A-Z0-9/\-\(\)\.]+)'
            matter_match = re.search(matter_pattern, header_text, re.IGNORECASE)
            if matter_match:
                case_id = matter_match.group(1).strip()
                logger.info(f"Extracted case ID from matter: {case_id}")
                return case_id
            
            logger.warning("Could not extract case ID from document")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting case ID: {e}")
            return None
    
    def extract_court_name(self, text: str) -> Optional[str]:
        """
        Extract court name from judgment text
        
        Args:
            text: Judgment text
        
        Returns:
            Extracted court name or None
        """
        try:
            header_text = text[:1000]
            
            # Common court name patterns
            patterns = [
                r'IN\s+THE\s+(HIGH\s+COURT\s+OF\s+[A-Z\s]+)',
                r'IN\s+THE\s+(SUPREME\s+COURT\s+OF\s+INDIA)',
                r'(HIGH\s+COURT\s+OF\s+[A-Z\s]+)',
                r'(SUPREME\s+COURT\s+OF\s+INDIA)',
                r'IN\s+THE\s+([A-Z\s]+COURT[A-Z\s]*)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, header_text, re.IGNORECASE)
                if match:
                    court_name = match.group(1).strip()
                    logger.info(f"Extracted court name: {court_name}")
                    return court_name
            
            logger.warning("Could not extract court name from document")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting court name: {e}")
            return None
    
    def extract_parties(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract petitioner and respondent names
        
        Args:
            text: Judgment text
        
        Returns:
            Dictionary with petitioner and respondent
        """
        try:
            header_text = text[:2000]
            
            parties = {
                'petitioner': None,
                'respondent': None
            }
            
            # Pattern for petitioner
            petitioner_patterns = [
                r'([A-Z][A-Za-z\s\.]+)\s+\.{3,}\s*(?:Petitioner|Appellant)',
                r'(?:Petitioner|Appellant)[:\s]+([A-Z][A-Za-z\s\.]+)',
            ]
            
            for pattern in petitioner_patterns:
                match = re.search(pattern, header_text)
                if match:
                    parties['petitioner'] = match.group(1).strip()
                    break
            
            # Pattern for respondent
            respondent_patterns = [
                r'([A-Z][A-Za-z\s\.]+)\s+\.{3,}\s*(?:Respondent|Defendant)',
                r'(?:Respondent|Defendant)[:\s]+([A-Z][A-Za-z\s\.]+)',
            ]
            
            for pattern in respondent_patterns:
                match = re.search(pattern, header_text)
                if match:
                    parties['respondent'] = match.group(1).strip()
                    break
            
            if parties['petitioner']:
                logger.info(f"Extracted petitioner: {parties['petitioner']}")
            if parties['respondent']:
                logger.info(f"Extracted respondent: {parties['respondent']}")
            
            return parties
            
        except Exception as e:
            logger.error(f"Error extracting parties: {e}")
            return {'petitioner': None, 'respondent': None}
    
    def extract_judgment_date(self, text: str) -> Optional[str]:
        """
        Extract judgment date from text
        
        Args:
            text: Judgment text
        
        Returns:
            Extracted date string or None
        """
        try:
            header_text = text[:1500]
            
            # Date patterns
            patterns = [
                r'(?:Date|Dated|Judgment\s+dated)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(?:Date|Dated|Judgment\s+dated)[:\s]+(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, header_text, re.IGNORECASE)
                if match:
                    date_str = match.group(1).strip()
                    logger.info(f"Extracted judgment date: {date_str}")
                    return date_str
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting judgment date: {e}")
            return None
    
    async def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Complete PDF processing pipeline with robust handling
        Handles structured, unstructured, and semi-structured PDFs
        
        Args:
            file_path: Path to PDF file
        
        Returns:
            Processed PDF data with extracted metadata
        """
        try:
            logger.info(f"Processing PDF: {file_path}")
            
            # Step 1: Extract metadata
            try:
                metadata = self.get_pdf_metadata(file_path)
                logger.info(f"PDF has {metadata['page_count']} pages, size: {metadata['file_size']} bytes")
            except Exception as meta_error:
                logger.error(f"Metadata extraction failed: {meta_error}")
                metadata = {
                    'page_count': 0,
                    'file_size': Path(file_path).stat().st_size if Path(file_path).exists() else 0,
                    'file_hash': self.calculate_file_hash(file_path) if Path(file_path).exists() else 'unknown'
                }
            
            # Step 2: Extract text with multi-method approach
            try:
                full_text, page_data = self.extract_text_from_pdf(file_path)
                
                # Validate extraction quality
                total_chars = sum(p['char_count'] for p in page_data)
                successful_pages = sum(1 for p in page_data if p['char_count'] > 0)
                
                if total_chars < 50:
                    logger.warning(f"Very low text extraction: only {total_chars} characters")
                
                if successful_pages == 0:
                    logger.error("No text extracted from any page!")
                    full_text = "[No text could be extracted from this PDF]"
                    page_data = [{
                        'page_number': 1,
                        'text': '[Extraction failed]',
                        'method': 'failed',
                        'char_count': 0,
                        'quality': 'none'
                    }]
                
                logger.info(f"Extracted {total_chars} characters from {successful_pages}/{len(page_data)} pages")
                
            except Exception as text_error:
                logger.error(f"Text extraction failed: {text_error}")
                full_text = f"[Text extraction error: {str(text_error)}]"
                page_data = [{
                    'page_number': 1,
                    'text': f'[Error: {str(text_error)}]',
                    'method': 'error',
                    'char_count': 0,
                    'quality': 'none'
                }]
            
            # Step 3: Extract sections
            try:
                sections = self.extract_sections(full_text)
            except Exception as section_error:
                logger.error(f"Section extraction failed: {section_error}")
                sections = {'full_text': full_text}
            
            # Step 4: Extract case information from OCR text
            try:
                extracted_case_id = self.extract_case_id(full_text)
                extracted_court_name = self.extract_court_name(full_text)
                extracted_parties = self.extract_parties(full_text)
                extracted_date = self.extract_judgment_date(full_text)
            except Exception as info_error:
                logger.error(f"Case info extraction failed: {info_error}")
                extracted_case_id = None
                extracted_court_name = None
                extracted_parties = {'petitioner': None, 'respondent': None}
                extracted_date = None
            
            # Step 5: Compile result
            result = {
                'metadata': metadata,
                'full_text': full_text,
                'page_data': page_data,
                'sections': sections,
                'extracted_info': {
                    'case_id': extracted_case_id,
                    'court_name': extracted_court_name,
                    'petitioner': extracted_parties.get('petitioner'),
                    'respondent': extracted_parties.get('respondent'),
                    'judgment_date': extracted_date,
                },
                'extraction_quality': {
                    'total_pages': len(page_data),
                    'successful_pages': sum(1 for p in page_data if p['char_count'] > 0),
                    'total_characters': sum(p['char_count'] for p in page_data),
                    'methods_used': list(set(p['method'] for p in page_data)),
                    'quality_score': self._calculate_quality_score(page_data)
                },
                'processing_status': 'success'
            }
            
            logger.info(f"Successfully processed PDF - Quality score: {result['extraction_quality']['quality_score']:.1f}%")
            logger.info(f"Extracted info: Case ID={extracted_case_id}, Court={extracted_court_name}")
            return result
            
        except Exception as e:
            logger.error(f"Critical error processing PDF: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                'metadata': {},
                'full_text': f'[Critical processing error: {str(e)}]',
                'page_data': [],
                'sections': {},
                'extracted_info': {
                    'case_id': None,
                    'court_name': None,
                    'petitioner': None,
                    'respondent': None,
                    'judgment_date': None,
                },
                'extraction_quality': {
                    'total_pages': 0,
                    'successful_pages': 0,
                    'total_characters': 0,
                    'methods_used': ['error'],
                    'quality_score': 0
                },
                'processing_status': 'failed',
                'error': str(e)
            }
    
    def _calculate_quality_score(self, page_data: List[Dict[str, Any]]) -> float:
        """
        Calculate overall extraction quality score (0-100)
        
        Args:
            page_data: List of page extraction data
        
        Returns:
            Quality score percentage
        """
        if not page_data:
            return 0.0
        
        quality_weights = {
            'high': 100,
            'medium': 70,
            'low': 40,
            'none': 0
        }
        
        total_score = 0
        for page in page_data:
            quality = page.get('quality', 'none')
            total_score += quality_weights.get(quality, 0)
        
        return total_score / len(page_data)


# Singleton instance
pdf_processor = PDFProcessor()
