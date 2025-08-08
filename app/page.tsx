"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { snapdom } from "@zumer/snapdom";

export default function Home() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [url, setUrl] = useState("https://example.com");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLIFrameElement>(null);
  const [imageFormat, setImageFormat] = useState<
    "png" | "jpg" | "jpeg" | "webp"
  >("png");
  const [imageQuality, setImageQuality] = useState<"low" | "medium" | "high">(
    "medium"
  );

  const processHtml = (html: string, baseUrl: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const base = new URL(baseUrl);

      // Add base tag
      const baseTag = doc.createElement("base");
      baseTag.href = base.origin;
      doc.head.insertBefore(baseTag, doc.head.firstChild);

      // Process all elements with relative URLs (non-img elements)
      const processRelativeUrl = (element: Element, attribute: string) => {
        const value = element.getAttribute(attribute);
        if (value?.startsWith("/")) {
          element.setAttribute(attribute, `${base.origin}${value}`);
        }
      };

      doc.querySelectorAll("script").forEach((script) => {
        script.remove();
      });

      doc.querySelectorAll("meta").forEach((meta) => {
        meta.remove();
      });

      doc.querySelectorAll("link").forEach((link) => {
        processRelativeUrl(link, "href");
      });

      // Move all children from head to body (just before returning)
      const headChildren = Array.from(doc.head.children);
      headChildren.forEach((child) => {
        doc.body.insertBefore(child, doc.body.firstChild);
      });

      // Remove the head element
      doc.head.remove();

      const cleanHTML = doc.documentElement.outerHTML;

      console.log(cleanHTML);

      return cleanHTML;
    } catch (err) {
      console.error("Error processing HTML:", err);
      return html;
    }
  };

  const fetchAndRenderWebsite = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch(`https://proxy.corsfix.com/?${targetUrl}`);
      const html = await response.text();
      const processedHtml = processHtml(html, targetUrl);

      if (contentRef.current) {
        contentRef.current.srcdoc = processedHtml;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setLoading(false);
    }
  }, []);

  // Auto-fetch example.com on component mount
  useEffect(() => {
    fetchAndRenderWebsite("https://example.com");
  }, [fetchAndRenderWebsite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    await fetchAndRenderWebsite(url);
  };

  const handleIframeLoad = async () => {
    if (!contentRef.current || !contentRef.current.srcdoc) return;

    try {
      const iframe = contentRef.current;

      // Dynamic height adjustment based on content
      const resizeIframe = () => {
        if (iframe.contentWindow?.document.body) {
          const contentHeight = iframe.contentWindow.document.body.scrollHeight;
          // Only resize if content is taller than current iframe
          if (contentHeight > iframe.offsetHeight) {
            iframe.height = contentHeight + "px";
          }
        }
      };

      // Resize after a short delay to ensure content is fully loaded
      setTimeout(resizeIframe, 100);

      // Just mark as successfully loaded, but don't capture yet
      setSuccess(true);
    } catch (error) {
      console.error("Iframe load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!contentRef.current) return;

    setDownloadLoading(true);

    try {
      const iframe = contentRef.current;
      const element = iframe.contentDocument?.documentElement;

      if (!element) {
        throw new Error("Could not access iframe content");
      }

      // Convert quality setting to numeric value
      const qualityValue =
        imageQuality === "low" ? 0.3 : imageQuality === "medium" ? 0.7 : 0.9;

      // Use SnapDOM to capture the element
      const result = await snapdom(element, {
        useProxy: "https://proxy.corsfix.com/?",
        backgroundColor: "#fff",
        embedFonts: true,
        compress: true,
        fast: true,
        quality: qualityValue,
      });

      // Use SnapDOM's built-in download functionality
      await result.download({
        format: imageFormat,
        filename: `screenshot-${Date.now()}`,
      });
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <>
      <iframe
        ref={contentRef}
        onLoad={handleIframeLoad}
        className="w-full border-0 p-0 m-0"
        sandbox="allow-same-origin"
      />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg hover:bg-white transition-colors"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-full md:w-96 bg-white/95 backdrop-blur-sm border-r shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <header className="text-center mb-8 pt-8">
              <h1 className="text-4xl font-bold mb-4">s8t</h1>
              <p className="text-xl text-muted-foreground">
                Capture and customize website screenshots with ease
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">Your website URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Image format</Label>
                  <Select
                    defaultValue="png"
                    onValueChange={(value: "png" | "jpg" | "jpeg" | "webp") =>
                      setImageFormat(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image quality</Label>
                  <Select
                    defaultValue="medium"
                    onValueChange={(value: "low" | "medium" | "high") =>
                      setImageQuality(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Rendering..." : "Render"}
              </Button>

              {success && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border rounded-lg p-4">
                    <div className="bg-green-100 rounded-full p-1">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium">Success!</span>
                  </div>

                  <Button
                    onClick={handleDownload}
                    className="w-full"
                    variant="outline"
                    disabled={downloadLoading}
                  >
                    {downloadLoading
                      ? "Capturing & Downloading..."
                      : "Download Screenshot"}
                  </Button>
                </div>
              )}
            </form>

            <footer className="mt-12 py-6 border-t text-center text-sm text-muted-foreground">
              s8t is powered by{" "}
              <a
                href="https://corsfix.com"
                className="font-medium hover:underline"
              >
                Corsfix
              </a>{" "}
              •{" "}
              <a
                href="https://github.com/yourusername/s8t"
                className="font-medium hover:underline"
              >
                Source code
              </a>
            </footer>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 h-full w-full bg-black/20 z-30 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  );
}
