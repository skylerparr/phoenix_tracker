use crate::crud::project_note_tag::ProjectNoteTagCrud;
use crate::entities::project_note_parts;
use crate::AppState;
use comrak::nodes::{Ast, NodeValue};
use comrak::{parse_document, Arena, Options};
use regex::Regex;
use sea_orm::*;
use std::cell::RefCell;

pub struct ProjectNotePartsCrud {
    app_state: AppState,
}

#[derive(Clone, Debug)]
pub struct ProjectNotePartData {
    pub parent_id: Option<i32>,
    pub idx: i32,
    pub part_type: String,
    pub content: Option<String>,
    pub data: Option<String>,
}

impl ProjectNotePartsCrud {
    pub fn new(app_state: AppState) -> Self {
        Self { app_state }
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
}
