export type ToolType = "select" | "text" | "erase" | "image";

export interface TextElement {
  id: string;
  type: "text";
  pageIndex: number;
  /** x in pdfjs native pixels at scale=1 */
  x: number;
  /** y in pdfjs native pixels at scale=1 (top-left origin) */
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface EraseElement {
  id: string;
  type: "erase";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageElement {
  id: string;
  type: "image";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

export type OverlayElement = TextElement | EraseElement | ImageElement;

export interface PageNativeDimensions {
  width: number;
  height: number;
}
