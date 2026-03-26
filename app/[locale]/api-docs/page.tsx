"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "2rem", color: "#e0e0e0", textAlign: "center" }}>
      <p>Cargando documentacion...</p>
    </div>
  ),
});

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    // @ts-expect-error — CSS module has no type declarations
    import("swagger-ui-react/swagger-ui.css").then(() => setCssLoaded(true));

    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) {
          setError(data.error);
        } else {
          setSpec(data);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: "2rem", color: "#FF6B6B", textAlign: "center" }}>
        <h1>Error al cargar la documentacion</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!spec || !cssLoaded) {
    return (
      <div style={{ padding: "2rem", color: "#e0e0e0", textAlign: "center" }}>
        <p>Cargando documentacion...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .swagger-ui {
          color: #e0e0e0;
        }
        .swagger-ui .topbar {
          display: none;
        }
        body {
          background-color: #0a0e17;
        }
        .swagger-ui .scheme-container {
          background: #111827;
          box-shadow: none;
        }
        .swagger-ui .opblock-tag {
          color: #e0e0e0 !important;
          border-bottom-color: #1f2937 !important;
        }
        .swagger-ui .opblock-tag:hover {
          background: #111827 !important;
        }
        .swagger-ui .opblock {
          background: #111827;
          border-color: #1f2937;
          box-shadow: none;
        }
        .swagger-ui .opblock .opblock-summary {
          border-color: #1f2937;
        }
        .swagger-ui .opblock .opblock-summary-description {
          color: #a0aec0;
        }
        .swagger-ui .opblock.opblock-get {
          background: rgba(74, 144, 226, 0.08);
          border-color: rgba(74, 144, 226, 0.3);
        }
        .swagger-ui .opblock.opblock-get .opblock-summary {
          border-color: rgba(74, 144, 226, 0.3);
        }
        .swagger-ui .opblock.opblock-post {
          background: rgba(76, 175, 125, 0.08);
          border-color: rgba(76, 175, 125, 0.3);
        }
        .swagger-ui .opblock.opblock-post .opblock-summary {
          border-color: rgba(76, 175, 125, 0.3);
        }
        .swagger-ui .opblock.opblock-put {
          background: rgba(247, 168, 37, 0.08);
          border-color: rgba(247, 168, 37, 0.3);
        }
        .swagger-ui .opblock.opblock-delete {
          background: rgba(255, 107, 107, 0.08);
          border-color: rgba(255, 107, 107, 0.3);
        }
        .swagger-ui .opblock-body {
          background: #0d1117;
        }
        .swagger-ui .opblock .opblock-section-header {
          background: #111827;
          box-shadow: none;
        }
        .swagger-ui .opblock .opblock-section-header h4 {
          color: #e0e0e0;
        }
        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          color: #e0e0e0;
          border-bottom-color: #1f2937;
        }
        .swagger-ui .parameter__name {
          color: #e0e0e0;
        }
        .swagger-ui .parameter__type {
          color: #a0aec0;
        }
        .swagger-ui .parameter__in {
          color: #718096;
        }
        .swagger-ui .response-col_status {
          color: #e0e0e0;
        }
        .swagger-ui .response-col_description__inner p {
          color: #a0aec0;
        }
        .swagger-ui .responses-inner h4,
        .swagger-ui .responses-inner h5 {
          color: #e0e0e0;
        }
        .swagger-ui .model-title {
          color: #e0e0e0;
        }
        .swagger-ui .model {
          color: #a0aec0;
        }
        .swagger-ui .model-toggle::after {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a0aec0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") center no-repeat;
        }
        .swagger-ui section.models {
          border-color: #1f2937;
        }
        .swagger-ui section.models h4 {
          color: #e0e0e0;
        }
        .swagger-ui section.models .model-container {
          background: #111827;
          border-color: #1f2937;
        }
        .swagger-ui .model-box {
          background: #0d1117;
        }
        .swagger-ui .prop-type {
          color: #4CAF7D;
        }
        .swagger-ui .prop-format {
          color: #718096;
        }
        .swagger-ui .info .title {
          color: #F7A825;
        }
        .swagger-ui .info p,
        .swagger-ui .info li {
          color: #a0aec0;
        }
        .swagger-ui .info a {
          color: #F7A825;
        }
        .swagger-ui .info .markdown p code,
        .swagger-ui .info .markdown pre {
          background: #111827;
          color: #e0e0e0;
        }
        .swagger-ui .btn {
          color: #e0e0e0;
          border-color: #4a5568;
        }
        .swagger-ui .btn:hover {
          background: #1f2937;
        }
        .swagger-ui .btn.execute {
          background: #F7A825;
          color: #0a0e17;
          border-color: #F7A825;
        }
        .swagger-ui .btn.execute:hover {
          background: #e09520;
        }
        .swagger-ui select {
          background: #111827;
          color: #e0e0e0;
          border-color: #4a5568;
        }
        .swagger-ui input[type="text"],
        .swagger-ui textarea {
          background: #111827;
          color: #e0e0e0;
          border-color: #4a5568;
        }
        .swagger-ui .highlight-code {
          background: #0d1117 !important;
        }
        .swagger-ui .highlight-code .microlight {
          color: #e0e0e0 !important;
          background: #0d1117 !important;
        }
        .swagger-ui .copy-to-clipboard {
          background: #1f2937;
        }
        .swagger-ui .download-contents {
          background: #1f2937;
          color: #e0e0e0;
        }
        .swagger-ui .auth-wrapper .authorize {
          border-color: #F7A825;
          color: #F7A825;
        }
        .swagger-ui .dialog-ux .modal-ux {
          background: #111827;
          border-color: #1f2937;
        }
        .swagger-ui .dialog-ux .modal-ux-header h3 {
          color: #e0e0e0;
        }
        .swagger-ui .dialog-ux .modal-ux-content p {
          color: #a0aec0;
        }
        .swagger-ui .loading-container .loading::after {
          color: #F7A825;
        }
        .swagger-ui .response-control-media-type__accept-message {
          color: #4CAF7D;
        }
        .swagger-ui .markdown code,
        .swagger-ui .renderedMarkdown code {
          background: #1a1f2e;
          color: #F7A825;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .swagger-ui .markdown pre,
        .swagger-ui .renderedMarkdown pre {
          background: #0d1117;
          border: 1px solid #1f2937;
          border-radius: 8px;
        }
      `}</style>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1rem",
          background: "#0a0e17",
          minHeight: "100vh",
        }}
      >
        <SwaggerUI spec={spec} />
      </div>
    </>
  );
}
