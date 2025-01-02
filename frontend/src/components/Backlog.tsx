import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { issueService } from "../services/IssueService";
import { Issue } from "../models/Issue";
import IssueGroup from "./IssueGroup";
import { IssueComponent } from "./IssueComponent";
import { WebsocketService } from "../services/WebSocketService";

const Backlog: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const fetchIssues = async () => {
      const issues = await issueService.getAllIssues();
      setIssues(issues);

      WebsocketService.subscribeToIssueCreateEvent(handleIssueCreated);
      WebsocketService.subscribeToIssueDeletedEvent(handleIssueDeleted);
    };

    fetchIssues();
  }, []);

  const handleIssueCreated = (issue: Issue) => {
    setIssues((prevIssues) => [...prevIssues, issue]);
  };

  const handleIssueDeleted = ({ id }: { id: number }) => {
    setIssues((prevIssues) => prevIssues.filter((issue) => issue.id !== id));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(issues);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setIssues(items);
  };

  return (
    <Box className="backlog-container">
      <Box
        className="backlog-content"
        sx={{
          maxHeight: "100vh",
          overflowY: "auto",
          width: "100%",
        }}
      >
        <IssueGroup issues={issues} weeksFromNow={0} />
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="issues">
            {(provided) => (
              <Box {...provided.droppableProps} ref={provided.innerRef}>
                {issues.map((issue: Issue, index: number) => (
                  <Draggable
                    key={issue.id}
                    draggableId={issue.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <IssueComponent issue={issue} />
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Box>
    </Box>
  );
};

export default Backlog;
