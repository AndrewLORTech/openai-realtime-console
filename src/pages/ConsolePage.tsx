/**
 * Running a local relay server will allow you to hide your API key
 * and run custom logic on the server.
 *
 * Set the local relay server address to:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * Ensure OPENAI_API_KEY is set in a `.env` file for real-time API usage.
 */
const LOCAL_RELAY_SERVER_URL: string =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

import { useEffect, useRef, useCallback, useState } from 'react';
import { read, utils } from 'xlsx'; // Library for Excel files
import { pdfjs } from 'pdfjs-dist'; // Library for PDF files
import './ConsolePage.scss';
import { Button } from '../components/button/Button';

/**
 * ConsolePage Component for File Ingestion
 */
export function ConsolePage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedContent, setParsedContent] = useState<any[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  /**
   * Handle File Uploads
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    setUploadedFiles(fileArray);

    const contentPromises = fileArray.map(async (file) => {
      try {
        if (file.type === 'application/pdf') {
          // Parse PDF files
          const pdf = await pdfjs.getDocument(URL.createObjectURL(file)).promise;
          const textPromises = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            textPromises.push(pageText);
          }
          return { name: file.name, type: 'PDF', content: await Promise.all(textPromises) };
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          // Parse Excel files
          const data = await file.arrayBuffer();
          const workbook = read(data);
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = utils.sheet_to_json(sheet);
          return { name: file.name, type: 'Excel', content: json };
        } else {
          // Unsupported file type
          return { name: file.name, type: 'Unsupported', content: 'Unsupported file type' };
        }
      } catch (error) {
        setErrorMessages((prevErrors) => [
          ...prevErrors,
          `Error processing ${file.name}: ${error.message}`,
        ]);
        return { name: file.name, type: 'Error', content: 'Failed to process file' };
      }
    });

    const contents = await Promise.all(contentPromises);
    setParsedContent(contents);
  };

  return (
    <div data-component="ConsolePage">
      <div className="content-main">
        {/* File Upload Section */}
        <div className="content-block upload">
          <div className="content-block-title">Document Upload</div>
          <input
            type="file"
            accept=".pdf,.xlsx"
            multiple
            onChange={handleFileUpload}
          />
          <div className="uploaded-files">
            <h3>Uploaded Files:</h3>
            {uploadedFiles.map((file, index) => (
              <div key={index}>{file.name}</div>
            ))}
          </div>
        </div>

        {/* Parsed Content Section */}
        <div className="content-block parsed-content">
          <div className="content-block-title">Parsed Content</div>
          <pre>
            {parsedContent.length > 0
              ? JSON.stringify(parsedContent, null, 2)
              : 'No content parsed yet. Upload a PDF or Excel file to see results.'}
          </pre>
        </div>

        {/* Error Logs Section */}
        <div className="content-block errors">
          <div className="content-block-title">Errors</div>
          {errorMessages.length > 0 ? (
            <ul>
              {errorMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          ) : (
            <p>No errors reported.</p>
          )}
        </div>
      </div>
    </div>
  );
}
