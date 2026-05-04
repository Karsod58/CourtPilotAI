import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import './MockPDFViewer.css';

interface MockPDFViewerProps {
  fileName: string;
}

const MockPDFViewer: React.FC<MockPDFViewerProps> = ({ fileName }) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const totalPages = 2;

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), totalPages);
    });
  };

  const getCurrentPageContent = () => {
    if (pageNumber === 1) {
      return {
        title: "HIGH COURT OF KARNATAKA",
        subtitle: "Bench: Hon'ble Justice Kumar and Hon'ble Justice Reddy",
        caseNumber: "Case No: HC/2024/1234",
        parties: "ABC Welfare Association vs State Government",
        content: [
          "JUDGMENT",
          "",
          "The petitioner has approached this Hon'ble Court seeking appropriate directions regarding pending administrative compliance.",
          "",
          "The petitioner, ABC Welfare Association, is a registered non-governmental organization working for the welfare of children in need of care and protection.",
          "",
          "The respondent authority is directed to submit a compliance report within 30 days from the date of this order.",
          "",
          "The concerned department shall ensure timely action and place the report before the competent authority.",
          "",
          "Matter relates to Home Department and requires immediate administrative follow-up.",
          "",
          "This order is passed on 12 May 2026 and must be complied with forthwith."
        ]
      };
    } else {
      return {
        title: "HIGH COURT OF KARNATAKA (continued)",
        subtitle: "Case Details and Background",
        caseNumber: "Case No: HC/2024/1234",
        parties: "ABC Welfare Association vs State Government",
        content: [
          "BACKGROUND",
          "",
          "The case pertains to implementation of child welfare schemes in the state of Karnataka.",
          "",
          "The petitioner has highlighted several instances where the government schemes are not being implemented effectively at the ground level.",
          "",
          "The court has taken note of the seriousness of the matter and the impact on vulnerable children.",
          "",
          "The Home Department is directed to coordinate with all concerned departments for effective implementation.",
          "",
          "A compliance report must be filed within 30 days from the date of this order.",
          "",
          "Failure to comply will result in contempt proceedings."
        ]
      };
    }
  };

  const pageData = getCurrentPageContent();

  return (
    <div className="pdf-viewer-container">
      {/* PDF Toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <div className="pdf-info">
            <span>Page {pageNumber} of {totalPages}</span>
            <span>{fileName}</span>
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

      {/* Mock PDF Content */}
      <div className="pdf-pages-container">
        <div 
          className="mock-pdf-page"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          <div className="mock-pdf-header">
            <h3 className="court-title">{pageData.title}</h3>
            <p className="court-subtitle">{pageData.subtitle}</p>
            <p className="case-number">{pageData.caseNumber}</p>
            <p className="parties">{pageData.parties}</p>
          </div>

          <div className="mock-pdf-content">
            {pageData.content.map((paragraph, index) => (
              <p key={index} className="mock-pdf-paragraph">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mock-pdf-footer">
            <p>Page {pageNumber} of {totalPages} | Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
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
          Page {pageNumber} of {totalPages}
        </span>
        <button
          onClick={() => changePage(1)}
          disabled={pageNumber >= totalPages}
          className="nav-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default MockPDFViewer;
