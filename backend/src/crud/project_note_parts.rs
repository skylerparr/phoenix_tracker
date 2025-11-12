use crate::crud::event_broadcaster::EventBroadcaster;
use crate::crud::event_broadcaster::{PROJECT_NOTE_PART_UPDATED, PROJECT_NOTE_UPDATED};
use crate::crud::project_note_tag::ProjectNoteTagCrud;
use crate::entities::project_note_parts;
use crate::AppState;
use comrak::nodes::{
    Ast, AstNode, ListDelimType, ListType, NodeCode, NodeCodeBlock, NodeHeading, NodeHtmlBlock,
    NodeLink, NodeList, NodeValue,
};
use comrak::{format_commonmark, parse_document, Arena, Options};
use regex::Regex;
use sea_orm::*;
use std::cell::RefCell;
use std::collections::HashMap;

pub struct ProjectNotePartsCrud {
    app_state: AppState,
}

#[derive(Clone, Copy, Debug)]
struct Ctx {
    in_code: bool,
    in_link: bool,
    in_html: bool,
}

#[derive(Clone, Debug)]
struct PrePart {
    parent_local: Option<i32>,
    idx: i32,
    part_type: String,
    content: Option<String>,
    data: Option<String>,
}

impl ProjectNotePartsCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
    }

    // Public utility: reconstruct markdown from stored part records
    pub fn ast_to_markdown_string(parts: &[project_note_parts::Model]) -> String {
        if parts.is_empty() {
            return String::new();
        }

        // Index parts by id and build children lists sorted by idx
        let mut by_id: HashMap<i32, &project_note_parts::Model> = HashMap::new();
        let mut children: HashMap<i32, Vec<i32>> = HashMap::new();
        let mut roots: Vec<&project_note_parts::Model> = Vec::new();
        for p in parts.iter() {
            by_id.insert(p.id, p);
            if let Some(pid) = p.parent_id {
                children.entry(pid).or_default().push(p.id);
            } else {
                roots.push(p);
            }
        }
        for v in children.values_mut() {
            v.sort_by_key(|cid| by_id[cid].idx);
        }

        // Prefer a Document root when available
        let root_part = roots
            .iter()
            .find(|p| p.part_type == "Document")
            .copied()
            .or_else(|| roots.iter().min_by_key(|p| p.idx).copied())
            .unwrap_or(
                parts
                    .iter()
                    .find(|p| p.part_type == "Document")
                    .unwrap_or(&parts[0]),
            );

        // Build comrak AST in an arena
        let arena = Arena::new();
        use comrak::arena_tree::Node as CNode;
        let mut node_map: HashMap<i32, *const CNode<'_, RefCell<Ast>>> = HashMap::new();

        // First pass: create nodes for all parts
        for p in parts.iter() {
            let nv = Self::fields_to_node_value(p);
            let n: &AstNode = arena.alloc(AstNode::new(RefCell::new(Ast::new(nv, (0, 0).into()))));
            node_map.insert(p.id, n as *const _);
        }

        // Second pass: attach children to their parents in idx order
        for (pid, cids) in children.iter() {
            if let Some(&pptr) = node_map.get(pid) {
                unsafe {
                    let parent_ref: &CNode<'_, RefCell<Ast>> = &*pptr;
                    for cid in cids {
                        if let Some(&cptr) = node_map.get(cid) {
                            let child_ref: &CNode<'_, RefCell<Ast>> = &*cptr;
                            parent_ref.append(child_ref);
                        }
                    }
                }
            }
        }

        // Ensure we have a Document root for formatting
        let root_node = unsafe { &*node_map[&root_part.id] };
        let format_root: &AstNode = if matches!(root_part.part_type.as_str(), "Document") {
            root_node
        } else {
            let doc: &AstNode = arena.alloc(AstNode::new(RefCell::new(Ast::new(
                NodeValue::Document,
                (0, 0).into(),
            ))));
            doc.append(root_node);
            doc
        };

        let mut markdown_output = String::new();
        format_commonmark(format_root, &Options::default(), &mut markdown_output)
            .expect("Failed to format markdown");
        markdown_output
    }

    pub async fn delete_all_by_project_note_id(&self, project_note_id: i32) -> Result<(), DbErr> {
        // Delete tags referencing parts of this note, then parts
        let ids: Vec<i32> = project_note_parts::Entity::find()
            .filter(project_note_parts::Column::ProjectNoteId.eq(project_note_id))
            .all(&self.app_state.db.clone())
            .await?
            .into_iter()
            .map(|m| m.id)
            .collect();

        let txn = self.app_state.db.clone().begin().await?;

        if !ids.is_empty() {
            let pnt_crud = ProjectNoteTagCrud::new(self.app_state.clone());
            pnt_crud.delete_many(&txn, ids.clone()).await?;
        }

        project_note_parts::Entity::delete_many()
            .filter(project_note_parts::Column::ProjectNoteId.eq(project_note_id))
            .exec(&txn)
            .await?;

        txn.commit().await?;

        Ok(())
    }

    pub async fn store_markdown_ast(
        &self,
        txn: &DatabaseTransaction,
        project_note_id: i32,
        project_id: i32,
        markdown: &str,
    ) -> Result<(), DbErr> {
        // Delete existing tags and parts for this note
        self.delete_all_by_project_note_id(project_note_id).await?;

        // Build a Send-safe, in-memory representation of the AST without any awaits

        let tag_re = Regex::new(r"(^|[^A-Za-z0-9_])#([A-Za-z0-9_-]+)").unwrap();

        let (parts, tag_pairs): (Vec<PrePart>, Vec<(i32, String)>) = {
            use comrak::arena_tree::Node as CNode;
            let arena = Arena::new();
            let root = parse_document(&arena, markdown, &Options::default());

            let mut parts: Vec<PrePart> = Vec::new();
            let mut tag_pairs: Vec<(i32, String)> = Vec::new();

            // Insert root first with local id 0
            let root_value = { root.data.borrow().value.clone() };
            let (root_part_type, root_content, root_data) = Self::node_to_fields(&root_value);
            parts.push(PrePart {
                parent_local: None,
                idx: 0,
                part_type: root_part_type,
                content: root_content,
                data: root_data,
            });
            let root_local_id: i32 = 0;

            // Stack of (node ptr, parent_local_id, idx, ctx)
            let mut stack: Vec<(*const CNode<'_, RefCell<Ast>>, i32, i32, Ctx)> = Vec::new();

            let mut child_idx = 0;
            for child in root.children() {
                stack.push((
                    child as *const _,
                    root_local_id,
                    child_idx,
                    Ctx {
                        in_code: false,
                        in_link: false,
                        in_html: false,
                    },
                ));
                child_idx += 1;
            }

            while let Some((node_ptr, parent_local, idx, ctx)) = stack.pop() {
                // SAFETY: node_ptr originates from Arena and lives long enough within this block
                let node = unsafe { &*node_ptr };
                let (node_value, children_ptrs): (NodeValue, Vec<*const CNode<'_, RefCell<Ast>>>) = {
                    let b = node.data.borrow();
                    let nv = b.value.clone();
                    let kids: Vec<_> = node.children().map(|c| c as *const _).collect();
                    (nv, kids)
                };

                let mut new_ctx = ctx;
                match node_value {
                    NodeValue::Code(_) | NodeValue::CodeBlock(_) => new_ctx.in_code = true,
                    NodeValue::Link(_) | NodeValue::Image(_) => new_ctx.in_link = true,
                    NodeValue::HtmlInline(_) | NodeValue::HtmlBlock(_) => new_ctx.in_html = true,
                    _ => {}
                }

                let (part_type, content, data) = Self::node_to_fields(&node_value);
                let this_local_id = parts.len() as i32;
                parts.push(PrePart {
                    parent_local: Some(parent_local),
                    idx,
                    part_type,
                    content: content.clone(),
                    data,
                });

                // Tag extraction for Text nodes when not inside code/link/html
                if matches!(node_value, NodeValue::Text(_))
                    && !new_ctx.in_code
                    && !new_ctx.in_link
                    && !new_ctx.in_html
                {
                    if let Some(text) = content.as_deref() {
                        for caps in tag_re.captures_iter(text) {
                            if let Some(m) = caps.get(2) {
                                tag_pairs.push((this_local_id, m.as_str().to_string()));
                            }
                        }
                    }
                }

                // Push children in reverse order so they are processed in original order
                let mut c_index = (children_ptrs.len() as i32) - 1;
                for child_ptr in children_ptrs.into_iter().rev() {
                    stack.push((child_ptr, this_local_id, c_index, new_ctx));
                    c_index -= 1;
                }
            }

            (parts, tag_pairs)
        };

        // Now we can perform DB operations using only Send data
        let mut id_map: Vec<i32> = vec![0; parts.len()];

        for (i, p) in parts.iter().enumerate() {
            let parent_db_id = p.parent_local.map(|pl| id_map[pl as usize]);
            let active = project_note_parts::ActiveModel {
                project_note_id: Set(project_note_id),
                parent_id: Set(parent_db_id),
                idx: Set(p.idx),
                part_type: Set(p.part_type.clone()),
                content: Set(p.content.clone()),
                data: Set(p.data.clone()),
                ..Default::default()
            };
            let model = active.insert(txn).await?;
            id_map[i] = model.id;
        }

        // Create tags
        if !tag_pairs.is_empty() {
            let pnt_crud = ProjectNoteTagCrud::new(self.app_state.clone());
            for (local_id, tag) in tag_pairs.into_iter() {
                let part_db_id = id_map[local_id as usize];
                pnt_crud.create(txn, part_db_id, project_id, &tag).await?;
            }
        }

        Ok(())
    }

    fn node_to_fields(value: &NodeValue) -> (String, Option<String>, Option<String>) {
        match value {
            NodeValue::Document => ("Document".into(), None, None),
            NodeValue::Paragraph => ("Paragraph".into(), None, None),
            NodeValue::Text(t) => ("Text".into(), Some(t.to_string()), None),
            NodeValue::SoftBreak => ("SoftBreak".into(), None, None),
            NodeValue::LineBreak => ("LineBreak".into(), None, None),
            NodeValue::Code(c) => ("Code".into(), Some(c.literal.clone()), None),
            NodeValue::HtmlInline(h) => ("HtmlInline".into(), Some(h.clone()), None),
            NodeValue::HtmlBlock(h) => ("HtmlBlock".into(), Some(h.literal.clone()), None),
            NodeValue::Heading(h) => (
                "Heading".into(),
                None,
                Some(
                    serde_json::json!({
                        "level": h.level,
                        "setext": h.setext
                    })
                    .to_string(),
                ),
            ),
            NodeValue::ThematicBreak => ("ThematicBreak".into(), None, None),
            NodeValue::BlockQuote => ("BlockQuote".into(), None, None),
            NodeValue::CodeBlock(cb) => (
                "CodeBlock".into(),
                Some(cb.literal.clone()),
                Some(
                    serde_json::json!({
                        "info": cb.info.clone(),
                    })
                    .to_string(),
                ),
            ),
            NodeValue::List(l) => (
                "List".into(),
                None,
                Some(
                    serde_json::json!({
                        "list_type": format!("{:?}", l.list_type),
                        "marker_offset": l.marker_offset,
                        "padding": l.padding,
                        "start": l.start,
                        "delimiter": format!("{:?}", l.delimiter),
                        "bullet_char": l.bullet_char,
                        "tight": l.tight,
                        "is_task_list": l.is_task_list
                    })
                    .to_string(),
                ),
            ),
            NodeValue::Item(l) => (
                "Item".into(),
                None,
                Some(
                    serde_json::json!({
                        "list_type": format!("{:?}", l.list_type),
                        "marker_offset": l.marker_offset,
                        "padding": l.padding,
                        "start": l.start,
                        "delimiter": format!("{:?}", l.delimiter),
                        "bullet_char": l.bullet_char,
                        "tight": l.tight,
                        "is_task_list": l.is_task_list
                    })
                    .to_string(),
                ),
            ),
            NodeValue::Link(link) => (
                "Link".into(),
                None,
                Some(
                    serde_json::json!({
                        "url": link.url.clone(),
                        "title": link.title.clone(),
                    })
                    .to_string(),
                ),
            ),
            NodeValue::Image(link) => (
                "Image".into(),
                None,
                Some(
                    serde_json::json!({
                        "url": link.url.clone(),
                        "title": link.title.clone(),
                    })
                    .to_string(),
                ),
            ),
            NodeValue::Emph => ("Emph".into(), None, None),
            NodeValue::Strong => ("Strong".into(), None, None),
            NodeValue::Strikethrough => ("Strikethrough".into(), None, None),
            _ => (format!("{:?}", value), None, None),
        }
    }

    pub async fn update_content(
        &self,
        project_note_part_id: i32,
        content: String,
    ) -> Result<project_note_parts::Model, DbErr> {
        // Find the part to get project_note_id and project_id
        let part = project_note_parts::Entity::find_by_id(project_note_part_id)
            .one(&self.app_state.db)
            .await?
            .ok_or(DbErr::Custom("Project note part not found".to_owned()))?;

        let mut active_part: project_note_parts::ActiveModel = part.into();
        active_part.content = Set(Some(content));
        active_part.updated_at = Set(chrono::Utc::now().into());

        let updated_part = active_part.update(&self.app_state.db).await?;

        // Broadcast events
        let project_id = self.app_state.project.as_ref().unwrap().id;
        let broadcaster = EventBroadcaster::new(self.app_state.tx.clone());

        broadcaster.broadcast_event(
            project_id,
            PROJECT_NOTE_PART_UPDATED,
            serde_json::json!({
                "project_id": project_id,
                "project_note_id": updated_part.project_note_id,
                "project_note_part_id": updated_part.id
            }),
        );

        broadcaster.broadcast_event(
            project_id,
            PROJECT_NOTE_UPDATED,
            serde_json::json!({
                "project_id": project_id,
                "project_note_id": updated_part.project_note_id
            }),
        );

        Ok(updated_part)
    }

    fn fields_to_node_value(p: &project_note_parts::Model) -> NodeValue {
        match p.part_type.as_str() {
            "Document" => NodeValue::Document,
            "Paragraph" => NodeValue::Paragraph,
            "Text" => NodeValue::Text(p.content.clone().unwrap_or_default().into()),
            "SoftBreak" => NodeValue::SoftBreak,
            "LineBreak" => NodeValue::LineBreak,
            "Code" => NodeValue::Code(NodeCode {
                num_backticks: 1,
                literal: p.content.clone().unwrap_or_default(),
            }),
            "HtmlInline" => NodeValue::HtmlInline(p.content.clone().unwrap_or_default()),
            "HtmlBlock" => NodeValue::HtmlBlock(NodeHtmlBlock {
                block_type: 0,
                literal: p.content.clone().unwrap_or_default(),
            }),
            "Heading" => {
                let (level, setext) = p
                    .data
                    .as_ref()
                    .and_then(|d| serde_json::from_str::<serde_json::Value>(d).ok())
                    .map(|v| {
                        let level = v.get("level").and_then(|lv| lv.as_u64()).unwrap_or(1) as u8;
                        let setext = v.get("setext").and_then(|s| s.as_bool()).unwrap_or(false);
                        (level, setext)
                    })
                    .unwrap_or((1, false));
                NodeValue::Heading(NodeHeading {
                    level,
                    setext,
                    closed: false,
                })
            }
            "ThematicBreak" => NodeValue::ThematicBreak,
            "BlockQuote" => NodeValue::BlockQuote,
            "CodeBlock" => {
                let info = p
                    .data
                    .as_ref()
                    .and_then(|d| serde_json::from_str::<serde_json::Value>(d).ok())
                    .and_then(|v| {
                        v.get("info")
                            .and_then(|iv| iv.as_str())
                            .map(|s| s.to_string())
                    })
                    .unwrap_or_default();
                NodeValue::CodeBlock(Box::new(NodeCodeBlock {
                    info,
                    literal: p.content.clone().unwrap_or_default(),
                    ..Default::default()
                }))
            }
            "List" | "Item" => {
                let (
                    list_type,
                    marker_offset,
                    padding,
                    start,
                    delimiter,
                    bullet_char,
                    tight,
                    is_task_list,
                ) = p
                    .data
                    .as_ref()
                    .and_then(|d| serde_json::from_str::<serde_json::Value>(d).ok())
                    .map(|v| {
                        let list_type = match v
                            .get("list_type")
                            .and_then(|lt| lt.as_str())
                            .unwrap_or("Bullet")
                        {
                            "Ordered" => ListType::Ordered,
                            _ => ListType::Bullet,
                        };
                        let marker_offset =
                            v.get("marker_offset").and_then(|x| x.as_i64()).unwrap_or(0) as i32;
                        let padding = v.get("padding").and_then(|x| x.as_i64()).unwrap_or(0) as i32;
                        let start = v.get("start").and_then(|x| x.as_i64()).unwrap_or(1) as i32;
                        let delimiter = match v
                            .get("delimiter")
                            .and_then(|d| d.as_str())
                            .unwrap_or("Period")
                        {
                            "Paren" => ListDelimType::Paren,
                            _ => ListDelimType::Period,
                        };
                        let bullet_char = v
                            .get("bullet_char")
                            .and_then(|x| x.as_i64())
                            .unwrap_or(b'-' as i64) as u8;
                        let tight = v.get("tight").and_then(|x| x.as_bool()).unwrap_or(false);
                        let is_task_list = v
                            .get("is_task_list")
                            .and_then(|x| x.as_bool())
                            .unwrap_or(false);
                        (
                            list_type,
                            marker_offset,
                            padding,
                            start,
                            delimiter,
                            bullet_char,
                            tight,
                            is_task_list,
                        )
                    })
                    .unwrap_or((
                        ListType::Bullet,
                        0,
                        0,
                        1,
                        ListDelimType::Period,
                        b'-',
                        false,
                        false,
                    ));
                let nl = NodeList {
                    list_type,
                    marker_offset: marker_offset as usize,
                    padding: padding as usize,
                    start: start as usize,
                    delimiter,
                    bullet_char,
                    tight,
                    is_task_list,
                };
                if p.part_type == "List" {
                    NodeValue::List(nl)
                } else {
                    NodeValue::Item(nl)
                }
            }
            "Link" | "Image" => {
                let (url, title) = p
                    .data
                    .as_ref()
                    .and_then(|d| serde_json::from_str::<serde_json::Value>(d).ok())
                    .map(|v| {
                        let url = v
                            .get("url")
                            .and_then(|u| u.as_str())
                            .unwrap_or("")
                            .to_string();
                        let title = v
                            .get("title")
                            .and_then(|t| t.as_str())
                            .unwrap_or("")
                            .to_string();
                        (url, title)
                    })
                    .unwrap_or_default();
                let link = NodeLink { url, title };
                if p.part_type == "Link" {
                    NodeValue::Link(Box::new(link))
                } else {
                    NodeValue::Image(Box::new(link))
                }
            }
            "Emph" => NodeValue::Emph,
            "Strong" => NodeValue::Strong,
            "Strikethrough" => NodeValue::Strikethrough,
            other => {
                // Fallback to Paragraph for unknown/debug-stored types to avoid panics
                eprintln!("Unknown AST part_type encountered: {}", other);
                NodeValue::Paragraph
            }
        }
    }
}
