import React, { useEffect, useState } from "react";
import { Box, Typography, TextField, IconButton, Divider } from "@mui/material";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import { Sell as SellIcon, Stars } from "@mui/icons-material";

const EpicsComponent: React.FC = () => {
  const [epics, setEpics] = useState<Tag[]>([]);
  const [filteredEpics, setFilteredEpics] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    loadEpics();
    tagService.subscribeToGetAllTags(onEpicsUpdated);
    return () => {
      tagService.unsubscribeFromGetAllTags(onEpicsUpdated);
    };
  }, []);

  const onEpicsUpdated = () => {
    loadEpics();
  };

  const loadEpics = async (): Promise<void> => {
    const fetchedEpics = await tagService.getTagsWithCounts();
    const epicTags = fetchedEpics.filter((tag) => tag.isEpic);
    setEpics(epicTags);
    setFilteredEpics(epicTags);
  };

  useEffect(() => {
    const filtered = epics.filter((epic: Tag) =>
      epic.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredEpics(filtered);
  }, [searchTerm, epics]);

  return (
    <Box sx={{ backgroundColor: "#f5f5f5" }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search epics..."
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSearchTerm(e.target.value)
        }
        sx={{
          mb: 2,
          backgroundColor: "white",
          border: "1px solid #666666",
          "& .MuiInputBase-input": {
            color: "black",
          },
        }}
      />
      <Divider sx={{ bgcolor: "#666666" }} />
      {filteredEpics.map((epic: Tag) => (
        <React.Fragment key={epic.id}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
            }}
          >
            <Stars sx={{ mr: 1, color: "#673ab7" }} />
            <Typography
              sx={{
                color: "#673ab7",
                fontWeight: epic.count && epic.count > 0 ? "bold" : "normal",
                flexGrow: 1,
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {epic.name} ({epic.count || 0})
            </Typography>
          </Box>
          <Divider sx={{ bgcolor: "#666666" }} />
        </React.Fragment>
      ))}
    </Box>
  );
};

export default EpicsComponent;
