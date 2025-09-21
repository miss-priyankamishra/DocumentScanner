import React, { useState, useRef, useEffect } from "react";


const Previw = () => {
  const [originalSrc, setOriginalSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);

  // Process the image when file is selected
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalSrc(e.target.result);
      setTimeout(() => processImage(e.target.result), 100); // delay to ensure OpenCV ready
    };
    reader.readAsDataURL(file);
  };

  const processImage = (src) => {
    setLoading(true);
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // OpenCV processing
      let mat = cv.imread(canvas);
      let gray = new cv.Mat();
      let blurred = new cv.Mat();
      let thresh = new cv.Mat();

      // Convert to grayscale
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);

      // Noise removal (Gaussian blur)
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

      // Adaptive threshold (simulate scanner contrast)
      cv.adaptiveThreshold(
        blurred,
        thresh,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        11,
        2
      );

      cv.imshow(canvas, thresh);

      // Cleanup
      mat.delete();
      gray.delete();
      blurred.delete();
      thresh.delete();
      setLoading(false);
    };
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-xl font-bold mb-4">📄 Document Scan Preview</h2>

      {/* File Input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={inputRef}
        className="mb-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Original */}
        {originalSrc && (
          <div className="flex flex-col items-center">
            <h3 className="mb-2 font-semibold">Original</h3>
            <img
              src={originalSrc}
              alt="Original"
              className="border rounded shadow max-w-full"
            />
          </div>
        )}

        {/* Processed */}
        {originalSrc && (
          <div className="flex flex-col items-center">
            <h3 className="mb-2 font-semibold">Scanned Preview</h3>
            {loading ? (
              <p className="text-gray-500">Processing...</p>
            ) : (
              <canvas ref={canvasRef} className="border rounded shadow" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Previw;
