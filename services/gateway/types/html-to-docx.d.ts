declare module "html-to-docx" {
  function HTMLtoDOCX(
    html: string,
    headerHtml: string | null,
    options?: Record<string, unknown>
  ): Promise<Buffer>;
  export default HTMLtoDOCX;
}
