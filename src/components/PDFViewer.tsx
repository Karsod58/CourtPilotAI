import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertTriangle, Search, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import 'react-pdf/dist/page/AnnotationLayer.css';
import 'react-pdf/dist/page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface Highlight {
  id: string;
  text: string;
  pageNumber: number;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  type: 'directive' | 'deadline' | 'department' | 'critical';
  confidence: number;
}

interface PDFViewerProps {
  file: File | string;
  highlights?: Highlight[];
  onTextSelect?: (text: string, pageNumber: number, boundingRect: any) => void;
  onHighlightClick?: (highlight: Highlight) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  highlights = [],
  onTextSelect,
  onHighlightClick
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError('');
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError('Failed to load PDF. Please check the file.');
    setIsLoading(false);
    console.error('PDF loading error:', error);
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      
      // Get bounding rectangle of selected text
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (onTextSelect && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        onTextSelect(text, pageNumber, {
          x: rect.left - canvasRect.left,
          y: rect.top - canvasRect.top,
          width: rect.width,
          height: rect.height
        });
      }
    }
  }, [pageNumber, onTextSelect]);

  const changePage = useCallback((offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  }, []);

  const rotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  }, []);

  const renderHighlights = useCallback((pageNumber: number) => {
    const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);
    
    return pageHighlights.map(highlight => {
      const colors = {
        directive: 'rgba(255, 235, 59, 0.3)',
        deadline: 'rgba(255, 152, 0, 0.3)',
        department: 'rgba(76, 175, 80, 0.3)',
        critical: 'rgba(244, 67, 54, 0.3)'
      };

      return (
        <div
          key={highlight.id}
          className={`pdf-highlight pdf-highlight-${highlight.type}`}
          style={{
            position: 'absolute',
            left: `${highlight.boundingRect.x * scale}px`,
            top: `${highlight.boundingRect.y * scale}px`,
            width: `${highlight.boundingRect.width * scale}px`,
            height: `${highlight.boundingRect.height * scale}px`,
            backgroundColor: colors[highlight.type],
            border: `2px solid ${colors[highlight.type].replace('0.3', '0.8')}`,
            borderRadius: '2px',
            cursor: 'pointer',
            zIndex: 10
          }}
          onClick={() => onHighlightClick?.(highlight)}
          title={`${highlight.type} (Confidence: ${highlight.confidence}%)`}
        />
      );
    });
  }, [highlights, scale, onHighlightClick]);

  useEffect(() => {
    const handleMouseUp = () => handleTextSelection();
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleTextSelection]);

  if (error) {
    return (
      <div className="pdf-error">
        <AlertTriangle size={48} />
        <h3>PDF Loading Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container">
      {/* PDF Toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <div className="pdf-info">
            <span>Page {pageNumber} of {numPages}</span>
            {selectedText && (
              <span className="selected-text-info">
                "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
              </span>
            )}
          </div>
        </div>
        
        <div className="pdf-toolbar-right">
          <button onClick={zoomOut} disabled={scale <= 0.5} title="Zoom Out">
            <ZoomOut size={18} />
          </button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 3.0} title="Zoom In">
            <ZoomIn size={18} />
          </button>
          <button onClick={rotate} title="Rotate">
            <RotateCw size={18} />
          </button>
        </div>
      </div>

      {/* PDF Pages */}
      <div className="pdf-pages-container" ref={canvasRef}>
        {isLoading && (
          <div className="pdf-loading">
            <div className="loading-spinner" />
            <p>Loading PDF...</p>
          </div>
        )}
        
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          error={null}
        >
          <div className="pdf-page-wrapper">
            {renderHighlights(pageNumber)}
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              className="pdf-page"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </div>
        </Document>
      </div>

      {/* Page Navigation */}
      <div className="pdf-navigation">
        <button
          onClick={() => changePage(-1)}
          disabled={pageNumber <= 1}
          className="nav-btn"
        >
          Previous
        </button>
        <span className="page-info">
          Page {pageNumber} of {numPages}
        </span>
        <button
          onClick={() => changePage(1)}
          disabled={pageNumber >= numPages}
          className="nav-btn"
        >
          Next
        </button>
      </div>

      {/* Legend */}
      {highlights.length > 0 && (
        <div className="highlight-legend">
          <h4>Highlight Legend</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color directive" />
              <span>Directive</span>
            </div>
            <div className="legend-item">
              <div className="legend-color deadline" />
              <span>Deadline</span>
            </div>
            <div className="legend-item">
              <div className="legend-color department" />
              <span>Department</span>
            </div>
            <div className="legend-item">
              <div className="legend-color critical" />
              <span>Critical</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
