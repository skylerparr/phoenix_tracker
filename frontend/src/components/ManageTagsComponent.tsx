import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import SellIcon from "@mui/icons-material/Sell";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { searchTagsForIssue } from "./IssueComponent";
import { issueService } from "../services/IssueService";

const ManageTagsComponent: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  useEffect(() => {
    loadTags();
    issueService.subscribeToGetAllIssues(onTagsUpdated);
    tagService.subscribeToGetAllTags(onTagsUpdated);
    return () => {
      issueService.unsubscribeFromGetAllIssues(onTagsUpdated);
      tagService.unsubscribeFromGetAllTags(onTagsUpdated);
    };
  }, []);

  const onTagsUpdated = () => {
    console.log("Tags updated");
    loadTags();
  };

  const loadTags = async (): Promise<void> => {
    console.log("Loading tags");
    const fetchedTags = await tagService.getTagsWithCounts();
    console.log("Fetched tags:", fetchedTags);
    setTags(fetchedTags);
    setFilteredTags(fetchedTags);
  };

  useEffect(() => {
    const filtered = tags.filter((tag: Tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredTags(filtered);
  }, [searchTerm, tags]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    tag: Tag,
  ): void => {
    setAnchorEl(event.currentTarget);
    setSelectedTag(tag);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
    setSelectedTag(null);
  };

  const searchForTagByIssue = (): void => {
    if (selectedTag) {
      searchTagsForIssue(selectedTag.id);
      handleMenuClose();
    }
  };

  return (
    <Box sx={{ backgroundColor: "#f5f5f5" }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search tags..."
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
      {filteredTags.map((tag: Tag, index: number) => (
        <React.Fragment key={tag.id}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
            }}
          >
            <SellIcon sx={{ mr: 1, color: "green" }} />
            <Typography
              onClick={() => searchTagsForIssue(tag.id)}
              sx={{
                color: "green",
                fontWeight: tag.count && tag.count > 0 ? "bold" : "normal",
                flexGrow: 1,
                cursor: "pointer",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {tag.name} ({tag.count || 0})
            </Typography>

            <IconButton
              onClick={(e: React.MouseEvent<HTMLElement>) =>
                handleMenuOpen(e, tag)
              }
            >
              <MoreVertIcon sx={{ color: "#666666" }} />
            </IconButton>
          </Box>
          {index < filteredTags.length - 1 && (
            <Divider sx={{ bgcolor: "#666666" }} />
          )}
        </React.Fragment>
      ))}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ color: "#f5f5f5" }}
      >
        <MenuItem
          onClick={() => {
            if (selectedTag) {
              tagService.deleteTag(selectedTag.id);
              handleMenuClose();
            }
          }}
        >
          Delete
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>Rename</MenuItem>
        <MenuItem onClick={searchForTagByIssue}>Show Stories</MenuItem>
        <MenuItem onClick={handleMenuClose}>Convert to Epic</MenuItem>
      </Menu>{" "}
    </Box>
  );
};

export default ManageTagsComponent;
