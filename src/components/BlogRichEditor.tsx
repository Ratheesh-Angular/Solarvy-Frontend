import { useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { adminUploadBlogImage } from "../lib/adminApi";

type BlogRichEditorProps = {
  initialHtml: string;
  onChange: (html: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

function ToolbarButton({ label, icon, onClick, active, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`blog-editor-btn${active ? " is-active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
    </button>
  );
}

function Toolbar({
  editor,
  onImage,
  uploading,
}: {
  editor: Editor;
  onImage: () => void;
  uploading: boolean;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      alignLeft: e.isActive({ textAlign: "left" }),
      alignCenter: e.isActive({ textAlign: "center" }),
      alignRight: e.isActive({ textAlign: "right" }),
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  const c = () => editor.chain().focus();

  return (
    <div className="blog-editor-toolbar" role="toolbar" aria-label="Formatting">
      <div className="blog-editor-group">
        <ToolbarButton label="Heading 2" icon="bi-type-h2" active={state.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} />
        <ToolbarButton label="Heading 3" icon="bi-type-h3" active={state.h3} onClick={() => c().toggleHeading({ level: 3 }).run()} />
      </div>
      <div className="blog-editor-group">
        <ToolbarButton label="Bold" icon="bi-type-bold" active={state.bold} onClick={() => c().toggleBold().run()} />
        <ToolbarButton label="Italic" icon="bi-type-italic" active={state.italic} onClick={() => c().toggleItalic().run()} />
        <ToolbarButton label="Underline" icon="bi-type-underline" active={state.underline} onClick={() => c().toggleUnderline().run()} />
        <ToolbarButton label="Strikethrough" icon="bi-type-strikethrough" active={state.strike} onClick={() => c().toggleStrike().run()} />
      </div>
      <div className="blog-editor-group">
        <ToolbarButton label="Bullet list" icon="bi-list-ul" active={state.bulletList} onClick={() => c().toggleBulletList().run()} />
        <ToolbarButton label="Numbered list" icon="bi-list-ol" active={state.orderedList} onClick={() => c().toggleOrderedList().run()} />
        <ToolbarButton label="Quote" icon="bi-quote" active={state.blockquote} onClick={() => c().toggleBlockquote().run()} />
        <ToolbarButton label="Code block" icon="bi-code-square" active={state.codeBlock} onClick={() => c().toggleCodeBlock().run()} />
        <ToolbarButton label="Divider" icon="bi-hr" onClick={() => c().setHorizontalRule().run()} />
      </div>
      <div className="blog-editor-group">
        <ToolbarButton label="Align left" icon="bi-text-left" active={state.alignLeft} onClick={() => c().setTextAlign("left").run()} />
        <ToolbarButton label="Align center" icon="bi-text-center" active={state.alignCenter} onClick={() => c().setTextAlign("center").run()} />
        <ToolbarButton label="Align right" icon="bi-text-right" active={state.alignRight} onClick={() => c().setTextAlign("right").run()} />
      </div>
      <div className="blog-editor-group">
        <ToolbarButton label="Link" icon="bi-link-45deg" active={state.link} onClick={setLink} />
        <ToolbarButton
          label={uploading ? "Uploading image…" : "Insert image"}
          icon={uploading ? "bi-hourglass-split" : "bi-image"}
          onClick={onImage}
          disabled={uploading}
        />
      </div>
      <div className="blog-editor-group">
        <ToolbarButton
          label="Insert table"
          icon="bi-table"
          active={state.inTable}
          onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        />
        {state.inTable ? (
          <>
            <ToolbarButton label="Add row below" icon="bi-arrow-bar-down" onClick={() => c().addRowAfter().run()} />
            <ToolbarButton label="Add column right" icon="bi-arrow-bar-right" onClick={() => c().addColumnAfter().run()} />
            <ToolbarButton label="Delete row" icon="bi-dash-square" onClick={() => c().deleteRow().run()} />
            <ToolbarButton label="Delete column" icon="bi-dash-square-dotted" onClick={() => c().deleteColumn().run()} />
            <ToolbarButton label="Delete table" icon="bi-trash3" onClick={() => c().deleteTable().run()} />
          </>
        ) : null}
      </div>
      <div className="blog-editor-group">
        <ToolbarButton label="Undo" icon="bi-arrow-counterclockwise" disabled={!state.canUndo} onClick={() => c().undo().run()} />
        <ToolbarButton label="Redo" icon="bi-arrow-clockwise" disabled={!state.canRedo} onClick={() => c().redo().run()} />
      </div>
    </div>
  );
}

export default function BlogRichEditor({
  initialHtml,
  onChange,
  onError,
  disabled = false,
}: BlogRichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing your article…" }),
    ],
    content: initialHtml,
    editable: !disabled,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  const handleFile = async (file: File | undefined) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const { url } = await adminUploadBlogImage(file);
      const alt = window.prompt("Image description (alt text) for accessibility and SEO", "") ?? "";
      editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!editor) return null;

  return (
    <div className={`blog-editor${disabled ? " is-disabled" : ""}`}>
      <Toolbar editor={editor} onImage={() => fileInputRef.current?.click()} uploading={uploading} />
      <EditorContent editor={editor} className="blog-editor-content blog-content" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
