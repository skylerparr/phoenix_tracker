import React, { useEffect, useState } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { useSearchParams } from "../hooks/useSearchParams";
import { projectNoteTagService } from "../services/ProjectNoteTagService";
import { ProjectNoteTag } from "../models/ProjectNoteTag";

export const PARAM_PROJECT_NOTE_TAG = "projectNoteTag";

export const ProjectNoteTagComponent: React.FC = () => {
  const searchParams = useSearchParams();

  const [projectNoteTag, setProjectNoteTag] = useState<ProjectNoteTag | null>(
    null,
  );

  useEffect(() => {
    const projectNoteTag = searchParams.get(PARAM_PROJECT_NOTE_TAG);

    if (projectNoteTag) {
      fetchProjectNotePartsByTag(projectNoteTag);
    }
  }, [searchParams]);

  const fetchProjectNotePartsByTag = async (tag: string) => {
    const fetchedTag =
      await projectNoteTagService.getProjectNoteTagByTagName(tag);
    if (fetchedTag) {
      setProjectNoteTag(fetchedTag);
    }
  };

  if (!projectNoteTag) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 2,
        }}
      >
        <Typography color="textSecondary">
          No project note parts found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: "#f5f5f5" }}>
      <Box
        sx={{
          p: 1,
          backgroundColor: "white",
          borderBottom: "1px solid #666666",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold", color: "black" }}>
          #{projectNoteTag.tagName}
        </Typography>
      </Box>
      <Divider sx={{ bgcolor: "#666666" }} />
      {projectNoteTag.projectNoteParts.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography color="textSecondary">
            No parts found for this tag
          </Typography>
        </Box>
      ) : (
        projectNoteTag.projectNoteParts.map((part, index) => (
          <React.Fragment key={part.id}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                p: 0,
                "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              }}
            >
              {part.content && (
                <Typography
                  sx={{
                    color: "black",
                    mb: 0.5,
                    pl: 1,
                  }}
                >
                  {part.content}
                </Typography>
              )}
            </Box>
            {index < projectNoteTag.projectNoteParts.length - 1 && (
              <Divider sx={{ bgcolor: "#666666" }} />
            )}
          </React.Fragment>
        ))
      )}
    </Box>
  );
};
