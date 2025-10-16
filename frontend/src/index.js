import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// CSS for Markdown Editor & Preview
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

// Global styles and overrides (must be last to take precedence)
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
