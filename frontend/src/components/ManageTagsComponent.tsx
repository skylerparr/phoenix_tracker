import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { tagService } from "../services/TagService";
import { Tag } from "../models/Tag";
import {
  Sell as SellIcon,
  MoreVert as MoreVertIcon,
  Save as SaveIcon,
  Stars,
} from "@mui/icons-material";
import { searchTagsForIssue } from "./IssueComponent";
import { issueService } from "../services/IssueService";
const ManageTagsComponent: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagName, setEditingTagName] = useState<string>("");

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
    loadTags();
  };

  const loadTags = async (): Promise<void> => {
    const fetchedTags = await tagService.getTagsWithCounts();
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

  const handleSaveTagName = async (tagId: number) => {
    await tagService.updateTag(tagId, { name: editingTagName });
    setEditingTagId(null);
    setEditingTagName("");
  };

  const handleToggleEpic = async () => {
    if (selectedTag) {
      await tagService.updateTag(selectedTag.id, {
        isEpic: !selectedTag.isEpic,
      });
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
            {tag.isEpic ? (
              <Stars sx={{ mr: 1, color: "#673ab7" }} />
            ) : (
              <SellIcon sx={{ mr: 1, color: "green" }} />
            )}
            {editingTagId === tag.id ? (
              <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                <TextField
                  value={editingTagName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingTagName(e.target.value)
                  }
                  size="small"
                  autoFocus
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      handleSaveTagName(tag.id);
                    } else if (e.key === "Escape") {
                      setEditingTagId(null);
                      setEditingTagName("");
                    }
                  }}
                  sx={{
                    flexGrow: 1,
                    backgroundColor: "#414141",
                    color: "black",
                  }}
                />
                <IconButton onClick={() => handleSaveTagName(tag.id)}>
                  <SaveIcon sx={{ color: "green" }} />
                </IconButton>
              </Box>
            ) : (
              <Typography
                onClick={() => searchTagsForIssue(tag.id)}
                sx={{
                  color: tag.isEpic ? "#673ab7" : "green",
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
            )}
            {editingTagId === null && (
              <IconButton
                onClick={(e: React.MouseEvent<HTMLElement>) =>
                  handleMenuOpen(e, tag)
                }
              >
                <MoreVertIcon sx={{ color: "#666666" }} />
              </IconButton>
            )}
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
        <MenuItem
          onClick={() => {
            if (selectedTag) {
              setEditingTagId(selectedTag.id);
              setEditingTagName(selectedTag.name);
              handleMenuClose();
            }
          }}
        >
          Rename
        </MenuItem>
        <MenuItem onClick={searchForTagByIssue}>Show Stories</MenuItem>
        <MenuItem onClick={handleToggleEpic}>
          {selectedTag?.isEpic
            ? "Convert to Standard Label"
            : "Convert to Epic"}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ManageTagsComponent;
