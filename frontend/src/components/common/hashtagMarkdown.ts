import React from "react";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

// Custom remark plugin to detect and transform hashtags
export function remarkHashtags() {
  return (tree: any) => {
    visit(
      tree,
      "text",
      (node: any, index: number | null | undefined, parent: any) => {
        if (!node.value) return;

        const hashtagRegex = /#(\w+)/g;
        const matches = node.value.match(hashtagRegex);

        if (!matches) return;

        const newNodes: any[] = [];
        let lastIndex = 0;

        node.value.replace(
          hashtagRegex,
          (match: string, tag: string, offset: number) => {
            // Add text before hashtag
            if (offset > lastIndex) {
              newNodes.push({
                type: "text",
                value: node.value.slice(lastIndex, offset),
              });
            }

            // Add hashtag as span with data attribute
            newNodes.push({
              type: "html",
              value: `<span class="hashtag-link" data-hashtag="${tag}" style="cursor: pointer; color: #1976d2; text-decoration: none; font-weight: 500;">${match}</span>`,
            });

            lastIndex = offset + match.length;
            return match;
          },
        );

        // Add remaining text
        if (lastIndex < node.value.length) {
          newNodes.push({
            type: "text",
            value: node.value.slice(lastIndex),
          });
        }

        if (newNodes.length > 0 && parent && typeof index === "number") {
          parent.children.splice(index, 1, ...newNodes);
        }
      },
    );
  };
}

// Shared hook to enable clickable hashtags inside a container
export function useHashtagClick(
  containerRef: React.RefObject<HTMLElement>,
  onHashtagClick?: (tag: string) => void,
  deps: React.DependencyList = [],
) {
  React.useEffect(() => {
    if (!onHashtagClick || !containerRef.current) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.classList &&
        target.classList.contains("hashtag-link")
      ) {
        e.preventDefault();
        e.stopPropagation();
        const tag = target.getAttribute("data-hashtag");
        if (tag) onHashtagClick(tag);
      }
    };

    const attachListeners = () => {
      if (!containerRef.current) return () => {};
      const hashtagLinks =
        containerRef.current.querySelectorAll(".hashtag-link");
      hashtagLinks.forEach((link) =>
        link.addEventListener("click", handleClick),
      );
      return () => {
        hashtagLinks.forEach((link) =>
          link.removeEventListener("click", handleClick),
        );
      };
    };

    // Initial attach
    let cleanup = attachListeners();

    // Watch for DOM changes and re-attach
    const observer = new MutationObserver(() => {
      if (cleanup) cleanup();
      cleanup = attachListeners();
    });

    observer.observe(containerRef.current, { childList: true, subtree: true });

    return () => {
      if (cleanup) cleanup();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHashtagClick, containerRef, ...deps]);
}

// Helper to build remark plugins for markdown preview that supports hashtags
export function getHashtagRemarkPlugins(
  onHashtagClick?: (tag: string) => void,
) {
  return onHashtagClick ? [remarkGfm, remarkHashtags] : [remarkGfm];
}
