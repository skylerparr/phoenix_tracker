import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import MDEditor from "@uiw/react-md-editor";
import remarkGfm from "remark-gfm";

export interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  height?: number;
  withTabs?: boolean; // when true, shows Write/Preview tabs within the editor
  placeholder?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  height = 200,
  withTabs = true,
  placeholder,
}) => {
  const [tab, setTab] = React.useState<number>(0); // 0 = Write, 1 = Preview

  return (
    <Box>
      {withTabs && (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tab}
            onChange={(_, newValue: number) => setTab(newValue)}
            aria-label="markdown editor tabs"
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              "& .MuiTab-root": {
                color: "black",
                "&.Mui-selected": {
                  color: "black",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  borderTopLeftRadius: "4px",
                  borderTopRightRadius: "4px",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "black",
              },
            }}
          >
            <Tab label="Write" />
            <Tab label="Preview" />
          </Tabs>
        </Box>
      )}

      {tab === 0 || !withTabs ? (
        <MDEditor
          value={value}
          onChange={(v?: string) => onChange(v ?? "")}
          height={height}
          preview={withTabs ? "edit" : "edit"}
          previewOptions={{ remarkPlugins: [remarkGfm] }}
          textareaProps={{ placeholder }}
        />
      ) : (
        <Box
          sx={{
            bgcolor: "transparent",
            minHeight: `${height}px`,
            border: "1px solid rgba(0, 0, 0, 0.23)",
            borderRadius: "4px",
            color: "black",
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {value ? (
            <MDEditor.Markdown source={value} remarkPlugins={[remarkGfm]} />
          ) : (
            <Typography sx={{ color: "#999", fontStyle: "italic" }}>
              Nothing to preview
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MarkdownEditor;
