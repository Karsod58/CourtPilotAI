export interface TextHighlight {
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
  extractedField?: string;
  reason?: string;
}

export interface ExtractedField {
  label: string;
  value: string;
  confidence: number;
  sourceHighlight?: string;
}

class LegalTextAnalyzer {
  private directivePatterns = [
    // Directive patterns
    /\b(is\s+directed\s+to|shall\s+|must\s+|is\s+required\s+to|is\s+instructed\s+to)\s+([^.]*?)(\.|\n)/gi,
    /\b(submit|file|provide|comply|implement|ensure|establish|appoint|notify)\s+([^.]*?)(\.|\n)/gi,
    /\b(within\s+(\d+)\s+(days|weeks|months|years))\b/gi,
    /\b(not\s+later\s+than|before|on\s+or\s+before)\s+([^.]*?)(\.|\n)/gi,
    
    // Legal directive patterns
    /\b(the\s+authority\s+is\s+directed|the\s+respondent\s+shall|petitioner\s+is\s+directed)\s+([^.]*?)(\.|\n)/gi,
    /\b(order\s+directs|court\s+directs|hon'ble\s+court\s+directs)\s+([^.]*?)(\.|\n)/gi,
  ];

  private deadlinePatterns = [
    /\b(within\s+(\d+)\s+(days|weeks|months|years)\s+from\s+(the\s+date\s+of\s+this\s+order|today))\b/gi,
    /\b(within\s+(\d+)\s+(days|weeks|months|years))\b/gi,
    /\b(on\s+or\s+before\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi,
    /\b(not\s+later\s+than\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi,
    /\b(by\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi,
  ];

  private departmentPatterns = [
    /\b(home\s+department|finance\s+department|education\s+department|pwd|public\s+works\s+department|social\s+justice|health\s+department|agriculture\s+department|revenue\s+department)\b/gi,
    /\b(department\s+of\s+(home|finance|education|public\s+works|health|agriculture|revenue|social\s+justice))\b/gi,
    /\b(concerned\s+department|responsible\s+department|competent\s+authority)\b/gi,
  ];

  private criticalPatterns = [
    /\b(urgent|immediately|forthwith|without\s+delay|expeditiously|promptly)\b/gi,
    /\b(critical|vital|essential|important|necessary)\b/gi,
    /\b(non-compliance|failure\s+to\s+comply|contempt\s+of\s+court)\b/gi,
  ];

  analyzeText(text: string, pageNumber: number): TextHighlight[] {
    const highlights: TextHighlight[] = [];
    let idCounter = 1;

    // Find directives
    this.directivePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        highlights.push({
          id: `directive-${idCounter++}`,
          text: match[0],
          pageNumber,
          boundingRect: this.generateMockBoundingRect(),
          type: 'directive',
          confidence: this.calculateConfidence(match[0]),
          extractedField: 'directive',
          reason: 'Legal directive detected'
        });
      }
    });

    // Find deadlines
    this.deadlinePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        highlights.push({
          id: `deadline-${idCounter++}`,
          text: match[0],
          pageNumber,
          boundingRect: this.generateMockBoundingRect(),
          type: 'deadline',
          confidence: this.calculateConfidence(match[0]),
          extractedField: 'deadline',
          reason: 'Deadline or timeline detected'
        });
      }
    });

    // Find departments
    this.departmentPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        highlights.push({
          id: `department-${idCounter++}`,
          text: match[0],
          pageNumber,
          boundingRect: this.generateMockBoundingRect(),
          type: 'department',
          confidence: this.calculateConfidence(match[0]),
          extractedField: 'department',
          reason: 'Government department identified'
        });
      }
    });

    // Find critical terms
    this.criticalPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        highlights.push({
          id: `critical-${idCounter++}`,
          text: match[0],
          pageNumber,
          boundingRect: this.generateMockBoundingRect(),
          type: 'critical',
          confidence: this.calculateConfidence(match[0]),
          reason: 'Critical legal term detected'
        });
      }
    });

    return highlights;
  }

  extractFields(text: string): ExtractedField[] {
    const fields: ExtractedField[] = [];

    // Extract case title
    const caseTitleMatch = text.match(/([A-Z][\w\s&]+vs\s+[A-Z][\w\s&]+)/i);
    if (caseTitleMatch) {
      fields.push({
        label: 'Case Title',
        value: caseTitleMatch[1].trim(),
        confidence: 95,
        sourceHighlight: caseTitleMatch[0]
      });
    }

    // Extract case number
    const caseNumberMatch = text.match(/(?:Case\s+No\.?|WP|Civil\s+Appeal|Service\s+Matter)\s*[:\-]?\s*([A-Z0-9\/]+)/i);
    if (caseNumberMatch) {
      fields.push({
        label: 'Case Number',
        value: caseNumberMatch[1].trim(),
        confidence: 92,
        sourceHighlight: caseNumberMatch[0]
      });
    }

    // Extract court name
    const courtMatch = text.match(/(?:HIGH\s+COURT\s+OF|SUPREME\s+COURT|DISTRICT\s+COURT)\s+([A-Z\s]+)/i);
    if (courtMatch) {
      fields.push({
        label: 'Court',
        value: courtMatch[0].trim(),
        confidence: 90,
        sourceHighlight: courtMatch[0]
      });
    }

    // Extract order date
    const dateMatch = text.match(/(?:Date\s*:?\s*|Ordered\s+on\s*|Dated\s*:?\s*)(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
    if (dateMatch) {
      fields.push({
        label: 'Order Date',
        value: dateMatch[1].trim(),
        confidence: 94,
        sourceHighlight: dateMatch[0]
      });
    }

    // Extract petitioner and respondent
    const petitionerMatch = text.match(/(?:Petitioner\s*:?\s*|Petitioner\s+is\s*)([A-Z][\w\s&]+)/i);
    if (petitionerMatch) {
      fields.push({
        label: 'Petitioner',
        value: petitionerMatch[1].trim(),
        confidence: 88,
        sourceHighlight: petitionerMatch[0]
      });
    }

    const respondentMatch = text.match(/(?:Respondent\s*:?\s*|Respondent\s+is\s*)([A-Z][\w\s&]+)/i);
    if (respondentMatch) {
      fields.push({
        label: 'Respondent',
        value: respondentMatch[1].trim(),
        confidence: 88,
        sourceHighlight: respondentMatch[0]
      });
    }

    return fields;
  }

  private calculateConfidence(text: string): number {
    let confidence = 70; // Base confidence

    // Increase confidence based on text characteristics
    if (text.length > 10) confidence += 5;
    if (/\b(directed|shall|must|within|before|department)\b/i.test(text)) confidence += 10;
    if (/\d+\s+(days|weeks|months|years)/i.test(text)) confidence += 15;
    if (/\b(home|finance|education|pwd|public\s+works)\b/i.test(text)) confidence += 10;

    return Math.min(confidence, 98);
  }

  private generateMockBoundingRect() {
    // This would normally be calculated from actual text position
    // For now, generating mock coordinates
    return {
      x: Math.random() * 400 + 50,
      y: Math.random() * 500 + 100,
      width: Math.random() * 200 + 100,
      height: 20
    };
  }

  // Method to process PDF text items and get real bounding boxes
  processTextItems(textItems: any[], pageNumber: number): TextHighlight[] {
    const fullText = textItems.map(item => item.str).join(' ');
    const highlights = this.analyzeText(fullText, pageNumber);

    // In a real implementation, we would match highlights with actual text items
    // to get accurate bounding boxes. For now, we'll use mock positions.
    return highlights.map((highlight, index) => ({
      ...highlight,
      boundingRect: this.getBoundingBoxFromTextItems(highlight.text, textItems)
    }));
  }

  private getBoundingBoxFromTextItems(highlightText: string, textItems: any[]): { x: number; y: number; width: number; height: number } {
    // Find the text items that contain the highlighted text
    // This is a simplified version - in reality, we'd need more sophisticated matching
    const matchingItems = textItems.filter(item => 
      item.str.toLowerCase().includes(highlightText.toLowerCase().substring(0, 20))
    );

    if (matchingItems.length > 0) {
      const firstItem = matchingItems[0];
      const lastItem = matchingItems[matchingItems.length - 1];
      
      return {
        x: firstItem.transform[4] || 0,
        y: firstItem.transform[5] || 0,
        width: (lastItem.transform[4] || 0) - (firstItem.transform[4] || 0) + 100,
        height: firstItem.height || 20
      };
    }

    return this.generateMockBoundingRect();
  }
}

export const legalTextAnalyzer = new LegalTextAnalyzer();
