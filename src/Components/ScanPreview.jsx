import React, { useState, useRef, useEffect, useCallback } from "react";
import "./ScanPreview.css";

const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";

export default function ScanPreview() {
  const [originalSrc, setOriginalSrc] = useState(null);
  const [processedSrc, setProcessedSrc] = useState(null);
  const [cvReady, setCvReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dropAreaRef = useRef(null);

  // Load OpenCV.js dynamically
  useEffect(() => {
    if (window.cv) {
      setCvReady(true);
      return;
    }
    
    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.onload = () => {
      window.cv["onRuntimeInitialized"] = () => {
        setCvReady(true);
      };
    };
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalSrc(url);
    setProcessedSrc(null);
    setIsProcessing(true);
  }, []);

  // Process image once originalSrc changes
  useEffect(() => {
    if (!originalSrc || !cvReady) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalSrc;
    img.onload = () => {
      try {
        const processedDataUrl = processImage(img);
        setProcessedSrc(processedDataUrl);
      } catch (err) {
        console.error("OpenCV processing error:", err);
        alert('Error processing image. Please try another file.');
      } finally {
        setIsProcessing(false);
      }
    };
  }, [originalSrc, cvReady]);

  const processImage = (img) => {
    const cv = window.cv;
    let src = cv.imread(img);
    let dst = new cv.Mat();

    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

    let thresh = new cv.Mat();
    cv.adaptiveThreshold(
      dst,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      15,
      15
    );

    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.morphologyEx(thresh, thresh, cv.MORPH_OPEN, kernel);

    let deskewed = deskewImage(thresh);

    let final = new cv.Mat();
    cv.cvtColor(deskewed, final, cv.COLOR_GRAY2RGBA);

    const canvas = document.createElement("canvas");
    cv.imshow(canvas, final);

    // Cleanup OpenCV mats
    src.delete();
    dst.delete();
    thresh.delete();
    kernel.delete();
    deskewed.delete();
    final.delete();

    return canvas.toDataURL();
  };

  // Deskew function
  const deskewImage = (src) => {
    const cv = window.cv;
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(
      src,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    let maxArea = 0;
    let maxContour = null;
    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt);
      if (area > maxArea) {
        maxArea = area;
        maxContour = cnt;
      }
    }

    if (!maxContour) {
      contours.delete();
      hierarchy.delete();
      return src.clone();
    }

    let rotatedRect = cv.minAreaRect(maxContour);
    let angle = rotatedRect.angle;
    if (angle < -45) angle += 90;

    let center = new cv.Point(src.cols / 2, src.rows / 2);
    let M = cv.getRotationMatrix2D(center, angle, 1);

    let rotated = new cv.Mat();
    let dsize = new cv.Size(src.cols, src.rows);
    cv.warpAffine(
      src,
      rotated,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    contours.delete();
    hierarchy.delete();
    maxContour.delete();
    M.delete();

    return rotated;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const downloadProcessedImage = () => {
    if (!processedSrc) return;
    
    const link = document.createElement('a');
    link.href = processedSrc;
    link.download = 'scanned-document.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="scan-preview">
      <div className="header">
        <h1>Document Scanner</h1>
       
      </div>
      <form>
      <div class="form-group">

<input type="text" id="name" name="name" placeholder="Your full name" required />
</div>
<div class="form-group">
<input type="email" id="email" name="email" placeholder="priyanka.mishra28011@gmail.com" required />
</div>
<div class="form-group">

<textarea id="message" name="message" placeholder="Write your message." required></textarea>
</div>



      <div 
        ref={dropAreaRef}
        className={`drop-area ${isDragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFileClick}
      >
        {isProcessing ? (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing your document...</p>
          </div>
        ) : (
          <div className="drop-content">
            <div className="upload-icon">📁</div>
            <p>Drag & drop your document image here or click to browse</p>
            <small>Supported formats: JPG, PNG, WebP</small>
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>

      {!cvReady && (
        <div className="loading-cv">
          <p>Loading image processing engine...</p>
        </div>
      )}

      {(originalSrc || processedSrc) && (
        <div className="preview-section">
          <div className="preview-grid">
            {originalSrc && (
              <div className="preview-card">
                <h3>Original Image</h3>
                <img
                  src={originalSrc}
                  alt="Original document"
                  className="preview-image"
                />
              </div>
            )}
            
            {processedSrc && (
              <div className="preview-card">
                <div className="preview-header">
                  <h3>Scanned Preview</h3>
                  <button 
                    onClick={downloadProcessedImage}
                    className="download-btn"
                    title="Download scanned image"
                  >
                    💾 Download
                  </button>
                </div>
                <img
                  src={processedSrc}
                  alt="Processed scanned document"
                  className="preview-image"
                />
                <div className="processing-info">
                  <span>✓ Grayscale</span>
                  <span>✓ Contrast Enhanced</span>
                  <span>✓ Noise Reduced</span>
                  <span>✓ Deskewed</span>
                </div>
              </div>
            )}
            
          </div>
        </div>
      
      )}
      </form>
    </div>
  );
}