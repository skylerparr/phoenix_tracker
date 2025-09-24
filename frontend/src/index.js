import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// CSS for Markdown Editor & Preview
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
